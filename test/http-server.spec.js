'use strict';

/* global beforeEach, afterEach, describe, it */

const PORT = 44000;

const originalWebsocket = require('faye-websocket');
const assert = require('assert');
const proxyquire = require('proxyquire');
const fetch = require('node-fetch');

// this is the auth token that will be sent to the server during tests.
// it is initialized in `beforeEach()`.
let authToken = null;

// Firebase has strict requirements about the hostname format. So we provide
// a dummy hostname and then change the URL to localhost inside the
// faye-websocket's Client constructor.
const firebase = proxyquire('firebase', {
	'faye-websocket': {
		Client: function (url) {
			url = url.replace(/dummy\d+\.firebaseio\.test/i, 'localhost');
			return new originalWebsocket.Client(url);
		},
		'@global': true
	}
});

// Override Firebase client authentication mechanism. This allows us to set
// custom auth tokens during tests, as well as authenticate anonymously.
firebase.INTERNAL.factories.auth = function (app, extendApp) {
	const _listeners = [];
	const token = authToken;
	extendApp({
		'INTERNAL': {
			'getToken': function () {
				if (!token) {
					return Promise.resolve(null);
				}
				_listeners.forEach(listener => {
					listener(token);
				});
				return Promise.resolve({ accessToken: token, expirationTime: 1566618502074 });
			},
			'addAuthTokenListener': function (listener) {
				_listeners.push(listener);
			}
		}
	});
};

const FirebaseServer = require('../index');

describe('Firebase HTTP Server', () => {
	let server;
	let sequentialPort = PORT;
	let sequentialConnectionId = 0;
	let app = null;

	beforeEach(() => {
		authToken = null;
	});

	afterEach(() => {
		if (server) {
			server.close();
			server = null;
		}
		if (app) {
			app.database().goOffline();
		}
	});

	function newFirebaseServer(data) {
		server = new FirebaseServer({ port: sequentialPort, rest: true }, `localhost:${sequentialPort}`, data);
		return sequentialPort++;
	}

	function newFirebaseClient(port) {
		const name = `test-firebase-client-${sequentialConnectionId}`;
		const url = `ws://dummy${sequentialConnectionId++}.firebaseio.test:${port}`;
		const config = {
			databaseURL: url
		};
		app = firebase.initializeApp(config, name);
		return app.database().ref();
	}

	describe('get', () => {
		context('root json', () => {
			context('empty dataset', () => {
				it('returns empty hash', () => {
					const port = newFirebaseServer({});
					return fetch(`http://localhost:${port}/.json`)
						.then(resp => resp.json())
						.then(payload => {
							assert.deepEqual(payload, {});
						});
				});
			});
			context('data at root', () => {
				it('returns the data', () => {
					const port = newFirebaseServer({ a: 'b' });
					return fetch(`http://localhost:${port}/.json`)
						.then(resp => resp.json())
						.then(payload => {
							assert.deepEqual(payload, { a: 'b' });
						});
				});
			});
			context('data below root', () => {
				it('returns the data', () => {
					const port = newFirebaseServer({ a: { c: 'b' } });
					return fetch(`http://localhost:${port}/.json`)
						.then(resp => resp.json())
						.then(payload => {
							assert.deepEqual(payload, { a: { c: 'b' } });
						});
				});
			});
		});
	});

	describe('put', () => {
		context('at root', () => {
			it('stores data', () => {
				const port = newFirebaseServer({});
				const client = newFirebaseClient(port);
				return fetch(`http://localhost:${port}/.json`, { method: 'PUT', body: JSON.stringify({ a: 'b' }) })
					.then(resp => client.once('value'))
					.then(snap => {
						assert.deepEqual(snap.val(), { a: 'b' });
					});
			});
			it('overwrites unspecified keys', () => {
				const port = newFirebaseServer({ d: 'e' });
				const client = newFirebaseClient(port);
				return fetch(`http://localhost:${port}/.json`, { method: 'PUT', body: JSON.stringify({ a: 'b' }) })
					.then(resp => client.once('value'))
					.then(snap => {
						assert.deepEqual(snap.val(), { a: 'b' });
					});
			});
		});
		context('at subpath', () => {
			it('stores data', () => {
				const port = newFirebaseServer({});
				const client = newFirebaseClient(port);
				return fetch(`http://localhost:${port}/test.json`, { method: 'PUT', body: JSON.stringify({ a: 'b' }) })
					.then(resp => client.once('value'))
					.then(snap => {
						assert.deepEqual(snap.val(), { test: { a: 'b' } });
					});
			});
		});
	});

	describe('patch', () => {
		context('at root', () => {
			it('stores data', () => {
				const port = newFirebaseServer({});
				const client = newFirebaseClient(port);
				return fetch(`http://localhost:${port}/.json`, { method: 'PATCH', body: JSON.stringify({ a: 'b' }) })
					.then(resp => client.once('value'))
					.then(snap => {
						assert.deepEqual(snap.val(), { a: 'b' });
					});
			});
			it('merges data', () => {
				const port = newFirebaseServer({ d: 'e' });
				const client = newFirebaseClient(port);
				return fetch(`http://localhost:${port}/.json`, { method: 'PATCH', body: JSON.stringify({ a: 'b' }) })
					.then(resp => client.once('value'))
					.then(snap => {
						assert.deepEqual(snap.val(), { a: 'b', d: 'e' });
					});
			});
		});
		context('at subpath', () => {
			it('stores data', () => {
				const port = newFirebaseServer({});
				const client = newFirebaseClient(port);
				return fetch(`http://localhost:${port}/test.json`, { method: 'PATCH', body: JSON.stringify({ a: 'b' }) })
					.then(resp => client.once('value'))
					.then(snap => {
						assert.deepEqual(snap.val(), { test: { a: 'b' } });
					});
			});
		});
	});

	describe('delete', () => {
		context('at root', () => {
			it('deletes data', () => {
				const port = newFirebaseServer({ a: 'b' });
				const client = newFirebaseClient(port);
				return fetch(`http://localhost:${port}/.json`, { method: 'DELETE' })
					.then(resp => client.once('value'))
					.then(snap => {
						assert.deepEqual(snap.val(), null);
					});
			});
		});
		context('at subpath', () => {
			it('deletes data', () => {
				const port = newFirebaseServer({ a: { c: 'b', k: 'l' }, m: 'p' });
				const client = newFirebaseClient(port);
				return fetch(`http://localhost:${port}/a/c.json`, { method: 'DELETE' })
					.then(resp => client.once('value'))
					.then(snap => {
						assert.deepEqual(snap.val(), { a: { k: 'l' }, m: 'p' });
					});
			});
		});
	});
});
