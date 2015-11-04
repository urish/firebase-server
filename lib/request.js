'use strict';

module.exports = Request;

var Message = require('./message');
var delegate = require('delegates');

function Request(message, connection) {
	if (!this instanceof Request) {
		return new Request(message, connection);
	}
	if (!(message instanceof Message)) {
		message = new Message(message);
	}
	this.message = message;
	this.connection = connection;
	var server = this.server = connection.server;
	this.dataStore = server._dataStore;
	this.tokenValidator = server._tokenValidator;
	this.clock = server._clock;
}

var Rp = Request.prototype;

delegate(Rp, 'connection')
	.method('send')
	.method('get')
	.method('pushData')
	.getter('authData')
	.access('authToken');

delegate(Rp, 'message')
	.getter('rawAction')
	.getter('action')
	.getter('fullPath')
	.getter('isPriorityPath')
	.getter('path')
	.getter('requestId')
	.getter('data')
	.getter('hash')
	.getter('credentials');

delegate(Rp, 'dataStore')
	.method('ref');

Rp.status = function (statusCode, data) {
	this.connection.status(this.message.requestId, statusCode, data);
};

Rp.ok = function (data) {
	this.connection.ok(this.message.requestId, data);
};

Rp.permissionDenied = function () {
	this.connection.permissionDenied(this.message.requestId);
};
