/*
 * firebase-server 0.4.0
 * License: MIT.
 * Copyright (C) 2013, 2014, 2015, Uri Shaked & James Talmage.
 */

'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Message = require('./message');
var debug = require('debug')('firebase-server:client-connection');

module.exports = ClientConnection;

function ClientConnection(ws, server) {
	if (!this instanceof ClientConnection) {
		return new ClientConnection(ws);
	}
	debug('New connection from ' + ws._socket.remoteAddress + ':' + ws._socket.remotePort);
	EventEmitter.call(this);
	this.ws = ws;
	this.server = server;

	ws.on('message', this.handleMessage.bind(this));
}

util.inherits(ClientConnection, EventEmitter);

var CCp = ClientConnection.prototype;

CCp.send = function send(message) {
	debug('Sending message: %j', message);
	var payload = JSON.stringify(message);
	try {
		this.ws.send(payload);
	} catch (e) {
		debug('Send failed: ', e);
	}
};

CCp.pushData = function pushData(path, data) {
	this.send({d: {a: 'd', b: {p: path, d: data, t: null}}, t: 'd'});
};

CCp.permissionDenied = function permissionDenied(requestId) {
	this.send({d: {r: requestId, b: {s: 'permission_denied', d: 'Permission denied'}}, t: 'd'});
};

CCp.handleMessage = function(data) {
	debug('Client message: ', data);
	if (data === 0) {
		return;
	}
	var message = new Message(data);

	if (message.get('t') === 'd') {
		var action = message.action;
		if (action) {
			this.emit(action, message, this);
		}
	}
};
