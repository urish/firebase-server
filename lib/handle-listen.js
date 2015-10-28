
'use strict';

module.exports = handleListen;

var debug = require('debug')('firebase-server:listen');
var extract = require('./extract');

function handleListen(message, connection) {
	var requestId = extract.requestId(message);
	var path = extract.path(message).path;
	var fbRef = extract.fbRef(message, connection.server.baseRef);
	debug('Client listen ' + path);

	connection.auth.tryRead(message, connection)
		.then(function () {
			var sendOk = true;
			fbRef.on('value', function (snap) {
				if (snap.exportVal()) {
					connection.pushData(path, snap.exportVal());
				}
				if (sendOk) {
					sendOk = false;
					connection.send({d: {r: requestId, b: {s: 'ok', d: {}}}, t: 'd'});
				}
			});
		})
		.catch(debug);
}
