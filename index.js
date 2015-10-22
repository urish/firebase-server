/*
 * firebase-server 0.3.1
 * License: MIT.
 * Copyright (C) 2013, 2014, 2015, Uri Shaked.
 */

'use strict';

var _ = require('lodash');
var WebSocketServer = require('ws').Server;
var Ruleset = require('targaryen/lib/ruleset');
var RuleDataSnapshot = require('targaryen/lib/rule-data-snapshot');
var firebaseHash = require('./lib/firebaseHash');
var Promise = require('bluebird');  // jshint ignore:line
var firebaseCopy = require('firebase-copy');
var co = require('co');

var loggingEnabled = false;

function _log(message) {
	if (loggingEnabled) {
		console.log('[firebase-server] ' + message);
	}
}
function getSnap(ref) {
	return new Promise(function (resolve) {
		ref.once('value', function (snap) {
			resolve(snap);
		});
	});
}

function getValue(ref) {
	return getSnap(ref).then(function (snap) {
		return snap.val();
	});
}

function getExport(ref) {
	return getSnap(ref).then(function (snap) {
		return snap.exportVal();
	});
}

function FirebaseServer(port, name, data) {
	this.Firebase = firebaseCopy();
	this.name = name || 'mock.firebase.server';
	this.Firebase.goOffline();
	this.baseRef = new this.Firebase('ws://fakeserver.firebaseio.com');

	this.baseRef.set(data || null);

	this._wss = new WebSocketServer({
		port: port
	});

	this._wss.on('connection', this.handleConnection.bind(this));
	_log('Listening for connections on port ' + port);
}

FirebaseServer.prototype = {
	handleConnection: function (ws) {
		_log('New connection from ' + ws._socket.remoteAddress + ':' + ws._socket.remotePort);
		var server = this;

		function send(message) {
			var payload = JSON.stringify(message);
			_log('Sending message: ' + payload);
			try {
				ws.send(payload);
			} catch (e) {
				_log('Send failed: ' + e);
			}
		}

		function pushData(path, data) {
			send({d: {a: 'd', b: {p: path, d: data, t: null}}, t: 'd'});
		}

		function permissionDenied(requestId) {
			send({d: {r: requestId, b: {s: 'permission_denied', d: 'Permission denied'}}, t: 'd'});
		}

		var handleListen = co.wrap(function *(requestId, path, fbRef) {
			_log('Client listen ' + path);

			if (server._ruleset) {
				var dataSnap = new RuleDataSnapshot(RuleDataSnapshot.convert(yield getExport(fbRef.root())));
				var result = server._ruleset.tryRead(path, dataSnap);
				if (!result.allowed) {
					_log('Permission denied for client to read from ' + path + ': ' + result.info);
					permissionDenied(requestId);
				}
				return;
			}

			var currentData = yield getExport(fbRef);
			if ((typeof currentData !== 'undefined') && (currentData !== null)) {
				pushData(path, currentData);
			}
			send({d: {r: requestId, b: {s: 'ok', d: {}}}, t: 'd'});
			fbRef.on('value', function (snap) {
				if (snap.val()) {
					pushData(path, snap.exportVal());
				}
			});
		});

		var handleUpdate = co.wrap(function *(requestId, path, fbRef, newData) {
			_log('Client update ' + path);

			if (server._ruleset) {
				var dataSnap = new RuleDataSnapshot(RuleDataSnapshot.convert(yield getExport(fbRef.root())));
				var mergedData = _.assign(yield getExport(fbRef), newData);
				var result = server._ruleset.tryWrite(path, dataSnap, mergedData);
				if (!result.allowed) {
					_log('Permission denied for client to write to ' + path + ': ' + result.info);
					permissionDenied(requestId);
				}
				return;
			}

			fbRef.update(newData);
			setTimeout(function () {
				send({d: {r: requestId, b: {s: 'ok', d: {}}}, t: 'd'});
			});
		});

		var handleSet = co.wrap(function *(requestId, path, fbRef, newData, hash) {
			_log('Client set ' + path);

			if (server._ruleset) {
				var dataSnap = new RuleDataSnapshot(RuleDataSnapshot.convert(yield getExport(fbRef.root())));
				var result = server._ruleset.tryWrite(path, dataSnap, newData);
				if (!result.allowed) {
					_log('Permission denied for client to write to ' + path + ': ' + result.info);
					permissionDenied(requestId);
				}
				return;
			}

			if (typeof hash !== 'undefined') {
				var snap = yield getSnap(fbRef);
				var calculatedHash = firebaseHash(snap.exportVal());
				if (hash !== calculatedHash) {
					pushData(path, snap.exportVal());
					send({d: {r: requestId, b: {s: 'datastale', d: 'Transaction hash does not match'}}, t: 'd'});
					return;
				}
			}

			fbRef.set(newData);
			setTimeout(co.wrap (function *() {
				// TODO check for failure
				pushData(path, yield getExport(fbRef));
				send({d: {r: requestId, b: {s: 'ok', d: {}}}, t: 'd'});
			}));
		});

		ws.on('message', function (data) {
			_log('Client message: ' + data);
			if (data === 0) {
				return;
			}
			var parsed = JSON.parse(data);
			if (parsed.t === 'd') {
				var path;
				if (typeof parsed.d.b.p !== 'undefined') {
					path = parsed.d.b.p.substr(1);
				}
				var requestId = parsed.d.r;
				var fbRef = path ? this.baseRef.child(path) : this.baseRef;
				if (parsed.d.a === 'l' || parsed.d.a === 'q') {
					handleListen(requestId, path, fbRef);
				}
				if (parsed.d.a === 'm') {
					handleUpdate(requestId, path, fbRef, parsed.d.b.d);
				}
				if (parsed.d.a === 'p') {
					handleSet(requestId, path, fbRef, parsed.d.b.d, parsed.d.b.h);
				}
			}
		}.bind(this));

		send({d: {t: 'h', d: {ts: new Date().getTime(), v: '5', h: this.name, s: ''}}, t: 'c'});
	},

	setRules: function (rules) {
		this._ruleset = new Ruleset(rules);
	},

	getSnap: function (ref) {
		return getSnap(ref || this.baseRef);
	},

	getValue: function (ref) {
		return getValue(ref || this.baseRef);
	},

	getExport: function (ref) {
		return getExport(ref || this.baseRef);
	},

	close: function () {
		this._wss.close();
	}
};

FirebaseServer.enableLogging = function (value) {
	loggingEnabled = value;
};

module.exports = FirebaseServer;
