/*
 * firebase-server - https://github.com/urish/firebase-server
 * License: MIT.
 * Copyright (C) 2013, 2014, 2015, Uri Shaked.
 * Copyright (C) 2015 James Talmage.
 */

'use strict';

module.exports = handleUpdate;

var debug = require('debug')('firebase-server:update');
var _ = require('lodash');
var replaceServerTimestamp = require('./replace-server-timestamp');

handleUpdate.attachNewData = function (message, connection, server, next) {
	var newData = replaceServerTimestamp(message.data, server._clock);

	server.ref(message.path).then(function (snap) {
		message.newData = _.assign(snap.exportVal(), newData);
		next();
	});
};

function handleUpdate(message, connection, server) {
	var path = message.path;
	debug('Client update ' + path);
	server.ref(path).update(replaceServerTimestamp(message.data, server._clock));
	connection.ok(message.requestId);
}
