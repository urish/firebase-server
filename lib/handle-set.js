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
var Promise = require('native-or-bluebird');

function handleSet(message, connection) {
	var server = connection.server;
	var requestId = message.requestId;
	var fbRef = connection.server.ref(message.path);
	var newData = message.data;
	var hash = message.hash;
	debug('Client set ' + message.fullPath);

	var progress = Promise.resolve(true);
	var path = message.path;

	newData = replaceServerTimestamp(newData, server._clock);

	if (message.isPriorityPath) {
		progress = fbRef.then(function (parentSnap) {
			var parentData = parentSnap.exportVal();
			if (_.isObject(parentData)) {
				parentData['.priority'] = newData;
			} else {
				parentData = {
					'.value': parentData,
					'.priority': newData
				};
			}
			newData = parentData;
		});
	}

	progress = progress.then(function () {
		return connection.auth.tryWrite(message, connection, newData);
	});

	if (typeof hash !== 'undefined') {
		progress = progress.then(function () {
			return server.ref(path);
		}).then(function (snap) {
			var calculatedHash = firebaseHash(snap.exportVal());
			if (hash !== calculatedHash) {
				connection.pushData(path, snap.exportVal());
				connection.send({d: {r: requestId, b: {s: 'datastale', d: 'Transaction hash does not match'}}, t: 'd'});
				throw new Error('Transaction hash does not match: ' + hash + ' !== ' + calculatedHash);
			}
		});
	}

	progress.then(function () {
		fbRef.set(newData);
		fbRef.once('value', function (snap) {
			connection.pushData(path, snap.exportVal());
			connection.send({d: {r: requestId, b: {s: 'ok', d: {}}}, t: 'd'});
		});
	}).catch(debug);
}
