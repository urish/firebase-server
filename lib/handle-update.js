
'use strict';

module.exports = handleUpdate;

var debug = require('debug')('firebase-server:update');
var extract = require('./extract');
var _ = require('lodash');
var replaceServerTimestamp = require('./replace-server-timestamp');

function handleUpdate(message, connection) {
	var server = connection.server;
	var requestId = extract.requestId(message);
	var path = extract.path(message).path;
	var fbRef = extract.fbRef(message, server.baseRef);
	var newData = extract.data(message);
	debug('Client update ' + path);

	newData = replaceServerTimestamp(newData, server._clock);

	var checkPermission = Promise.resolve(true);

	if (server._ruleset) {
		checkPermission = server.exportData(fbRef).then(function (currentData) {
			var mergedData = _.assign(currentData, newData);
			return connection.auth.tryWrite(message, connection, mergedData);
		});
	}

	checkPermission.then(function () {
		fbRef.update(newData);
		connection.send({d: {r: requestId, b: {s: 'ok', d: {}}}, t: 'd'});
	}).catch(debug);
}
