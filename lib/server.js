/*
 * firebase-server 0.5.0
 * License: MIT.
 * Copyright (C) 2013, 2014, 2015, Uri Shaked.
 */

'use strict';

var WebSocketServer = require('ws').Server;
var Ruleset = require('targaryen/lib/ruleset');
var TestableClock = require('./testable-clock');
var TokenValidator = require('./token-validator');
var DataStore = require('./data-store');
var ClientConnection = require('./client-connection');
var _log = require('debug')('firebase-server');
var delegate = require('delegates');
var AuthHandler = require('./auth-handler');
var handleListen = require('./handle-listen');
var handleUpdate = require('./handle-update');
var handleSet = require('./handle-set');

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
		var connection = new ClientConnection(ws, server);
		var authHandler = new AuthHandler(server);

		connection.auth = authHandler;

		connection.on('listen', handleListen);
		connection.on('query', handleListen);
		connection.on('update', handleUpdate);
		connection.on('set', handleSet);
		connection.on('auth', authHandler.handleAuth.bind(authHandler));

		connection.send({d: {t: 'h', d: {ts: new Date().getTime(), v: '5', h: this.name, s: ''}}, t: 'c'});
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

	setAuthSecret: function (newSecret) {
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
