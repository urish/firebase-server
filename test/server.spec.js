/* License: MIT.
 * Copyright (C) 2013, 2014, Uri Shaked.
 */

'use strict';

/* global beforeEach, describe, it */

var PORT = 45000;
var DUMMY_DOMAIN = 'dummy.firebaseio.domain'; // must contain exactly 3 parts

var mockery = require('mockery');
var originalWebsocket = require('faye-websocket');
var _ = require('lodash');
var assert = require('assert');

var Firebase;
var FirebaseServer = require('../index');

beforeEach(function () {
	// Firebase has strict requirements about the hostname format. So we provide a dummy
	// hostname and then change the URL to localhost inside the faye-websocket's Client
	// constructor.
	var websocketMock = _.defaults({
		Client: function (url) {
			url = url.replace(DUMMY_DOMAIN, 'localhost');
			return new originalWebsocket.Client(url);
		}
	}, originalWebsocket);
	mockery.registerMock('faye-websocket', websocketMock);
	mockery.enable({
		warnOnUnregistered: false
	});

	Firebase = require('firebase');
});


describe('Firebase Server', function () {
	var client, server;
	var serverUrl = 'ws://' + DUMMY_DOMAIN + ':' + PORT;

	it('should successfully accept a client connection', function (done) {
		server = new FirebaseServer(PORT);
		client = new Firebase(serverUrl);
		client.once('value', function (snap) {
			assert.equal(snap.val(), null);
			done();
		});
	});
});
