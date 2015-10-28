/*
 * firebase-server 0.4.0
 * License: MIT.
 * Copyright (C) 2013, 2014, 2015, Uri Shaked & James Talmage.
 */

'use strict';

var TokenValidator = require('./token-validator');
var Promise = require('native-or-bluebird');
var RuleDataSnapshot = require('targaryen/lib/rule-data-snapshot');
var extract = require('./extract');
var delegate = require('delegates');

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
	return this._dataStore.exportData().then(function (exportVal) {
		return new RuleDataSnapshot(RuleDataSnapshot.convert(exportVal));
	});
};

AHp.tryRead = function tryRead(message, connection) {
	var requestId = extract.requestId(message);
	var path = extract.path(message).path;

	var self = this;
	if (self._ruleset) {
		return this.ruleSnapshot().then(function (dataSnap) {
			var result = self._ruleset.tryRead(path, dataSnap, self.authData());
			if (!result.allowed) {
				connection.permissionDenied(requestId);
				throw new Error('Permission denied for client to read from ' + path + ': ' + result.info);
			}
			return true;
		});
	}
	return Promise.resolve(true);
};

AHp.tryWrite = function tryWrite(message, connection, newData) {
	var requestId = extract.requestId(message);
	var path = extract.path(message).path;
	var self = this;
	if (self._ruleset) {
		return this.ruleSnapshot().then(function (dataSnap) {
			var result = self._ruleset.tryWrite(path, dataSnap, newData, self.authData());
			if (!result.allowed) {
				connection.permissionDenied(requestId);
				throw new Error('Permission denied for client to write to ' + path + ': ' + result.info);
			}
			return true;
		});
	}
	return Promise.resolve(true);
};

AHp.handleAuth = function handleAuth(message, connection) {
	var requestId = extract.requestId(message);
	var credential = extract.credentials(message);
	try {
		var decoded = this._tokenValidator.decode(credential);
		this.authToken = credential;
		connection.send({t: 'd', d: {r: requestId, b: {s: 'ok', d: TokenValidator.normalize(decoded)}}});
	} catch (e) {
		connection.send({t: 'd', d: {r: requestId, b: {s: 'invalid_token', d: 'Could not parse auth token.'}}});
	}
};
