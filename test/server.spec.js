/* License: MIT.
 * Copyright (C) 2013, 2014, 2015, Uri Shaked.
 */

'use strict';

/* global beforeEach, afterEach, describe, it */

var PORT = 45000;

var originalWebsocket = require('faye-websocket');
var assert = require('assert');
var proxyquire = require('proxyquire');

// Firebase has strict requirements about the hostname format. So we provide a dummy
// hostname and then change the URL to localhost inside the faye-websocket's Client
// constructor.
var Firebase = proxyquire('firebase', {
	'faye-websocket': {
		Client: function (url) {
			url = url.replace(/dummy\d+\.firebaseio\.test/i, 'localhost').replace('wss://', 'ws://');
			return new originalWebsocket.Client(url);
		}
	}
});

var FirebaseServer = proxyquire('../lib/server', {
	'./data-store': proxyquire('../lib/data-store', {
		'fireproof': null
	})
});
var TokenGenerator = require('firebase-token-generator');
var tokenGenerator = new TokenGenerator('goodSecret');

describe('Firebase Server', () => {
	var server;
	var sequentialConnectionId = 0;

	afterEach(() => {
		if (server) {
			server.close();
			server = null;
		}
	});

	function newServerUrl() {
		return 'ws://dummy' + (sequentialConnectionId++) + '.firebaseio.test:' + PORT;
	}

	it('should successfully accept a client connection', (done) => {
		server = new FirebaseServer(PORT, 'localhost:' + PORT);
		var client = new Firebase(newServerUrl());
		client.once('value', (snap) => {
			assert.equal(snap.val(), null);
			done();
		});
	});

	it('should accept initial data as the third constructor parameter', (done) => {
		server = new FirebaseServer(PORT, 'localhost:' + PORT, {
			Firebase: 'great!'
		});
		var client = new Firebase(newServerUrl());
		client.on('value', (snap) => {
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

	it('should return the correct value for child nodes', (done) => {
		server = new FirebaseServer(PORT, 'localhost:' + PORT, {
			states: {
				CA: 'California',
				AL: 'Alabama',
				KY: 'Kentucky'
			}
		});
		var client = new Firebase(newServerUrl());
		client.child('states').child('CA').once('value', (snap) => {
			assert.equal(snap.val(), 'California');
			done();
		});
	});

	describe('#update', () => {
		it('should update the given child', (done) => {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {
				states: {
					CA: 'California',
					AL: 'Alabama',
					KY: 'Kentucky'
				}
			});
			var client = new Firebase(newServerUrl());
			client.child('states').update({
				NY: 'New York',
				CA: 'Toronto'
			}, (err) => {
				assert.ok(!err, 'update() call returned an error');
				assert.deepEqual(server.sync().val(), {
					states: {
						NY: 'New York',
						CA: 'Toronto',
						AL: 'Alabama',
						KY: 'Kentucky'
					}
				});
				done();
			});
		});

		it('should support `Firebase.ServerValue.TIMESTAMP` values', (done) => {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {
				initialData: true,
				firebase: 'awesome'
			});
			server.setTime(256256256);
			var client = new Firebase(newServerUrl());
			client.update({
				'lastUpdated': Firebase.ServerValue.TIMESTAMP
			}, (err) => {
				assert.ok(!err, 'set() call returned an error');
				assert.deepEqual(server.sync().val(), {
					initialData: true,
					firebase: 'awesome',
					lastUpdated: 256256256
				});
				done();
			});
		});
	});

	describe('#set', () => {
		it('should update server data after calling `set()` from a client', (done) => {
			server = new FirebaseServer(PORT);
			var client = new Firebase(newServerUrl());
			client.set({
				'foo': 'bar'
			}, (err) => {
				assert.ok(!err, 'set() call returned an error');
				assert.deepEqual(server.sync().val(), {
					'foo': 'bar'
				});
				done();
			});
		});

		it('should support `Firebase.ServerValue.TIMESTAMP` values', (done) => {
			server = new FirebaseServer(PORT);
			server.setTime(50001000102);
			var client = new Firebase(newServerUrl());
			client.set({
				'lastUpdated': Firebase.ServerValue.TIMESTAMP
			}, (err) => {
				assert.ifError(err);
				assert.deepEqual(server.sync().val(), {
					lastUpdated: 50001000102
				});
				done();
			});
		});
	});

	describe('#remove', () => {
		it('should remove the child', (done) => {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {
				'child1': 1,
				'child2': 5
			});
			var client = new Firebase(newServerUrl());
			client.child('child1').remove((err) => {
				assert.ifError(err);
				assert.deepEqual(server.sync().val(), {
					'child2': 5
				});
				done();
			});
		});

		it('should trigger a "value" event with null', (done) => {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {
				'child1': 1,
				'child2': 5
			});
			var client = new Firebase(newServerUrl());
			var lastValue;
			client.child('child1').on('value', (snap) => {
				lastValue = snap.val();
			});
			client.child('child1').remove((err) => {
				assert.ok(!err, 'remove() call returned an error');
				assert.deepEqual(lastValue, null);
				done();
			});
		});
	});

	describe('#transaction', () => {
		it('should save new data to the given location', (done) => {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {});
			var client = new Firebase(newServerUrl());
			client.child('users').child('wilma').transaction(function (currentData) {
				assert.equal(currentData, null);
				return {name: {first: 'Wilma', last: 'Flintstone'}};
			}, (error, committed, snapshot) => {
				assert.equal(error, null);
				assert.equal(committed, true);
				assert.deepEqual(snapshot.val(), {name: {first: 'Wilma', last: 'Flintstone'}});
				assert.deepEqual(server.sync().val(), {users: {wilma: {name: {first: 'Wilma', last: 'Flintstone'}}}});
				done();
			});
		});

		it('should return existing data inside the updateFunction function', (done) => {
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
			var client = new Firebase(newServerUrl());

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

		it('should successfully handle transactions for object nodes that have priority', (done) => {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {
				'.priority': 500,
				doge: 'such transaction'
			});
			var client = new Firebase(newServerUrl());

			client.transaction(function (currentData) {
				return 'very priority';
			}, function (error, committed, snapshot) {
				assert.equal(error, null);
				assert.equal(committed, true);
				assert.deepEqual(snapshot.val(), 'very priority');
				done();
			});
		});

		it('should successfully handle transactions for primitive nodes that have priority', (done) => {
			server = new FirebaseServer(PORT);
			var client = new Firebase(newServerUrl());
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

		it('should not update the data on server if the transaction was aborted', (done) => {
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
			var client = new Firebase(newServerUrl());

			client.child('users').child('uri').transaction(function (currentData) {
				if (currentData === null) {
					return 'new-data';
				} else {
					return undefined;
				}
			}, (error, committed, snapshot) => {
				assert.equal(error, null);
				assert.equal(committed, false);
				assert.deepEqual(snapshot.val(), {name: {first: 'Uri', last: 'Shaked'}});
				assert.deepEqual(server.sync().val(), {users: {uri: {name: {first: 'Uri', last: 'Shaked'}}}});
				done();
			});
		});
	});

	describe('security rules', () => {
		it('should forbid reading data when there is no read permission', (done) => {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {
				Firebase: 'great!'
			});
			server.setRules({
				rules: {
					'.read': false
				}
			});

			var client = new Firebase(newServerUrl());
			client.once('value', () => {
				done(new Error('Client has read permission despite security rules'));
			}, (err) => {
				assert.equal(err.code, 'PERMISSION_DENIED');
				done();
			});
		});

		it('should forbid writing when there is no write permission', (done) => {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {
				Firebase: 'great!'
			});
			server.setRules({
				rules: {
					'.write': false
				}
			});

			var client = new Firebase(newServerUrl());
			client.set({
				'foo': 'bar'
			}, (err) => {
				assert.ok(err, 'set() should have returned an error');
				assert.equal(err.code, 'PERMISSION_DENIED');
				assert.deepEqual(server.sync().val(), {
					Firebase: 'great!'
				});
				done();
			});
		});

		it('should forbid updates when there is no write permission', (done) => {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {
				Firebase: 'great!'
			});
			server.setRules({
				rules: {
					'.write': false
				}
			});

			var client = new Firebase(newServerUrl());
			client.update({
				'foo': 'bar'
			}, (err) => {
				assert.ok(err, 'update() should have returned an error');
				assert.equal(err.code, 'PERMISSION_DENIED');
				assert.deepEqual(server.sync().val(), {
					Firebase: 'great!'
				});
				done();
			});
		});

		it('should use custom token to deny read', (done) => {
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

			var client = new Firebase(newServerUrl());
			var token = tokenGenerator.createToken({uid: 'user1'});
			client.authWithCustomToken(token, (err) => {
				if (err) {
					return done(err);
				}
				client.child('user2').once('value', () => {
					done(new Error('Client has read permission despite security rules'));
				}, (err2) => {
					assert.equal(err2.code, 'PERMISSION_DENIED');
					done();
				});
			});
		});

		it('should use custom token to allow read', (done) => {
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

			var client = new Firebase(newServerUrl());
			var token = tokenGenerator.createToken({uid: 'user2'});
			client.authWithCustomToken(token, (err) => {
				if (err) {
					return done(err);
				}
				client.child('user2').once('value', (snap) => {
					assert.equal(snap.val(), 'bar');
					done();
				}, done);
			});
		});
	});

	describe('#setPriority', () => {
		it('should update the priority value for the given child', (done) => {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {
				states: {
					AL: 'Alabama',
					CA: 'California',
					KY: 'Kentucky'
				}
			});

			var client = new Firebase(newServerUrl());

			function assertServerValues(err) {
				if (err) {
					return done(err);
				}
				server.ref().once('value', function (snap) {
					assert.deepEqual(snap.exportVal(), {
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
				}, done);
			}

			client.child('states/KY').setPriority(100, assertServerValues);
		});
	});

	describe('#setWithPriority', () => {
		it('should update both the value and the priority value for the given child', (done) => {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {
				states: {
					AL: 'Alabama',
					CA: 'California',
					KY: 'Kentucky'
				}
			});

			var client = new Firebase(newServerUrl());

			function assertServerValues(err) {
				if (err) {
					return done(err);
				}
				server.ref()
					.once('value', function (snap) {
						assert.deepEqual(snap.exportVal(), {
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
					}, done);
			}

			client.child('states/KY').setWithPriority('K-tucky', 400, assertServerValues);
		});
	});

	describe('server priority', () => {
		it('should be reflected when calling snapshot.exportVal() on client', (done) => {
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

			var client = new Firebase(newServerUrl());
			client.child('states').child('AL').on('value', (snap) => {
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
		it('should synchronously return the most up-to-date server data', (done) => {
			server = new FirebaseServer(PORT);
			var client = new Firebase(newServerUrl());
			client.set({
				'foo': 'bar'
			}, (err) => {
				assert.ok(!err, 'set() call returned an error');
				assert.deepEqual(server.getData(), {
					foo: 'bar'
				});
				done();
			});
		});
	});
});
