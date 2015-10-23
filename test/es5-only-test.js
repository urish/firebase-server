/* License: MIT.
 * Copyright (C) 2013, 2014, 2015, Uri Shaked.
 */

// COPY OF ES5 based tests to prove basic functionality without using babel.

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

describe('ES5 Only Tests', function () {
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
});
