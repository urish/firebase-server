/* License: MIT.
 * Copyright (C) 2013, 2014, 2015, Uri Shaked.
 */

'use strict';

/* global beforeEach, afterEach, describe, it */

var PORT = 45000;

var mockery = require('mockery');
var originalWebsocket = require('faye-websocket');
var _ = require('lodash');
var assert = require('assert');

var Firebase;
var FirebaseServer = require('../index');

// Firebase has strict requirements about the hostname format. So we provide a dummy
// hostname and then change the URL to localhost inside the faye-websocket's Client
// constructor.
var websocketMock = _.defaults({
	Client: function (url) {
		url = url.replace(/dummy\d+\.firebaseio\.test/i, 'localhost').replace('wss://', 'ws://');
		return new originalWebsocket.Client(url);
	}
}, originalWebsocket);
mockery.registerMock('faye-websocket', websocketMock);

describe('Firebase Server', function () {
	var server;
	var sequentialConnectionId = 0;

	beforeEach(function () {
		mockery.enable({
			warnOnUnregistered: false
		});

		Firebase = require('firebase');
	});

	afterEach(function () {
		if (server) {
			server.close();
			server = null;
		}
	});

	function newServerUrl() {
		return 'ws://dummy' + (sequentialConnectionId++) + '.firebaseio.test:' + PORT;
	}

	it('should successfully accept a client connection', function (done) {
		server = new FirebaseServer(PORT, 'localhost:' + PORT);
		var client = new Firebase(newServerUrl());
		client.once('value', function (snap) {
			assert.equal(snap.val(), null);
			done();
		});
	});

	it('should accept initial data as the third constructor parameter', function (done) {
		server = new FirebaseServer(PORT, 'localhost:' + PORT, {
			Firebase: 'great!'
		});
		var client = new Firebase(newServerUrl());
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
		var client = new Firebase(newServerUrl());
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
			var client = new Firebase(newServerUrl());
			client.child('states').update({
				NY: 'New York',
				CA: 'Toronto'
			}, function (err) {
				assert.ok(!err, 'update() call returned an error');
				assert.deepEqual(server.getData(), {
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
	});

	describe('#set', function () {
		it('should update server data after calling `set()` from a client', function (done) {
			server = new FirebaseServer(PORT);
			var client = new Firebase(newServerUrl());
			client.set({
				'foo': 'bar'
			}, function (err) {
				assert.ok(!err, 'set() call returned an error');
				assert.deepEqual(server.getData(), {
					'foo': 'bar'
				});
				done();
			});
		});
	});

	describe('#remove', function () {
		it('should remove the child', function (done) {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {
				'child1': 1,
				'child2': 5
			});
			var client = new Firebase(newServerUrl());
			client.child('child1').remove(function (err) {
				assert.ok(!err, 'remove() call returned an error');
				assert.deepEqual(server.getData(), {
					'child2': 5
				});
				done();
			});
		});

		it('should trigger a "value" event with null', function (done) {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {
				'child1': 1,
				'child2': 5
			});
			var client = new Firebase(newServerUrl());
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
			var client = new Firebase(newServerUrl());
			client.child('users').child('wilma').transaction(function (currentData) {
				assert.equal(currentData, null);
				return {name: {first: 'Wilma', last: 'Flintstone'}};
			}, function (error, committed, snapshot) {
				assert.equal(error, null);
				assert.equal(committed, true);
				assert.deepEqual(snapshot.val(), {name: {first: 'Wilma', last: 'Flintstone'}});
				assert.deepEqual(server.getData(), {users: {wilma: {name: {first: 'Wilma', last: 'Flintstone'}}}});
				done();
			});
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
			var client = new Firebase(newServerUrl());

			client.child('users').child('uri').transaction(function (currentData) {
				if (currentData === null) {
					return 'new-data';
				} else {
					return;
				}
			}, function (error, committed, snapshot) {
				assert.equal(error, null);
				assert.equal(committed, false);
				assert.deepEqual(snapshot.val(), {name: {first: 'Uri', last: 'Shaked'}});
				assert.deepEqual(server.getData(), {users: {uri: {name: {first: 'Uri', last: 'Shaked'}}}});
				done();
			});
		});
	});

	describe('security rules', function() {
		it('should forbid reading data when there is no read permission', function(done) {
			server = new FirebaseServer(PORT, 'localhost:' + PORT, {
				Firebase: 'great!'
			});
			server.setRules({
				rules: {
					'.read': false
				}
			});

			var client = new Firebase(newServerUrl());
			client.on('value', function () {
				client.off('value');
				done(new Error('Client has read permission despite security rules'));
			}, function(err) {
				assert.equal(err.code, 'PERMISSION_DENIED');
				done();
			});
		});

		it('should forbid writing when there is no write permission', function(done) {
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
			}, function (err) {
				assert.ok(err, 'set() should have returned an error');
				assert.equal(err.code, 'PERMISSION_DENIED');
				assert.deepEqual(server.getData(), {
					Firebase: 'great!'
				});
				done();
			});
		});

		it('should forbid updates when there is no write permission', function(done) {
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
			}, function (err) {
				assert.ok(err, 'update() should have returned an error');
				assert.equal(err.code, 'PERMISSION_DENIED');
				assert.deepEqual(server.getData(), {
					Firebase: 'great!'
				});
				done();
			});
		});
	});
});
