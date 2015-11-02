/*
 * firebase-server - https://github.com/urish/firebase-server
 * License: MIT.
 * Copyright (C) 2013, 2014, 2015, Uri Shaked.
 * Copyright (C) 2015 James Talmage.
 */

'use strict';

module.exports = handleSet;

var debug = require('debug')('firebase-server:set');
var _ = require('lodash');
var replaceServerTimestamp = require('./replace-server-timestamp');
var firebaseHash = require('./firebase-hash');

handleSet.attachNewData = function(message, connection, server, next) {
	var newData = replaceServerTimestamp(message.data, server._clock);

	if (message.isPriorityPath) {
		return server.ref(message.path).then(function (parentSnap) {
			var parentData = parentSnap.exportVal();
			if (_.isObject(parentData)) {
				parentData['.priority'] = newData;
			} else {
				parentData = {
					'.value': parentData,
					'.priority': newData
				};
			}
			message.newData = parentData;
			next();
		});
	}
	message.newData = newData;
	next();
};

handleSet.checkHash = function (message, connection, server, next) {
	var hash = message.hash;
	if (typeof hash !== 'undefined') {
		var path = message.path;
		return server.ref(path).then(function (snap) {
			var data = snap.exportVal();
			var calculatedHash = firebaseHash(data);
			if (hash !== calculatedHash) {
				connection.pushData(path, data);
				connection.status(message.requestId, 'datastale', 'Transaction hash does not match');
				debug('Transaction hash does not match: %j !== %j', hash, calculatedHash);
				return;
			}
			next();
		});
	}
	next();
};

function handleSet(message, connection, server) {
	debug('Client set ' + message.fullPath);
	var path = message.path;
	var ref = server.ref(path);
	ref.set(message.newData);
	ref.then(function (snap) {
		connection.pushData(path, snap.exportVal());
		connection.ok(message.requestId);
	});
}
