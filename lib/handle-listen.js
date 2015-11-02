/*
 * firebase-server - https://github.com/urish/firebase-server
 * License: MIT.
 * Copyright (C) 2013, 2014, 2015, Uri Shaked.
 * Copyright (C) 2015 James Talmage.
 */

'use strict';

module.exports = handleListen;

var debug = require('debug')('firebase-server:listen');

function handleListen(message, connection, server) {
	var path = message.fullPath;
	var fbRef = server.ref(message.path);
	debug('Client listen ' + path);

	var sendOk = true;
	fbRef.on('value', function (snap) {
		if (snap.exportVal()) {
			connection.pushData(path, snap.exportVal());
		}
		if (sendOk) {
			sendOk = false;
			connection.ok(message.requestId);
		}
	});
}
