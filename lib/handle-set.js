
'use strict';

module.exports = handleSet;

var debug = require('debug')('firebase-server:set');
var extract = require('./extract');
var _ = require('lodash');
var replaceServerTimestamp = require('./replace-server-timestamp');
var firebaseHash = require('./firebaseHash');
var Promise = require('native-or-bluebird');

function handleSet(message, connection) {
	var server = connection.server;
	var requestId = extract.requestId(message);
	var normalizedPath = extract.path(message);
	var fbRef = extract.fbRef(message, connection.server.baseRef);
	var newData = extract.data(message);
	var hash = extract.hash(message);
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
