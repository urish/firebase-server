/*
 * firebase-server 0.0.1
 * License: MIT.
 * Copyright (C) 2013, 2014, Uri Shaked.
 */

'use strict';

var WebSocketServer = require('ws').Server;
var mockfirebase = require('mockfirebase');

var loggingEnabled = false;

function _log(message) {
	if (loggingEnabled) {
		console.log('[firebase-server] ' + message);
	}
}

function FirebaseServer(port, name, data) {
	this.name = name || 'mock.firebase.server';
	this.mockFb = new mockfirebase.MockFirebase('https://' + this.name + '/', data);

	var wss = new WebSocketServer({
		port: port
	});

	wss.on('connection', this.handleConnection.bind(this));
	_log('Listening for connections on port ' + port);
}

FirebaseServer.prototype = {
	handleConnection: function (ws) {
		_log('New connection from ' + ws._socket.remoteAddress + ':' + ws._socket.remotePort);

		function send(message) {
			var payload = JSON.stringify(message);
			_log('Sending message: ' + payload);
			try {
				ws.send(payload);
			} catch (e) {
				_log('Send failed: ' + e);
			}
		}

		ws.on('message', function (data) {
			_log('Client message: ' + data);
			if (data === 0) {
				return;
			}
			var parsed = JSON.parse(data);
			if (parsed.t === 'd') {
				var path = parsed.d.b.p.substr(1);
				var requestId = parsed.d.r;
				var fbRef = path ? this.mockFb.child(path) : this.mockFb;
				if (parsed.d.a === 'l') {
					_log('Client listen ' + path);
					// listen
					send({d: {r: requestId, b: {s: 'ok', d: ''}}, t: 'd'});
					fbRef.on('value', function (snap) {
						if (snap.val()) {
							send({d: {a: 'd', b: {p: path, d: snap.val(), t: null}}, t: 'd'});
						}
					});
				}
				if (parsed.d.a === 'p') {
					console.log('Client update' + path);
					fbRef.set(parsed.d.b.d, function () {
						// TODO check for failure
						send({d: {r: requestId, b: {s: 'ok', d: ''}}, t: 'd'});
					});
				}
				this.mockFb.flush();
			}
		}.bind(this));

		send({d: { t: 'h', d: {ts: new Date().getTime(), v: '5', h: this.name, s: ''}}, t: 'c' });
	}
};

FirebaseServer.enableLogging = function (value) {
	loggingEnabled = value;
};

module.exports = FirebaseServer;
