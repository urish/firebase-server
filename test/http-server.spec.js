'use strict';

/* global beforeEach, afterEach, describe, it */

var PORT = 44000;

var originalWebsocket = require('faye-websocket');
var assert = require('assert');
var proxyquire = require('proxyquire');
var fetch = require('node-fetch');

// this is the auth token that will be sent to the server during tests.
// it is initialized in `beforeEach()`.
var authToken = null;

// Firebase has strict requirements about the hostname format. So we provide
// a dummy hostname and then change the URL to localhost inside the
// faye-websocket's Client constructor.
var firebase = proxyquire('firebase', {
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

describe('Firebase HTTP Server', function () {
	var server;
	var sequentialPort = PORT;
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

	function newFirebaseServer(data) {
		server = new FirebaseServer({port: sequentialPort, rest: true}, 'localhost:' + sequentialPort, data);
		return sequentialPort++;
	}

	function newFirebaseClient(port) {
		var name = 'test-firebase-client-' + sequentialConnectionId;
		var url = 'ws://dummy' + (sequentialConnectionId++) + '.firebaseio.test:' + port;
		var config = {
			databaseURL: url
		};
		var app = firebase.initializeApp(config, name);
		return app.database().ref();
	}

	describe('get', function() {
		context('root json', function() {
			context('empty dataset', function() {
				it('returns empty hash', function (done) {
					var port = newFirebaseServer({});
					return fetch('http://localhost:' + port + '/.json')
						.then(function(resp) { return resp.json(); })
						.then(function(payload) {
							assert.deepEqual(payload, {});
							done();
						});
				});
			});
			context('data at root', function() {
				it('returns the data', function (done) {
					var port = newFirebaseServer({a: 'b'});
					return fetch('http://localhost:' + port + '/.json')
						.then(function(resp) { return resp.json(); })
						.then(function(payload) {
							assert.deepEqual(payload, {a: 'b'});
							done();
						});
				});
			});
			context('data below root', function() {
				it('returns the data', function (done) {
					var port = newFirebaseServer({a: {c: 'b'}});
					return fetch('http://localhost:' + port + '/.json')
						.then(function(resp) { return resp.json(); })
						.then(function(payload) {
							assert.deepEqual(payload, {a: {c: 'b'}});
							done();
						});
				});
			});
		});

		describe('put', function() {
			context('at root', function() {
				it('stores data', function(done) {
					var port = newFirebaseServer({});
					var client = newFirebaseClient(port);
					return fetch('http://localhost:' + port + '/.json', {method: 'PUT', body: JSON.stringify({a: 'b'})})
						.then(function(resp) {
							client.once('value', function(snap) {
								assert.deepEqual(snap.val(), {a: 'b'});
								done();
							});
						});
				});
				it('overwrites unspecified keys', function(done) {
					var port = newFirebaseServer({d: 'e'});
					var client = newFirebaseClient(port);
					return fetch('http://localhost:' + port + '/.json', {method: 'PUT', body: JSON.stringify({a: 'b'})})
						.then(function(resp) {
							client.once('value', function(snap) {
								assert.deepEqual(snap.val(), {a: 'b'});
								done();
							});
						});
				});
			});
			context('at subpath', function() {
				it('stores data', function(done) {
					var port = newFirebaseServer({});
					var client = newFirebaseClient(port);
					return fetch('http://localhost:' + port + '/test.json', {method: 'PUT', body: JSON.stringify({a: 'b'})})
						.then(function(resp) {
							client.once('value', function(snap) {
								assert.deepEqual(snap.val(), {test: {a: 'b'}});
								done();
							});
						});
				});
			});
		});

		describe('patch', function() {
			context('at root', function() {
				it('stores data', function(done) {
					var port = newFirebaseServer({});
					var client = newFirebaseClient(port);
					return fetch('http://localhost:' + port + '/.json', {method: 'PATCH', body: JSON.stringify({a: 'b'})})
						.then(function(resp) {
							client.once('value', function(snap) {
								assert.deepEqual(snap.val(), {a: 'b'});
								done();
							});
						});
				});
				it('merges data', function(done) {
					var port = newFirebaseServer({d: 'e'});
					var client = newFirebaseClient(port);
					return fetch('http://localhost:' + port + '/.json', {method: 'PATCH', body: JSON.stringify({a: 'b'})})
						.then(function(resp) {
							client.once('value', function(snap) {
								assert.deepEqual(snap.val(), {a: 'b', d: 'e'});
								done();
							});
						});
				});
			});
			context('at subpath', function() {
				it('stores data', function(done) {
					var port = newFirebaseServer({});
					var client = newFirebaseClient(port);
					return fetch('http://localhost:' + port + '/test.json', {method: 'PATCH', body: JSON.stringify({a: 'b'})})
						.then(function(resp) {
							client.once('value', function(snap) {
								assert.deepEqual(snap.val(), {test: {a: 'b'}});
								done();
							});
						});
				});
			});
		});

		describe('delete', function() {
			context('at root', function() {
				it('deletes data', function(done) {
					var port = newFirebaseServer({a: 'b'});
					var client = newFirebaseClient(port);
					return fetch('http://localhost:' + port + '/.json', {method: 'DELETE'})
						.then(function(resp) {
							client.once('value', function(snap) {
								assert.deepEqual(snap.val(), null);
								done();
							});
						});
				});
			});
			context('at subpath', function() {
				it('deletes data', function(done) {
					var port = newFirebaseServer({a: {c: 'b', k: 'l'}, m: 'p'});
					var client = newFirebaseClient(port);
					return fetch('http://localhost:' + port + '/a/c.json', {method: 'DELETE'})
						.then(function(resp) {
							client.once('value', function(snap) {
								assert.deepEqual(snap.val(), {a: {k: 'l'}, m: 'p'});
								done();
							});
						});
				});
			});
		});
	});
});
