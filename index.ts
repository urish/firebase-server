/*
 * firebase-server 1.0.1
 * License: MIT.
 * Copyright (C) 2013, 2014, 2015, 2016, 2017, 2018, Uri Shaked and contributors.
 */

import * as debug from 'debug';
import * as firebase from 'firebase';
import * as _ from 'lodash';
import { AddressInfo } from 'net';
import * as WebSocket from 'ws';
import { Server as WebSocketServer } from 'ws';
import { getFirebaseHash } from './lib/firebase-hash';
import { HttpServer } from './lib/http-server';
import { normalize, TokenValidator } from './lib/token-validator';
import { paginateRef } from './lib/paginate-ref';

// tslint:disable:no-var-requires
const targaryen = require('targaryen');
const log = debug('firebase-server');

interface INormalizedPath {
	fullPath: string;
	isPriorityPath: boolean;
	path: string;
}

// In order to produce new Firebase clients that do not conflict with existing
// instances of the Firebase client, each one must have a unique name.
// We use this incrementing number to ensure that each Firebase App name we
// create is unique.
let serverID = 0;

function getSnap(ref: firebase.database.Reference) {
	return new Promise((resolve) => {
		ref.once('value', (snap) => {
			resolve(snap);
		});
	});
}

function exportData(ref: firebase.database.Reference) {
	return getSnap(ref).then((snap: firebase.database.DataSnapshot) => snap.exportVal());
}

function normalizePath(fullPath: string) {
	let path = fullPath;
	const isPriorityPath = /\/?\.priority$/.test(path);
	if (isPriorityPath) {
		path = path.replace(/\/?\.priority$/, '');
	}
	if (path.charAt(0) === '/') {
		// Normally, a path would start with a slash ("/"), but some clients
		// (notably Android) don't always send it.
		path = path.substr(1);
	}
	return {
		fullPath,
		isPriorityPath,
		path,
	};
}

class FirebaseServer {
	private app;
	private baseRef;
	private authSecret;
	private targaryen;
	private https;
	private wss: WebSocketServer;
	private clock: number | null = null;
	private tokenValidator;
	private maxFrameLength;

	constructor(portOrOptions, private name = 'mock.firebase.server', data = null) {
		// Firebase is more than just a "database" now; the "realtime database" is
		// just one of many services provided by a Firebase "App" container.
		// The Firebase library must be initialized with an App, and that app
		// must have a name - either a name you choose, or '[DEFAULT]' which
		// the library will substitute for you if you do not provide one.
		// An important aspect of App names is that multiple instances of the
		// Firebase client with the same name will share a local cache instead of
		// talking "through" our server. So to prevent that from happening, we are
		// choosing a probably-unique name that a developer would not choose for
		// their "real" Firebase client instances.
		const appName = `firebase-server-internal-${this.name}-${serverID++}`;

		// We must pass a "valid looking" configuration to initializeApp for its
		// internal checks to pass.
		const config = {
			databaseURL: 'ws://fakeserver.firebaseio.test',
		};
		this.app = firebase.initializeApp(config, appName);
		this.app.database().goOffline();

		this.baseRef = this.app.database().ref();

		this.baseRef.set(data);

		this.targaryen = targaryen.database({
			rules: {
				'.read': true,
				'.write': true,
			},
		}, data);

		let options;
		let port;
		if (typeof portOrOptions === 'object') {
			options = portOrOptions;
			if (options.server) {
				const address = options.server.address();
				if (address) {
					port = address.port;
				} else if (options.port) {
					port = options.port;
				} else {
					throw new Error('Port not given in options and also not obtainable from server');
				}
			} else {
				port = options.port;
			}
		} else {
			port = portOrOptions;
			options = { port };
		}

		if (options.server && options.rest) {
			throw new Error('Incompatible options: server, rest');
		} else if (options.rest) {
			this.https = HttpServer(port, options.address, this.app.database());
			options = { server: this.https };
		}

		if (options.address) {
			options = Object.assign({}, options, { host: options.address });
		}

		if (options.maxFrameLength) {
			this.maxFrameLength = options.maxFrameLength;
		} else {
			// The default maximum incoming frame length in the Java client
			// is 16384; the maximum possible is 65536.
			this.maxFrameLength = 16384;
		}

		this.wss = new WebSocketServer(options);

		this.tokenValidator = TokenValidator(null);

		this.wss.on('connection', this.handleConnection.bind(this));
		log(`Listening for connections on port ${port}`);
	}

	protected handleConnection(ws: WebSocket & {_socket: any, frameBuffer?: string}) {
		log(`New connection from ${ws._socket.remoteAddress}:${ws._socket.remotePort}`);
		const server = this;
		let authToken: string|null = null;

		function send(message: object) {
			const payload = JSON.stringify(message);
			log(`Sending message: ${payload}`);
			try {
				const numFragments = Math.ceil(payload.length / server.maxFrameLength);
				ws.send(String(numFragments));
				for (let startIdx = 0; startIdx < payload.length; startIdx += server.maxFrameLength) {
					ws.send(payload.substr(startIdx, server.maxFrameLength));
				}
			} catch (e) {
				log(`Send failed: ${e}`);
			}
		}

		function authData() {
			let data;
			if (authToken) {
				try {
					const decodedToken = server.tokenValidator.decode(authToken);
					if ('d' in decodedToken) {
						data = decodedToken.d;
					} else {
						data = {
							// 'user_id' is firebase-specific and may be
							// convenience only; 'sub' is standard JWT.
							provider: decodedToken.provider_id,
							token: decodedToken,
							uid: decodedToken.user_id || decodedToken.sub,
						};
					}
				} catch (e) {
					authToken = null;
				}
			}
			return data;
		}

		function pushData(path: string, data: object|null|string) {
			send({ d: { a: 'd', b: { p: path, d: data } }, t: 'd' });
		}

		function permissionDenied(requestId: number) {
			send({ d: { r: requestId, b: { s: 'permission_denied', d: 'Permission denied' } }, t: 'd' });
		}

		function replaceServerTimestamp(value: number, data: object|number|string) {
			if (_.isEqual(data, firebase.database.ServerValue.TIMESTAMP)) {
				return value;
			} else if (_.isObject(data) && typeof data === 'object') {
				return _.mapValues(data, replaceServerTimestamp.bind(this, value));
			} else {
				return data;
			}
		}

		function tryRead(requestId: number, path: string) {
			const result = server.targaryen.as(authData()).read(path);
			if (!result.allowed) {
				permissionDenied(requestId);
				throw new Error(`Permission denied for client to read from ${path}: ${result.info}`);
			}
		}

		function tryPatch(requestId: number, path: string, newData: object|string|number, now: number) {
			const result = server.targaryen.as(authData()).update(path, newData, now);
			if (!result.allowed) {
				permissionDenied(requestId);
				throw new Error(`Permission denied for client to update at ${path}: ${result.info}`);
			}
			server.targaryen = result.newDatabase;
		}

		function tryWrite(requestId: number, path: string, newData: object|string|number, now: number) {
			const result = server.targaryen.as(authData()).write(path, newData, now);
			if (!result.allowed) {
				permissionDenied(requestId);
				throw new Error(`Permission denied for client to write to ${path}: ${result.info}`);
			}
			server.targaryen = result.newDatabase;
		}

		function handleListen(requestId: number, normalizedPath: INormalizedPath, fbRef: firebase.database.Reference, q) {
			const path = normalizedPath.path;
			log(`Client listen ${path}`);

			try {
				tryRead(requestId, path);
			} catch (e) {
				log(e);
				return;
			}

			let sendOk = true;
			paginateRef(fbRef, q).on('value', (snap) => {
				if (snap) {
					// BUG: tryRead() here, and if it throws, cancel the listener.
					// See https://github.com/urish/firebase-server/pull/100#issuecomment-323509408
					pushData(path, snap.exportVal());
					if (sendOk) {
						sendOk = false;
						send({ d: { r: requestId, b: { s: 'ok', d: {} } }, t: 'd' });
					}
				}
			});
		}

		function handleUpdate(
			requestId: number,
			normalizedPath: INormalizedPath,
			fbRef: firebase.database.Reference,
			newData: object|string|number,
		) {
			const path = normalizedPath.path;
			log(`Client update ${path}`);

			const now = server.clock || new Date().getTime();
			newData = replaceServerTimestamp(now, newData);

			try {
				tryPatch(requestId, path, newData, now);
			} catch (e) {
				log(e);
				return;
			}

			fbRef.update(newData);
			send({ d: { r: requestId, b: { s: 'ok', d: {} } }, t: 'd' });
		}

		function handleSet(
			requestId: number,
			normalizedPath: INormalizedPath,
			fbRef: firebase.database.Reference,
			newData: object|string|number,
			hash?: string,
		) {
			log(`Client set ${normalizedPath.fullPath}`);

			let progress = Promise.resolve();
			const path = normalizedPath.path;

			const now = server.clock || new Date().getTime();
			newData = replaceServerTimestamp(now, newData);

			if (normalizedPath.isPriorityPath) {
				progress = exportData(fbRef).then((parentData) => {
					if (_.isObject(parentData)) {
						parentData['.priority'] = newData;
					} else {
						parentData = {
							'.priority': newData,
							'.value': parentData,
						};
					}
					newData = parentData;
				});
			}

			progress = progress.then(() => {
				tryWrite(requestId, path, newData, now);
			});

			if (typeof hash !== 'undefined') {
				progress = progress.then(() => getSnap(fbRef)).then((snap: firebase.database.DataSnapshot) => {
					const calculatedHash = getFirebaseHash(snap.exportVal());
					if (hash !== calculatedHash) {
						pushData(path, snap.exportVal());
						send({ d: { r: requestId, b: { s: 'datastale', d: 'Transaction hash does not match' } }, t: 'd' });
						throw new Error(`Transaction hash does not match: ${hash} !== ${calculatedHash}`);
					}
				});
			}

			progress.then(() => {
				fbRef.set(newData);
				fbRef.once('value', (snap) => {
					send({ d: { r: requestId, b: { s: 'ok', d: {} } }, t: 'd' });
				});
			}).catch(log);
		}

		function handleAuth(requestId: number, credential: string) {
			if (server.authSecret === credential) {
				return send({
					d: {
						b: {
							d: normalize({ auth: null, admin: true, exp: null }),
							s: 'ok',
						},
						r: requestId,
					},
					t: 'd',
				});
			}

			try {
				const decoded = server.tokenValidator.decode(credential);
				authToken = credential;
				return send({ t: 'd', d: { r: requestId, b: { s: 'ok', d: normalize(decoded) } } });
			} catch (e) {
				return send({ t: 'd', d: { r: requestId, b: { s: 'invalid_token', d: 'Could not parse auth token.' } } });
			}
		}

		function accumulateFrames(data: string) {
			// Accumulate buffer until websocket frame is complete
			if (typeof ws.frameBuffer === 'undefined') {
				ws.frameBuffer = '';
			}

			try {
				const parsed = JSON.parse(ws.frameBuffer + data);
				ws.frameBuffer = '';
				return parsed;
			} catch (e) {
				ws.frameBuffer += data;
			}

			return '';
		}

		ws.on('message', (data) => {
			log(`Client message: ${data.toString()}`);
			if (data.toString() === '0') {
				return;
			}

			const parsed = accumulateFrames(data.toString());

			if (parsed && parsed.t === 'd') {
				let path;
				if (typeof parsed.d.b.p !== 'undefined') {
					path = parsed.d.b.p;
				}
				path = normalizePath(path || '');
				const requestId = parsed.d.r;
				const fbRef = path.path ? this.baseRef.child(path.path) : this.baseRef;
				if (parsed.d.a === 'l' || parsed.d.a === 'q') {
					handleListen(requestId, path, fbRef, parsed.d.b.q);
				}
				if (parsed.d.a === 'm') {
					handleUpdate(requestId, path, fbRef, parsed.d.b.d);
				}
				if (parsed.d.a === 'p') {
					handleSet(requestId, path, fbRef, parsed.d.b.d, parsed.d.b.h);
				}
				if (parsed.d.a === 'auth' || parsed.d.a === 'gauth') {
					handleAuth(requestId, parsed.d.b.cred);
				}
			}
		});

		send({ d: { t: 'h', d: { ts: new Date().getTime(), v: '5', h: this.name, s: '' } }, t: 'c' });
	}

	public setRules(rules: object) {
		this.targaryen = this.targaryen.with({ rules });
	}

	public getData(ref?: firebase.database.Reference) {
		// tslint:disable-next-line:no-console
		console.warn('FirebaseServer.getData() is deprecated! Please use FirebaseServer.getValue() instead');
		let result = null;
		this.baseRef.once('value', (snap) => {
			result = snap.val();
		});
		return result;
	}

	public getSnap(ref?: firebase.database.Reference) {
		return getSnap(ref || this.baseRef);
	}

	public getValue(ref?: firebase.database.Reference) {
		return this.getSnap(ref).then((snap: firebase.database.DataSnapshot) => snap.val());
	}

	public exportData(ref?: firebase.database.Reference) {
		return exportData(ref || this.baseRef);
	}

	public address(): string | AddressInfo {
		return this.wss.address();
	}

	public getPort(): number {
		const address = this.address();
		return typeof address === 'string' ? 0 : address.port;
	}

	public async close(callback: (err?: Error) => void = (() => 0)) {
		if (this.https) {
			await new Promise((resolve) => this.https.close(resolve));
		}
		return new Promise<void>((resolve, reject) => {
			this.wss.close((err) => {
				callback(err);
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}

	public setTime(newTime: number | null) {
		this.clock = newTime;
	}

	public setAuthSecret(newSecret: string) {
		this.authSecret = newSecret;
		this.tokenValidator.setSecret(newSecret);
	}
}

export = FirebaseServer;
