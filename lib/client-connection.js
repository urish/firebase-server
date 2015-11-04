/*
 * firebase-server 0.4.0
 * License: MIT.
 * Copyright (C) 2013, 2014, 2015, Uri Shaked.
 * Copyright (C) 2015 James Talmage.
 */

'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Request = require('./Request');
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
	this.authToken = null;

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

CCp.status = function(requestId, statusCode, data) {
	if (typeof data === 'undefined') {
		data = {};
	}
	this.send({t: 'd', d: {r: requestId, b: {s: statusCode, d: data}}});
};

CCp.ok = function (requestId, data) {
	this.status(requestId, 'ok', data);
};

CCp.permissionDenied = function permissionDenied(requestId) {
	this.status(requestId, 'permission_denied', 'Permission denied');
};

CCp.handleMessage = function(data) {
	debug('Client message: ', data);
	if (data === 0) {
		return;
	}
	var request = new Request(data, this);

	if (request.message.get('t') === 'd') {
		var action = request.message.action;
		if (action) {
			this.emit(action, request);
		}
	}
};

Object.defineProperty(CCp, 'authData', {
	get: function () {
		if (this.authToken) {
			try {
				return this.server.decodeToken(this.authToken).d;
			} catch (e) {
				// no-op
			}
		}
		return null;
	}
});
