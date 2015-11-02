/*
 * firebase-server 0.4.0
 * License: MIT.
 * Copyright (C) 2013, 2014, 2015, Uri Shaked
 * Copyright (C) 2015 James Talmage.
 */

'use strict';

var TokenValidator = require('./token-validator');
var RuleDataSnapshot = require('targaryen/lib/rule-data-snapshot');
var debug = require('debug')('firebase-server:auth-handler');

function authData(connection, server) {
	var data;
	if (connection.authToken) {
		try {
			data = server._tokenValidator.decode(connection.authToken).d;
		} catch (e) {
			connection.authToken = null;
		}
	}
	return data;
}

function attachRuleSnapshot(message, connection, server, next) {
	server.ref().then(function (snap) {
		message.ruleSnapshot = new RuleDataSnapshot(RuleDataSnapshot.convert(snap.exportVal()));
		next();
	});
}

function tryRead(message, connection, server, next) {
	if (server._ruleset) {
		var ruleSnapshot = message.ruleSnapshot;
		var result = server._ruleset.tryRead(message.path, ruleSnapshot, authData(connection, server));
		if (!result.allowed) {
			connection.permissionDenied(message.requestId);
			debug('Permission denied for client to read from %j: %j', message.path, result.info);
			return;
		}
	}
	next();
}

function tryWrite(message, connection, server, next) {
	if (server._ruleset) {
		var dataSnap = message.ruleSnapshot;
		var result = server._ruleset.tryWrite(message.path, dataSnap, message.newData, authData(connection, server));
		if (!result.allowed) {
			connection.permissionDenied(message.requestId);
			debug('Permission denied for client to write to %j: %j', message.path, result.info);
			return;
		}
	}
	next();
}

function handleAuth(message, connection, server) {
	var requestId = message.requestId;
	var credential = message.credentials;
	try {
		var decoded = server._tokenValidator.decode(credential);
		connection.authToken = credential;
		connection.send({t: 'd', d: {r: requestId, b: {s: 'ok', d: TokenValidator.normalize(decoded)}}});
	} catch (e) {
		connection.send({t: 'd', d: {r: requestId, b: {s: 'invalid_token', d: 'Could not parse auth token.'}}});
	}
}

module.exports = {
	attachRuleSnapshot: attachRuleSnapshot,
	tryRead: tryRead,
	tryWrite: tryWrite,
	handleAuth: handleAuth
};
