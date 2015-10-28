
'use strict';

module.exports = handleSet;

var debug = require('debug')('firebase-server:set');
var _ = require('lodash');
var replaceServerTimestamp = require('./replace-server-timestamp');
var firebaseHash = require('./firebaseHash');
var Promise = require('native-or-bluebird');

function handleSet(message, connection) {
	var server = connection.server;
	var requestId = message.requestId;
	var normalizedPath = message.normalizedPath;
	var fbRef = message.fbRef(connection.server.baseRef);
	var newData = message.data;
	var hash = message.hash;
	debug('Client set ' + normalizedPath.fullPath);

	var progress = Promise.resolve(true);
	var path = normalizedPath.path;

	newData = replaceServerTimestamp(newData, server._clock);

	if (normalizedPath.isPriorityPath) {
		progress = server.exportData(fbRef).then(function (parentData) {
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
			return server.getSnap(fbRef);
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
