/* License: MIT.
 * Copyright (C) 2013, 2014, 2015, 2016, Uri Shaked.
 */

'use strict';

/* global beforeEach, afterEach, describe, it */

const PORT = 46000;

const originalWebsocket = require('faye-websocket');
const assert = require('assert');
const http = require('http');
const proxyquire = require('proxyquire');
const _ = require('lodash');

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
firebase.INTERNAL.factories.auth = function(app, extendApp) {
	const _listeners = [];
	const token = authToken;
	extendApp({
		'INTERNAL': {
			'getToken': function() {
				if (!token) {
					return Promise.resolve(null);
				}
				_listeners.forEach(listener => {
					listener(token);
				});
				return Promise.resolve({ accessToken: token, expirationTime: 1566618502074 });
			},
			'addAuthTokenListener': function(listener) {
				_listeners.push(listener);
			}
		}
	});
};

const FirebaseServer = require('../index');
const co = require('co');
const TokenGenerator = require('firebase-token-generator');
const tokenGenerator = new TokenGenerator('goodSecret');

describe('Firebase Server', () => {
	let server;
	let sequentialPort = PORT;
	let sequentialConnectionId = 0;
	const apps=[];

	beforeEach(() => {
		authToken = null;
	});

	afterEach(() => {
		if (server) {
			server.close();
			server = null;
		}
		do {
			var app = apps.shift();
			if (app) {
				app.database().goOffline();
			}
		} while(app);
	});

	function newFirebaseServer(data) {
		server = new FirebaseServer(sequentialPort, `localhost:${sequentialPort}`, data);
		return sequentialPort++;
	}

	function newFirebaseClient(port) {
		const name = `test-firebase-client-${sequentialConnectionId}`;
		const url = `ws://dummy${sequentialConnectionId++}.firebaseio.test:${port}`;
		const config = {
			databaseURL: url
		};
		const app = firebase.initializeApp(config, name);
		apps.push(app);
		return app.database().ref();
	}

	it('should successfully use an existing http.Server', done => {
		const httpServer = http.createServer();
		httpServer.listen(sequentialPort);
		const fbServer = new FirebaseServer({server: httpServer}, `localhost:${sequentialPort}`);
		sequentialPort++;
		fbServer.close(() => {
			httpServer.close(done);
		});
	});

	it('should reject server and rest options together', done => {
		const httpServer = http.createServer();
		assert.throws(() => {
			const fbServer = new FirebaseServer({server: httpServer, rest: true}, `localhost:${sequentialPort}`);
			fbServer.close(() => {});
		}, Error, 'Incompatible options: server, rest');
		done();
	});

	it('should successfully use port within options', done => {
		const fbServer = new FirebaseServer({port: sequentialPort}, `localhost:${sequentialPort}`);
		sequentialPort++;
		fbServer.close(done);
	});

	it('should successfully accept a client connection', done => {
		const port = newFirebaseServer();
		const client = newFirebaseClient(port);
		client.once('value', snap => {
			assert.equal(snap.val(), null);
			done();
		});
	});

	it('should accept initial data as the third constructor parameter', done => {
		const port = newFirebaseServer({
			Firebase: 'great!'
		});
		const client = newFirebaseClient(port);
		client.on('value', snap => {
			if (snap.val() === null) {
				return;
			}
			assert.deepEqual(snap.val(), {
				Firebase: 'great!'
			});
			client.off('value');
			done();
		});
	});

	it('should return the correct value for child nodes', done => {
		const port = newFirebaseServer({
			states: {
				CA: 'California',
				AL: 'Alabama',
				KY: 'Kentucky'
			}
		});
		const client = newFirebaseClient(port);
		client.child('states').child('CA').once('value', snap => {
			assert.equal(snap.val(), 'California');
			done();
		});
	});

	describe('#update', () => {
		it('should update the given child', done => {
			const port = newFirebaseServer({
				states: {
					CA: 'California',
					AL: 'Alabama',
					KY: 'Kentucky'
				}
			});
			const client = newFirebaseClient(port);
			client.child('states').update({
				NY: 'New York',
				CA: 'Toronto'
			}, co.wrap(function *(err) {
				assert.ok(!err, 'update() call returned an error');
				assert.deepEqual((yield server.getValue()), {
					states: {
						NY: 'New York',
						CA: 'Toronto',
						AL: 'Alabama',
						KY: 'Kentucky'
					}
				});
				done();
			}));
		});

		it('should support `firebase.database.ServerValue.TIMESTAMP` values', done => {
			const port = newFirebaseServer({
				initialData: true,
				firebase: 'awesome'
			});
			server.setTime(256256256);
			const client = newFirebaseClient(port);
			client.update({
				'lastUpdated': firebase.database.ServerValue.TIMESTAMP
			}, co.wrap(function *(err) {
				assert.ok(!err, 'set() call returned an error');
				assert.deepEqual((yield server.getValue()), {
					initialData: true,
					firebase: 'awesome',
					lastUpdated: 256256256
				});
				done();
			}));
		});
	});

	describe('#set', () => {
		it('should update server data after calling `set()` from a client', done => {
			const port = newFirebaseServer();
			const client = newFirebaseClient(port);
			client.set({
				'foo': 'bar'
			}, co.wrap(function *(err) {
				assert.ok(!err, 'set() call returned an error');
				assert.deepEqual((yield server.getValue()), {
					'foo': 'bar'
				});
				done();
			}));
		});

		it('should combine websocket frame chunks', done => {
			const port = newFirebaseServer();
			const client = newFirebaseClient(port);
			client.set({
				'foo': _.times(2000,String)
			}, co.wrap(function *(err) {
				assert.ok(!err, 'set() call returned an error');
				assert.deepEqual((yield server.getValue()), {
					'foo': _.times(2000,String)
				});
				done();
			}));
		});

		it('should support `firebase.database.ServerValue.TIMESTAMP` values', done => {
			const port = newFirebaseServer();
			server.setTime(50001000102);
			const client = newFirebaseClient(port);
			client.set({
				'lastUpdated': firebase.database.ServerValue.TIMESTAMP
			}, co.wrap(function *(err) {
				assert.ok(!err, 'set() call returned an error');
				assert.deepEqual((yield server.getValue()), {
					lastUpdated: 50001000102
				});
				done();
			}));
		});
	});

	describe('#remove', () => {
		it('should remove the child', done => {
			const port = newFirebaseServer({
				'child1': 1,
				'child2': 5
			});
			const client = newFirebaseClient(port);
			client.child('child1').remove(co.wrap(function *(err) {
				assert.ok(!err, 'remove() call returned an error');
				assert.deepEqual((yield server.getValue()), {
					'child2': 5
				});
				done();
			}));
		});

		it('should trigger a "value" event with null', done => {
			const port = newFirebaseServer({
				'child1': 1,
				'child2': 5
			});
			const client1 = newFirebaseClient(port);
			const client2 = newFirebaseClient(port);
			let removeGates = 0;
			let doneGates = 0;

			function doRemove() {
				client1.child('child1').remove(err => {
					assert.ok(!err, 'remove() call returned an error');
					assert.ok(++doneGates <= 3);
					if (doneGates === 3) {
						done();
					}
				});
			}
			function onValue(snap) {
				if (snap.val()) {
					assert.ok(++removeGates <= 2);
					if (removeGates === 2) {
						doRemove();
					}
				} else {
					assert.ok(++doneGates <= 3);
					if (doneGates === 3) {
						done();
					}
				}
			}
			client1.child('child1').on('value', onValue);
			client2.child('child1').on('value', onValue);
		});
	});

	describe('#transaction', () => {
		it('should save new data to the given location', done => {
			const port = newFirebaseServer({});
			const client = newFirebaseClient(port);
			client.child('users').child('wilma').transaction(currentData => {
				assert.equal(currentData, null);
				return {name: {first: 'Wilma', last: 'Flintstone'}};
			}, co.wrap(function *(error, committed, snapshot) {
				assert.equal(error, null);
				assert.equal(committed, true);
				assert.deepEqual(snapshot.val(), {name: {first: 'Wilma', last: 'Flintstone'}});
				assert.deepEqual((yield server.getValue()), {users: {wilma: {name: {first: 'Wilma', last: 'Flintstone'}}}});
				done();
			}));
		});

		it('should return existing data inside the updateFunction function', done => {
			const port = newFirebaseServer({
				users: {
					uri: {
						name: {
							first: 'Uri',
							last: 'Shaked',
						}
					}
				}
			});
			const client = newFirebaseClient(port);

			let firstTime = true;
			client.child('users').child('uri').transaction(currentData => {
				if (firstTime) {
					assert.deepEqual(currentData, null);
					firstTime = false;
					return 'first-time';
				} else {
					assert.deepEqual(currentData, {name: {first: 'Uri', last: 'Shaked'}});
					return 'second-time';
				}
			}, (error, committed, snapshot) => {
				assert.equal(error, null);
				assert.equal(committed, true);
				assert.deepEqual(snapshot.val(), 'second-time');
				done();
			});
		});

		it('should successfully handle transactions for object nodes that have priority', done => {
			const port = newFirebaseServer({
				'.priority': 500,
				doge: 'such transaction'
			});
			const client = newFirebaseClient(port);

			client.transaction(currentData => 'very priority', (error, committed, snapshot) => {
				assert.equal(error, null);
				assert.equal(committed, true);
				assert.deepEqual(snapshot.val(), 'very priority');
				done();
			});
		});

		it('should successfully handle transactions for primitive nodes that have priority', done => {
			const port = newFirebaseServer();
			const client = newFirebaseClient(port);
			client.setWithPriority(true, 200);

			client.transaction(currentData => ({
                newValue: true
            }), (error, committed, snapshot) => {
				assert.equal(error, null);
				assert.equal(committed, true);
				assert.deepEqual(snapshot.val(), {newValue: true});
				done();
			});
		});

		it('should not update the data on server if the transaction was aborted', done => {
			const port = newFirebaseServer({
				users: {
					uri: {
						name: {
							first: 'Uri',
							last: 'Shaked',
						}
					}
				}
			});
			const client = newFirebaseClient(port);

			client.child('users').child('uri').transaction(currentData => {
				if (currentData === null) {
					return 'new-data';
				} else {
					return undefined;
				}
			}, co.wrap(function *(error, committed, snapshot) {
				assert.equal(error, null);
				assert.equal(committed, false);
				assert.deepEqual(snapshot.val(), {name: {first: 'Uri', last: 'Shaked'}});
				assert.deepEqual((yield server.getValue()), {users: {uri: {name: {first: 'Uri', last: 'Shaked'}}}});
				done();
			}));
		});
	});

	describe('security rules', () => {
		it('should forbid reading data when there is no read permission', done => {
			const port = newFirebaseServer({
				Firebase: 'great!'
			});
			server.setRules({
				rules: {
					'.read': false
				}
			});

			const client = newFirebaseClient(port);
			client.on('value', () => {
				client.off('value');
				done(new Error('Client has read permission despite security rules'));
			}, err => {
				assert.equal(err.code, 'PERMISSION_DENIED');
				done();
			});
		});

		it('should forbid writing when there is no write permission', done => {
			const port = newFirebaseServer({
				Firebase: 'great!'
			});
			server.setRules({
				rules: {
					'.write': false
				}
			});

			const client = newFirebaseClient(port);
			client.set({
				'foo': 'bar'
			}, co.wrap(function *(err) {
				assert.ok(err, 'set() should have returned an error');
				assert.equal(err.code, 'PERMISSION_DENIED');
				assert.deepEqual((yield server.getValue()), {
					Firebase: 'great!'
				});
				done();
			}));
		});

		it('should forbid updates when there is no write permission', done => {
			const port = newFirebaseServer({
				Firebase: 'great!'
			});
			server.setRules({
				rules: {
					'.write': false
				}
			});

			const client = newFirebaseClient(port);
			client.update({
				'foo': 'bar'
			}, co.wrap(function *(err) {
				assert.ok(err, 'update() should have returned an error');
				assert.equal(err.code, 'PERMISSION_DENIED');
				assert.deepEqual((yield server.getValue()), {
					Firebase: 'great!'
				});
				done();
			}));
		});

		it('should allow updates to children with different paths', done => {
			const port = newFirebaseServer({
				directories: {
					alice: 'great!'
				}
			});
			server.setRules({
				rules: {
					'.write': false,
					users: {
						'.write': true
					},
					directories: {
						'.write': true
					}
				}
			});

			const client = newFirebaseClient(port);
			client.update({
				'users/bob': 'foo',
				'directories/bob': 'bar',
			}, co.wrap(function *(err) {
				if (err) {
					done(err);
					return;
				}
				assert.deepEqual((yield server.getValue()), {
					users: {
						bob: 'foo'
					},
					directories: {
						bob: 'bar',
						alice: 'great!'
					}
				});
				done();
			}));
		});

		it('should use custom token to deny read', done => {
			const port = newFirebaseServer({
				user1: 'foo',
				user2: 'bar'
			});

			server.setRules({
				rules: {
					'$user': {
						'.read': '$user === auth.uid'
					}
				}
			});

			authToken = tokenGenerator.createToken({uid: 'user1'});
			const client = newFirebaseClient(port);
			client.child('user2').on('value', () => {
				client.off('value');
				done(new Error('Client has read permission despite security rules'));
			}, err2 => {
				assert.equal(err2.code, 'PERMISSION_DENIED');
				done();
			});
		});

		it('should use custom token to allow read', done => {
			const port = newFirebaseServer({
				user1: 'foo',
				user2: 'bar'
			});

			server.setRules({
				rules: {
					'$user': {
						'.read': '$user === auth.uid'
					}
				}
			});

			authToken = tokenGenerator.createToken({uid: 'user2'});
			const client = newFirebaseClient(port);
			client.child('user2').on('value', snap => {
				client.off('value');
				assert.equal(snap.val(), 'bar');
				done();
			}, err2 => {
				if (err2) {
					done(err2);
				}
			});
		});
	});

	describe('#setPriority', () => {
		it('should update the priority value for the given child', done => {
			const port = newFirebaseServer({
				states: {
					AL: 'Alabama',
					CA: 'California',
					KY: 'Kentucky'
				}
			});

			const client = newFirebaseClient(port);

			function assertServerValues() {
				server.exportData()
					.then(exportVal => {
						assert.deepEqual(exportVal, {
							states: {
								AL: 'Alabama',
								KY: {
									'.value': 'Kentucky',
									'.priority': 100
								},
								CA: 'California'
							}
						});
						done();
					})
					.catch(assert.fail.bind(assert));
			}

			client.child('states/KY').setPriority(100, assertServerValues);
		});
	});

	describe('#setWithPriority', () => {
		it('should update both the value and the priority value for the given child', done => {
			const port = newFirebaseServer({
				states: {
					AL: 'Alabama',
					CA: 'California',
					KY: 'Kentucky'
				}
			});

			const client = newFirebaseClient(port);

			function assertServerValues() {
				server.exportData()
					.then(exportVal => {
						assert.deepEqual(exportVal, {
							states: {
								AL: 'Alabama',
								KY: {
									'.value': 'K-tucky',
									'.priority': 400
								},
								CA: 'California'
							}
						});
						done();
					})
					.catch(assert.fail.bind(assert));
			}

			client.child('states/KY').setWithPriority('K-tucky', 400, assertServerValues);
		});
	});

	describe('server priority', () => {
		it('should be reflected when calling snapshot.exportVal() on client', done => {
			const port = newFirebaseServer({
				states: {
					AL: {
						'.value': 'Alabama',
						'.priority': 418
					},
					CA: 'California',
					KY: 'Kentucky'
				}
			});

			const client = newFirebaseClient(port);
			client.child('states').child('AL').on('value', snap => {
				assert.deepEqual(snap.val(), 'Alabama');

				assert.deepEqual(snap.exportVal(), {
					'.value': 'Alabama',
					'.priority': 418
				});

				done();
			});
		});
	});

	describe('FirebaseServer.getData()', () => {
		it('should synchronously return the most up-to-date server data', done => {
			const port = newFirebaseServer();
			const client = newFirebaseClient(port);
			client.set({
				'foo': 'bar'
			}, err => {
				assert.ok(!err, 'set() call returned an error');
				assert.deepEqual(server.getData(), {
					foo: 'bar'
				});
				done();
			});
		});
	});

	describe('FirebaseServer.close()', () => {
		it('should call the callback when closed', done => {
			newFirebaseServer();
			setImmediate(() => {
				server.close(() => {
					done();
				});
			});
		});
	});

	describe('FirebaseServer.setAuthSecret()', () => {
		it('should accept raw secret when handling admin authentication', done => {
			const port = newFirebaseServer();
			server.setAuthSecret('test-secret');
			authToken = 'test-secret';
			const client = newFirebaseClient(port);
			client.once('value', snap => {
				assert.equal(snap.val(), null);
				done();
			});
		});

		// Apparently, I haven't found a way to verify that the token was indeed reject.
		// Thus, this test is disabled for the time being.
		xit('should reject invalid auth requests with raw secret', done => {
			const port = newFirebaseServer();
			server.setAuthSecret('test-secret');
			authToken = 'invalid-secret';
			newFirebaseClient(port);
			done();
		});
	});
});
