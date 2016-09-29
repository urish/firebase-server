/* License: MIT.
 * Copyright (C) 2013, 2014, 2015, 2016, Uri Shaked.
 */

'use strict';

/* global beforeEach, afterEach, describe, it */

var PORT = 45000;

var originalWebsocket = require('faye-websocket');
var assert = require('assert');
var proxyquire = require('proxyquire');
var _ = require('lodash');

// this is the auth token that will be sent to the server during tests.
// it is initialized in `beforeEach()`.
var authToken = null;

// Firebase has strict requirements about the hostname format. So we provide a dummy
// hostname and then change the URL to localhost inside the faye-websocket's Client
// constructor.
var firebase = proxyquire('firebase', {
	'faye-websocket': {
		Client: function (url) {
			url = url.replace(/dummy\d+\.firebaseio\.test/i, 'localhost');
			return new originalWebsocket.Client(url);
		},
		'@global': true
	}
});

// Override Firebase client authentication mechanism. This allows us to set custom auth tokens during
// tests, as well as authenticate anonymously.
firebase.INTERNAL.factories.auth = function(app, extendApp) {
	var _listeners = [];
	var token = authToken;
	extendApp({
		'INTERNAL': {
			'getToken': function() {
				if (!token) {
					return Promise.resolve(null);
				}
				_listeners.forEach(function(listener) {
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

var FirebaseServer = require('../index');
var co = require('co');
var TokenGenerator = require('firebase-token-generator');
var tokenGenerator = new TokenGenerator('goodSecret');

describe('Firebase Server', function () {
	var server;
	var sequentialConnectionId = 0;

	beforeEach(function() {
		authToken = null;
	});

	afterEach(function () {
		if (server) {
			server.close();
			server = null;
		}
	});

	function newFirebaseClient() {
		var name = 'test-firebase-client-' + sequentialConnectionId;
		var url = 'ws://dummy' + (sequentialConnectionId++) + '.firebaseio.test:' + PORT;
		var config = {
			databaseURL: url
		};
		var app = firebase.initializeApp(config, name);
		return app.database().ref();
	}

	it('should successfully accept a client connection', function (done) {
		server = new FirebaseServer(PORT, 'localhost:' + PORT);
		var client = newFirebaseClient();
		client.once('value', function (snap) {
			assert.equal(snap.val(), null);
			done();
		});
	});

	it('should accept initial data as the third constructor parameter', function (done) {
		server = new FirebaseServer(PORT, 'localhost:' + PORT, {
			Firebase: 'great!'
		});
		var client = newFirebaseClient();
		client.on('value', function (snap) {
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

	it('should return the correct value for child nodes', function (done) {
		server = new FirebaseServer(PORT, 'localhost:' + PORT, {
			states: {
				CA: 'California',
				AL: 'Alabama',
				KY: 'Kentucky'
			}
		});
		var client = newFirebaseClient();
		client.child('states').child('CA').once('value', function (snap) {
			assert.equal(snap.val(), 'California');
			done();
		});
	});

	describe('#update', function () {
		it('should update the given child', function (done) {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {
				states: {
					CA: 'California',
					AL: 'Alabama',
					KY: 'Kentucky'
				}
			});
			var client = newFirebaseClient();
			client.child('states').update({
				NY: 'New York',
				CA: 'Toronto'
			}, co.wrap(function *(err) {
				assert.ok(!err, 'update() call returned an error');
				assert.deepEqual(yield server.getValue(), {
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

		it('should support `firebase.database.ServerValue.TIMESTAMP` values', function (done) {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {
				initialData: true,
				firebase: 'awesome'
			});
			server.setTime(256256256);
			var client = newFirebaseClient();
			client.update({
				'lastUpdated': firebase.database.ServerValue.TIMESTAMP
			}, co.wrap(function *(err) {
				assert.ok(!err, 'set() call returned an error');
				assert.deepEqual(yield server.getValue(), {
					initialData: true,
					firebase: 'awesome',
					lastUpdated: 256256256
				});
				done();
			}));
		});
	});

	describe('#set', function () {
		it('should update server data after calling `set()` from a client', function (done) {
			server = new FirebaseServer(PORT);
			var client = newFirebaseClient();
			client.set({
				'foo': 'bar'
			}, co.wrap(function *(err) {
				assert.ok(!err, 'set() call returned an error');
				assert.deepEqual(yield server.getValue(), {
					'foo': 'bar'
				});
				done();
			}));
		});

		it('should combine websocket frame chunks', function (done) {
			server = new FirebaseServer(PORT);
			var client = newFirebaseClient();
			client.set({
				'foo': _.times(2000,String)
			}, co.wrap(function *(err) {
				assert.ok(!err, 'set() call returned an error');
				assert.deepEqual(yield server.getValue(), {
					'foo': _.times(2000,String)
				});
				done();
			}));
		});

		it('should support `firebase.database.ServerValue.TIMESTAMP` values', function (done) {
			server = new FirebaseServer(PORT);
			server.setTime(50001000102);
			var client = newFirebaseClient();
			client.set({
				'lastUpdated': firebase.database.ServerValue.TIMESTAMP
			}, co.wrap(function *(err) {
				assert.ok(!err, 'set() call returned an error');
				assert.deepEqual(yield server.getValue(), {
					lastUpdated: 50001000102
				});
				done();
			}));
		});
	});

	describe('#remove', function () {
		it('should remove the child', function (done) {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {
				'child1': 1,
				'child2': 5
			});
			var client = newFirebaseClient();
			client.child('child1').remove(co.wrap(function *(err) {
				assert.ok(!err, 'remove() call returned an error');
				assert.deepEqual(yield server.getValue(), {
					'child2': 5
				});
				done();
			}));
		});

		it('should trigger a "value" event with null', function (done) {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {
				'child1': 1,
				'child2': 5
			});
			var client = newFirebaseClient();
			var lastValue;
			client.child('child1').on('value', function (snap) {
				lastValue = snap.val();
			});
			client.child('child1').remove(function (err) {
				assert.ok(!err, 'remove() call returned an error');
				assert.deepEqual(lastValue, null);
				done();
			});
		});
	});

	describe('#transaction', function () {
		it('should save new data to the given location', function (done) {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {});
			var client = newFirebaseClient();
			client.child('users').child('wilma').transaction(function (currentData) {
				assert.equal(currentData, null);
				return {name: {first: 'Wilma', last: 'Flintstone'}};
			}, co.wrap(function *(error, committed, snapshot) {
				assert.equal(error, null);
				assert.equal(committed, true);
				assert.deepEqual(snapshot.val(), {name: {first: 'Wilma', last: 'Flintstone'}});
				assert.deepEqual(yield server.getValue(), {users: {wilma: {name: {first: 'Wilma', last: 'Flintstone'}}}});
				done();
			}));
		});

		it('should return existing data inside the updateFunction function', function (done) {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {
				users: {
					uri: {
						name: {
							first: 'Uri',
							last: 'Shaked',
						}
					}
				}
			});
			var client = newFirebaseClient();

			var firstTime = true;
			client.child('users').child('uri').transaction(function (currentData) {
				if (firstTime) {
					assert.deepEqual(currentData, null);
					firstTime = false;
					return 'first-time';
				} else {
					assert.deepEqual(currentData, {name: {first: 'Uri', last: 'Shaked'}});
					return 'second-time';
				}
			}, function (error, committed, snapshot) {
				assert.equal(error, null);
				assert.equal(committed, true);
				assert.deepEqual(snapshot.val(), 'second-time');
				done();
			});
		});

		it('should successfully handle transactions for object nodes that have priority', function (done) {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {
				'.priority': 500,
				doge: 'such transaction'
			});
			var client = newFirebaseClient();

			client.transaction(function (currentData) {
				return 'very priority';
			}, function (error, committed, snapshot) {
				assert.equal(error, null);
				assert.equal(committed, true);
				assert.deepEqual(snapshot.val(), 'very priority');
				done();
			});
		});

		it('should successfully handle transactions for primitive nodes that have priority', function (done) {
			server = new FirebaseServer(PORT);
			var client = newFirebaseClient();
			client.setWithPriority(true, 200);

			client.transaction(function (currentData) {
				return {newValue: true};
			}, function (error, committed, snapshot) {
				assert.equal(error, null);
				assert.equal(committed, true);
				assert.deepEqual(snapshot.val(), {newValue: true});
				done();
			});
		});

		it('should not update the data on server if the transaction was aborted', function (done) {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {
				users: {
					uri: {
						name: {
							first: 'Uri',
							last: 'Shaked',
						}
					}
				}
			});
			var client = newFirebaseClient();

			client.child('users').child('uri').transaction(function (currentData) {
				if (currentData === null) {
					return 'new-data';
				} else {
					return undefined;
				}
			}, co.wrap(function *(error, committed, snapshot) {
				assert.equal(error, null);
				assert.equal(committed, false);
				assert.deepEqual(snapshot.val(), {name: {first: 'Uri', last: 'Shaked'}});
				assert.deepEqual(yield server.getValue(), {users: {uri: {name: {first: 'Uri', last: 'Shaked'}}}});
				done();
			}));
		});
	});

	describe('security rules', function () {
		it('should forbid reading data when there is no read permission', function (done) {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {
				Firebase: 'great!'
			});
			server.setRules({
				rules: {
					'.read': false
				}
			});

			var client = newFirebaseClient();
			client.on('value', function () {
				client.off('value');
				done(new Error('Client has read permission despite security rules'));
			}, function (err) {
				assert.equal(err.code, 'PERMISSION_DENIED');
				done();
			});
		});

		it('should forbid writing when there is no write permission', function (done) {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {
				Firebase: 'great!'
			});
			server.setRules({
				rules: {
					'.write': false
				}
			});

			var client = newFirebaseClient();
			client.set({
				'foo': 'bar'
			}, co.wrap(function *(err) {
				assert.ok(err, 'set() should have returned an error');
				assert.equal(err.code, 'PERMISSION_DENIED');
				assert.deepEqual(yield server.getValue(), {
					Firebase: 'great!'
				});
				done();
			}));
		});

		it('should forbid updates when there is no write permission', function (done) {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {
				Firebase: 'great!'
			});
			server.setRules({
				rules: {
					'.write': false
				}
			});

			var client = newFirebaseClient();
			client.update({
				'foo': 'bar'
			}, co.wrap(function *(err) {
				assert.ok(err, 'update() should have returned an error');
				assert.equal(err.code, 'PERMISSION_DENIED');
				assert.deepEqual(yield server.getValue(), {
					Firebase: 'great!'
				});
				done();
			}));
		});

		it('should use custom token to deny read', function (done) {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {
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
			var client = newFirebaseClient();
			client.child('user2').on('value', function () {
				client.off('value');
				done(new Error('Client has read permission despite security rules'));
			}, function (err2) {
				assert.equal(err2.code, 'PERMISSION_DENIED');
				done();
			});
		});

		it('should use custom token to allow read', function (done) {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {
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
			var client = newFirebaseClient();
			client.child('user2').on('value', function (snap) {
				client.off('value');
				assert.equal(snap.val(), 'bar');
				done();
			}, function (err2) {
				if (err2) {
					done(err2);
				}
			});
		});
	});

	describe('#setPriority', function () {
		it('should update the priority value for the given child', function (done) {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {
				states: {
					AL: 'Alabama',
					CA: 'California',
					KY: 'Kentucky'
				}
			});

			var client = newFirebaseClient();

			function assertServerValues() {
				server.exportData()
					.then(function (exportVal) {
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

	describe('#setWithPriority', function () {
		it('should update both the value and the priority value for the given child', function (done) {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {
				states: {
					AL: 'Alabama',
					CA: 'California',
					KY: 'Kentucky'
				}
			});

			var client = newFirebaseClient();

			function assertServerValues() {
				server.exportData()
					.then(function (exportVal) {
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

	describe('server priority', function () {
		it('should be reflected when calling snapshot.exportVal() on client', function (done) {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {
				states: {
					AL: {
						'.value': 'Alabama',
						'.priority': 418
					},
					CA: 'California',
					KY: 'Kentucky'
				}
			});

			var client = newFirebaseClient();
			client.child('states').child('AL').on('value', function (snap) {
				assert.deepEqual(snap.val(), 'Alabama');

				assert.deepEqual(snap.exportVal(), {
					'.value': 'Alabama',
					'.priority': 418
				});

				done();
			});
		});
	});

	describe('FirebaseServer.getData()', function () {
		it('should synchronously return the most up-to-date server data', function (done) {
			server = new FirebaseServer(PORT);
			var client = newFirebaseClient();
			client.set({
				'foo': 'bar'
			}, function (err) {
				assert.ok(!err, 'set() call returned an error');
				assert.deepEqual(server.getData(), {
					foo: 'bar'
				});
				done();
			});
		});
	});

	describe('FirebaseServer.close()', function () {
		it('should call the callback when closed', function (done) {
			server = new FirebaseServer(PORT);
			setImmediate(function(){
				server.close(function() {
					done();
				});
			});
		});
	});

	describe('FirebaseServer.setAuthSecret()', function () {
		it('should accept raw secret when handling admin authentication', function (done) {
			server = new FirebaseServer(PORT);
			server.setAuthSecret('test-secret');
			authToken = 'test-secret';
			var client = newFirebaseClient();
			client.once('value', function (snap) {
				assert.equal(snap.val(), null);
				done();
			});
		});

		// Apparently, I haven't found a way to verify that the token was indeed reject.
		// Thus, this test is disabled for the time being.
		xit('should reject invalid auth requests with raw secret', function (done) {
			server = new FirebaseServer(PORT);
			server.setAuthSecret('test-secret');
			authToken = 'invalid-secret';
			newFirebaseClient();
			done();
		});
	});
});
