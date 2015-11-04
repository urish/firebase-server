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

function attachRuleSnapshot(req, next) {
	req.ref().once('value', function (snap) {
		req.ruleSnapshot = new RuleDataSnapshot(RuleDataSnapshot.convert(snap.exportVal()));
		next();
	});
}

function tryRead(req, next) {
	var result = req.server.tryRead(req.path, req.ruleSnapshot, req.authData);
	if (!result.allowed) {
		req.permissionDenied();
		debug('Permission denied for client to read from %j: %j', req.path, result.info);
		return;
	}
	next();
}

function tryWrite(req, next) {
	var result = req.server.tryWrite(req.path, req.ruleSnapshot, req.newData, req.authData);
	if (!result.allowed) {
		req.permissionDenied();
		debug('Permission denied for client to write to %j: %j', req.path, result.info);
		return;
	}
	next();
}

function handleAuth(req, next) {
	var credential = req.credentials;
	try {
		var decoded = req.tokenValidator.decodeToken(credential);
		req.connection.authToken = credential;
		req.ok(TokenValidator.normalize(decoded));
	} catch (e) {
		req.status('invalid_token', 'Could not parse auth token.');
	}
}

module.exports = {
	attachRuleSnapshot: attachRuleSnapshot,
	tryRead: tryRead,
	tryWrite: tryWrite,
	handleAuth: handleAuth
};
