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
var auth = require('./auth-handler');
var handleListen = require('./handle-listen');
var handleUpdate = require('./handle-update');
var handleSet = require('./handle-set');
var runSequence = require('./run-sequence');

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

var FSp = FirebaseServer.prototype = {
	handleConnection: function (ws) {
		var server = this;
		var connection = new ClientConnection(ws, server);

		var onListen = runSequence(
			auth.attachRuleSnapshot,
			auth.tryRead,
			handleListen
		);
		connection.on('listen', onListen);
		connection.on('query', onListen);

		connection.on('update', runSequence(
			auth.attachRuleSnapshot,
			handleUpdate.attachNewData,
			auth.tryWrite,
			handleUpdate
		));

		connection.on('set', runSequence(
			auth.attachRuleSnapshot,
			handleSet.checkHash,
			handleSet.attachNewData,
			auth.tryWrite,
			handleSet
		));

		connection.on('auth', auth.handleAuth);

		connection.send({d: {t: 'h', d: {ts: new Date().getTime(), v: '5', h: this.name, s: ''}}, t: 'c'});
	},

	setRules: function (rules) {
		this._ruleset = new Ruleset(rules);
	},

	close: function () {
		this._wss.close();
	}
};

delegate(FSp, '_clock').method('setTime');

delegate(FSp, '_tokenValidator')
	.method('setAuthSecret')
	.method('decodeToken');

delegate(FSp, '_dataStore')
	.method('ref')
	.method('sync')
	.method('getData')
	.method('exportData')
	.method('getValue')
	.getter('baseRef')
	.getter('Firebase');

module.exports = FirebaseServer;
