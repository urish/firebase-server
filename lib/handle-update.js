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

function handleUpdate(message, connection) {
	var server = connection.server;
	var requestId = message.requestId;
	var path = message.path;
	var fbRef = connection.server.ref(message.path);
	var newData = message.data;
	debug('Client update ' + path);

	newData = replaceServerTimestamp(newData, server._clock);

	var checkPermission = Promise.resolve(true);

	if (server._ruleset) {
		checkPermission = fbRef.then(function (snap) {
			var mergedData = _.assign(snap.exportVal(), newData);
			return connection.auth.tryWrite(message, connection, mergedData);
		});
	}

	checkPermission.then(function () {
		fbRef.update(newData);
		connection.send({d: {r: requestId, b: {s: 'ok', d: {}}}, t: 'd'});
	}).catch(debug);
}
