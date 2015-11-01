/*
 * firebase-server 0.4.0
 * License: MIT.
 * Copyright (C) 2013, 2014, 2015, Uri Shaked
 * Copyright (C) 2015 James Talmage.
 */

'use strict';

var TokenValidator = require('./token-validator');
var RuleDataSnapshot = require('targaryen/lib/rule-data-snapshot');
var delegate = require('delegates');
var debug = require('debug')('firebase-server:auth-handler');

module.exports = AuthHandler;

function AuthHandler(server) {
	if (!this instanceof AuthHandler) {
		return new AuthHandler(server);
	}
	this.server = server;
	this.authToken = null;
}

var AHp = AuthHandler.prototype;

delegate(AHp, 'server')
	.getter('_tokenValidator')
	.getter('_ruleset')
	.getter('_dataStore');

AHp.authData = function authData() {
	var data;
	if (this.authToken) {
		try {
			data = this._tokenValidator.decode(this.authToken).d;
		} catch (e) {
			this.authToken = null;
		}
	}
	return data;
};

AHp.ruleSnapshot = function ruleSnapshot() {
	return this._dataStore.ref().then(function (snap) {
		return new RuleDataSnapshot(RuleDataSnapshot.convert(snap.exportVal()));
	});
};

AHp.tryRead = function tryRead(message, connection, next) {
	var self = this;
	if (self._ruleset) {
		return this.ruleSnapshot().then(function (dataSnap) {
			var result = self._ruleset.tryRead(message.path, dataSnap, self.authData());
			if (!result.allowed) {
				connection.permissionDenied(message.requestId);
				debug('Permission denied for client to read from %j: %j', message.path, result.info);
				return;
			}
			next();
		});
	}
	next();
};

AHp.tryWrite = function tryWrite(message, connection, next) {
	var self = this;
	if (self._ruleset) {
		return this.ruleSnapshot().then(function (dataSnap) {
			var result = self._ruleset.tryWrite(message.path, dataSnap, message.newData, self.authData());
			if (!result.allowed) {
				connection.permissionDenied(message.requestId);
				debug('Permission denied for client to write to %j: %j', message.path, result.info);
				return;
			}
			next();
		});
	}
	next();
};

AHp.handleAuth = function handleAuth(message, connection) {
	var requestId = message.requestId;
	var credential = message.credentials;
	try {
		var decoded = this._tokenValidator.decode(credential);
		this.authToken = credential;
		connection.send({t: 'd', d: {r: requestId, b: {s: 'ok', d: TokenValidator.normalize(decoded)}}});
	} catch (e) {
		connection.send({t: 'd', d: {r: requestId, b: {s: 'invalid_token', d: 'Could not parse auth token.'}}});
	}
};
