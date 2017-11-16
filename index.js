/*
 * firebase-server 0.12.0
 * License: MIT.
 * Copyright (C) 2013, 2014, 2015, 2016, 2017, Uri Shaked and contributors.
 */

'use strict';

const _ = require('lodash');
const WebSocketServer = require('ws').Server;
const firebaseHash = require('./lib/firebase-hash');
const TestableClock = require('./lib/testable-clock');
const TokenValidator = require('./lib/token-validator');
const firebase = require('firebase');
const targaryen = require('targaryen');
const _log = require('debug')('firebase-server');
const HttpServer = require('./lib/http-server');

// In order to produce new Firebase clients that do not conflict with existing
// instances of the Firebase client, each one must have a unique name.
// We use this incrementing number to ensure that each Firebase App name we
// create is unique.
let serverID = 0;

function getSnap(ref) {
	return new Promise(resolve => {
		ref.once('value', snap => {
			resolve(snap);
		});
	});
}

function exportData(ref) {
	return getSnap(ref).then(snap => snap.exportVal());
}

function normalizePath(fullPath) {
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
		isPriorityPath,
		path,
		fullPath
	};
}

function FirebaseServer(portOrOptions, name, data) {
	this.name = name || 'mock.firebase.server';

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
		databaseURL: 'ws://fakeserver.firebaseio.test'
	};
	this.app = firebase.initializeApp(config, appName);
	this.app.database().goOffline();

	this.baseRef = this.app.database().ref();

	this.baseRef.set(data || null);

	this._targaryen = targaryen.database({
		rules: {
			'.read': true,
			'.write': true
		}
	}, data);

	let options, port;
	if (typeof portOrOptions === 'object') {
		options = portOrOptions;
		if (options.server) {
			var address = options.server.address();
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
		options = {port};
	}

	if (options.server && options.rest) {
		throw new Error('Incompatible options: server, rest');
	} else if (options.rest) {
		this._https = new HttpServer(port, options.address, this.app.database());
		options = {server: this._https};
	}

	if (options.address) {
		options = Object.assign({}, options, {host: options.address});
	}

	this._wss = new WebSocketServer(options);

	this._clock = new TestableClock();
	this._tokenValidator = new TokenValidator(null, this._clock);

	this._wss.on('connection', this.handleConnection.bind(this));
	_log(`Listening for connections on port ${port}`);
}

FirebaseServer.prototype = {
	handleConnection(ws) {
		_log(`New connection from ${ws._socket.remoteAddress}:${ws._socket.remotePort}`);
		const server = this;
		let authToken = null;

		function send(message) {
			const payload = JSON.stringify(message);
			_log(`Sending message: ${payload}`);
			try {
				ws.send(payload);
			} catch (e) {
				_log(`Send failed: ${e}`);
			}
		}

		function authData() {
			let data;
			if (authToken) {
				try {
					const decodedToken = server._tokenValidator.decode(authToken);
					if ('d' in decodedToken) {
						data = decodedToken.d;
					} else {
						data = {
							// 'user_id' is firebase-specific and may be
							// convenience only; 'sub' is standard JWT.
							uid: decodedToken.user_id || decodedToken.sub,
							provider: decodedToken.provider_id,
							token: decodedToken,
						};
					}
				} catch (e) {
					authToken = null;
				}
			}
			return data;
		}

		function pushData(path, data) {
			send({d: {a: 'd', b: {p: path, d: data}}, t: 'd'});
		}

		function permissionDenied(requestId) {
			send({d: {r: requestId, b: {s: 'permission_denied', d: 'Permission denied'}}, t: 'd'});
		}

		function replaceServerTimestamp(data) {
			if (_.isEqual(data, firebase.database.ServerValue.TIMESTAMP)) {
				return server._clock();
			} else if (_.isObject(data)) {
				return _.mapValues(data, replaceServerTimestamp);
			} else {
				return data;
			}
		}

		function tryRead(requestId, path) {
			const result = server._targaryen.as(authData()).read(path);
			if (!result.allowed) {
				permissionDenied(requestId);
				throw new Error(`Permission denied for client to read from ${path}: ${result.info}`);
			}
		}

		function tryPatch(requestId, path, newData) {
			const result = server._targaryen.as(authData()).update(path, newData);
			if (!result.allowed) {
				permissionDenied(requestId);
				throw new Error(`Permission denied for client to update at ${path}: ${result.info}`);
			}
			server._targaryen = result.newDatabase;
		}

		function tryWrite(requestId, path, newData) {
			const result = server._targaryen.as(authData()).write(path, newData);
			if (!result.allowed) {
				permissionDenied(requestId);
				throw new Error(`Permission denied for client to write to ${path}: ${result.info}`);
			}
			server._targaryen = result.newDatabase;
		}

		function handleListen(requestId, normalizedPath, fbRef) {
			const path = normalizedPath.path;
			_log(`Client listen ${path}`);

			try {
				tryRead(requestId, path);
			} catch (e) {
				_log(e);
				return;
			}

			let sendOk = true;
			fbRef.on('value', snap => {
				// BUG: tryRead() here, and if it throws, cancel the listener.
				// See https://github.com/urish/firebase-server/pull/100#issuecomment-323509408
				pushData(path, snap.exportVal());
				if (sendOk) {
					sendOk = false;
					send({d: {r: requestId, b: {s: 'ok', d: {}}}, t: 'd'});
				}
			});
		}

		function handleUpdate(requestId, normalizedPath, fbRef, newData) {
			const path = normalizedPath.path;
			_log(`Client update ${path}`);

			newData = replaceServerTimestamp(newData);

			try {
				tryPatch(requestId, path, newData);
			} catch (e) {
				_log(e);
				return;
			}

			fbRef.update(newData);
			send({d: {r: requestId, b: {s: 'ok', d: {}}}, t: 'd'});
		}

		function handleSet(requestId, normalizedPath, fbRef, newData, hash) {
			_log(`Client set ${normalizedPath.fullPath}`);

			let progress = Promise.resolve(true);
			const path = normalizedPath.path;

			newData = replaceServerTimestamp(newData);

			if (normalizedPath.isPriorityPath) {
				progress = exportData(fbRef).then(parentData => {
					if (_.isObject(parentData)) {
						parentData['.priority'] = newData;
					} else {
						parentData = {
							'.value': parentData,
							'.priority': newData
						};
					}
					newData = parentData;
				});
			}

			progress = progress.then(() => {
				tryWrite(requestId, path, newData);
			});

			if (typeof hash !== 'undefined') {
				progress = progress.then(() => getSnap(fbRef)).then(snap => {
					const calculatedHash = firebaseHash(snap.exportVal());
					if (hash !== calculatedHash) {
						pushData(path, snap.exportVal());
						send({d: {r: requestId, b: {s: 'datastale', d: 'Transaction hash does not match'}}, t: 'd'});
						throw new Error(`Transaction hash does not match: ${hash} !== ${calculatedHash}`);
					}
				});
			}

			progress.then(() => {
				fbRef.set(newData);
				fbRef.once('value', snap => {
					send({d: {r: requestId, b: {s: 'ok', d: {}}}, t: 'd'});
				});
			}).catch(_log);
		}

		function handleAuth(requestId, credential) {
			if (server._authSecret === credential) {
				return send({t: 'd', d: {r: requestId, b: {s: 'ok', d: TokenValidator.normalize({ auth: null, admin: true, exp: null }) }}});
			}

			try {
				const decoded = server._tokenValidator.decode(credential);
				authToken = credential;
				return send({t: 'd', d: {r: requestId, b: {s: 'ok', d: TokenValidator.normalize(decoded)}}});
			} catch (e) {
				return send({t: 'd', d: {r: requestId, b: {s: 'invalid_token', d: 'Could not parse auth token.'}}});
			}
		}

		function accumulateFrames(data){
			//Accumulate buffer until websocket frame is complete
			if (typeof ws.frameBuffer == 'undefined'){
				ws.frameBuffer = '';
			}

			try {
				const parsed = JSON.parse(ws.frameBuffer + data);
				ws.frameBuffer = '';
				return parsed;
			} catch(e) {
				ws.frameBuffer += data;
			}

			return '';
		}

		ws.on('message', data => {
			_log(`Client message: ${data}`);
			if (data === 0) {
				return;
			}

			const parsed = accumulateFrames(data);

			if (parsed && parsed.t === 'd') {
				let path;
				if (typeof parsed.d.b.p !== 'undefined') {
					path = parsed.d.b.p;
				}
				path = normalizePath(path || '');
				const requestId = parsed.d.r;
				const fbRef = path.path ? this.baseRef.child(path.path) : this.baseRef;
				if (parsed.d.a === 'l' || parsed.d.a === 'q') {
					handleListen(requestId, path, fbRef);
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

		send({d: {t: 'h', d: {ts: new Date().getTime(), v: '5', h: this.name, s: ''}}, t: 'c'});
	},

	setRules(rules) {
		this._targaryen = this._targaryen.with({ rules });
	},

	getData(ref) {
		console.warn('FirebaseServer.getData() is deprecated! Please use FirebaseServer.getValue() instead'); // eslint-disable-line no-console
		let result = null;
		this.baseRef.once('value', snap => {
			result = snap.val();
		});
		return result;
	},

	getSnap(ref) {
		return getSnap(ref || this.baseRef);
	},

	getValue(ref) {
		return this.getSnap(ref).then(snap => snap.val());
	},

	exportData(ref) {
		return exportData(ref || this.baseRef);
	},

	close(callback) {
		let https= this._https, cb;
		if (https) {
			cb = function() {
				https.close(callback);
			};
		} else {
			cb = callback;
		}
		this._wss.close(cb);
	},

	setTime(newTime) {
		this._clock.setTime(newTime);
	},

	setAuthSecret(newSecret) {
		this._authSecret = newSecret;
		this._tokenValidator.setSecret(newSecret);
	}
};

module.exports = FirebaseServer;
