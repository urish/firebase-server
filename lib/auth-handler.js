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

function attachRuleSnapshot(message, connection, server, next) {
	server.ref().then(function (snap) {
		message.ruleSnapshot = new RuleDataSnapshot(RuleDataSnapshot.convert(snap.exportVal()));
		next();
	});
}

function tryRead(message, connection, server, next) {
	var result = server.tryRead(message.path, message.ruleSnapshot, connection.authData);
	if (!result.allowed) {
		connection.permissionDenied(message.requestId);
		debug('Permission denied for client to read from %j: %j', message.path, result.info);
		return;
	}
	next();
}

function tryWrite(message, connection, server, next) {
	var result = server.tryWrite(message.path, message.ruleSnapshot, message.newData, connection.authData);
	if (!result.allowed) {
		connection.permissionDenied(message.requestId);
		debug('Permission denied for client to write to %j: %j', message.path, result.info);
		return;
	}
	next();
}

function handleAuth(message, connection, server) {
	var requestId = message.requestId;
	var credential = message.credentials;
	try {
		var decoded = server.decodeToken(credential);
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
