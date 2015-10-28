/*
 * firebase-server 0.4.0
 * License: MIT.
 * Copyright (C) 2013, 2014, 2015, Uri Shaked.
 */

'use strict';

var _ = require('lodash');
var WebSocketServer = require('ws').Server;
var Ruleset = require('targaryen/lib/ruleset');
var RuleDataSnapshot = require('targaryen/lib/rule-data-snapshot');
var firebaseHash = require('./lib/firebaseHash');
var TestableClock = require('./lib/testable-clock');
var TokenValidator = require('./lib/token-validator');
var DataStore = require('./lib/data-store');
var extract = require('./lib/extract');
var ClientConnection = require('./lib/client-connection');
var Promise = require('native-or-bluebird');
var _log = require('debug')('firebase-server');
var delegate = require('delegates');
var replaceServerTimestamp = require('./lib/replace-server-timestamp');

function FirebaseServer(port, name, data) {
	this.name = name || 'mock.firebase.server';

	this._wss = new WebSocketServer({
		port: port
	});

	this._dataStore = new DataStore(data);

	this._clock = new TestableClock();
	this._tokenValidator = new TokenValidator(null, this._clock);

	this._wss.on('connection', this.handleConnection.bind(this));
	_log('Listening for connections on port ' + port);
}

FirebaseServer.prototype = {
	handleConnection: function (ws) {
		var server = this;
		var authToken = null;
		var _connection = new ClientConnection(ws, server);

		function authData() {
			var data;
			if (authToken) {
				try {
					data = server._tokenValidator.decode(authToken).d;
				} catch (e) {
					authToken = null;
				}
			}
			return data;
		}

		function ruleSnapshot(fbRef) {
			return server.exportData(fbRef.root()).then(function (exportVal) {
				return new RuleDataSnapshot(RuleDataSnapshot.convert(exportVal));
			});
		}

		function tryRead(message, connection) {
			var requestId = extract.requestId(message);
			var path = extract.path(message).path;
			var fbRef = extract.fbRef(message, connection.server.baseRef);
			if (server._ruleset) {
				return ruleSnapshot(fbRef).then(function (dataSnap) {
					var result = server._ruleset.tryRead(path, dataSnap, authData());
					if (!result.allowed) {
						connection.permissionDenied(requestId);
						throw new Error('Permission denied for client to read from ' + path + ': ' + result.info);
					}
					return true;
				});
			}
			return Promise.resolve(true);
		}

		function tryWrite(message, connection, newData) {
			var requestId = extract.requestId(message);
			var path = extract.path(message).path;
			var fbRef = extract.fbRef(message, connection.server.baseRef);
			if (server._ruleset) {
				return ruleSnapshot(fbRef).then(function (dataSnap) {
					var result = server._ruleset.tryWrite(path, dataSnap, newData, authData());
					if (!result.allowed) {
						connection.permissionDenied(requestId);
						throw new Error('Permission denied for client to write to ' + path + ': ' + result.info);
					}
					return true;
				});
			}
			return Promise.resolve(true);
		}

		function handleListen(message, connection) {
			var requestId = extract.requestId(message);
			var path = extract.path(message).path;
			var fbRef = extract.fbRef(message, connection.server.baseRef);
			_log('Client listen ' + path);

			tryRead(message, connection)
				.then(function () {
					var sendOk = true;
					fbRef.on('value', function (snap) {
						if (snap.exportVal()) {
							connection.pushData(path, snap.exportVal());
						}
						if (sendOk) {
							sendOk = false;
							connection.send({d: {r: requestId, b: {s: 'ok', d: {}}}, t: 'd'});
						}
					});
				})
				.catch(_log);
		}

		function handleUpdate(message, connection) {
			var requestId = extract.requestId(message);
			var path = extract.path(message).path;
			var fbRef = extract.fbRef(message, connection.server.baseRef);
			var newData = extract.data(message);
			_log('Client update ' + path);

			newData = replaceServerTimestamp(newData, server._clock);

			var checkPermission = Promise.resolve(true);

			if (server._ruleset) {
				checkPermission = server.exportData(fbRef).then(function (currentData) {
					var mergedData = _.assign(currentData, newData);
					return tryWrite(message, connection, mergedData);
				});
			}

			checkPermission.then(function () {
				fbRef.update(newData);
				connection.send({d: {r: requestId, b: {s: 'ok', d: {}}}, t: 'd'});
			}).catch(_log);
		}

		function handleSet(message, connection) {
			var requestId = extract.requestId(message);
			var normalizedPath = extract.path(message);
			var fbRef = extract.fbRef(message, connection.server.baseRef);
			var newData = extract.data(message);
			var hash = extract.hash(message);
			_log('Client set ' + normalizedPath.fullPath);

			var progress = Promise.resolve(true);
			var path = normalizedPath.path;

			newData = replaceServerTimestamp(newData, server._clock);

			if (normalizedPath.isPriorityPath) {
				progress = server.exportData(fbRef).then(function (parentData) {
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

			progress = progress.then(function () {
				return tryWrite(message, connection, newData);
			});

			if (typeof hash !== 'undefined') {
				progress = progress.then(function () {
					return server.getSnap(fbRef);
				}).then(function (snap) {
					var calculatedHash = firebaseHash(snap.exportVal());
					if (hash !== calculatedHash) {
						connection.pushData(path, snap.exportVal());
						connection.send({d: {r: requestId, b: {s: 'datastale', d: 'Transaction hash does not match'}}, t: 'd'});
						throw new Error('Transaction hash does not match: ' + hash + ' !== ' + calculatedHash);
					}
				});
			}

			progress.then(function () {
				fbRef.set(newData);
				fbRef.once('value', function (snap) {
					connection.pushData(path, snap.exportVal());
					connection.send({d: {r: requestId, b: {s: 'ok', d: {}}}, t: 'd'});
				});
			}).catch(_log);
		}

		function handleAuth(message, connection) {
			var requestId = extract.requestId(message);
			var credential = extract.credentials(message);
			try {
				var decoded = server._tokenValidator.decode(credential);
				authToken = credential;
				connection.send({t: 'd', d: {r: requestId, b: {s: 'ok', d: TokenValidator.normalize(decoded)}}});
			} catch (e) {
				connection.send({t: 'd', d: {r: requestId, b: {s: 'invalid_token', d: 'Could not parse auth token.'}}});
			}
		}

		_connection.on('listen', handleListen);
		_connection.on('query', handleListen);
		_connection.on('update', handleUpdate);
		_connection.on('set', handleSet);
		_connection.on('auth', handleAuth);

		_connection.send({d: {t: 'h', d: {ts: new Date().getTime(), v: '5', h: this.name, s: ''}}, t: 'c'});
	},

	setRules: function (rules) {
		this._ruleset = new Ruleset(rules);
	},

	close: function () {
		this._wss.close();
	},

	setTime: function (newTime) {
		this._clock.setTime(newTime);
	},

	setSecret: function (newSecret) {
		this._tokenValidator.setSecret(newSecret);
	}
};

delegate(FirebaseServer.prototype, '_dataStore')
	.method('getData')
	.method('getSnap')
	.method('getValue')
	.method('exportData')
	.getter('baseRef')
	.getter('Firebase');

module.exports = FirebaseServer;
