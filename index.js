'use strict';

var WebSocketServer = require('ws').Server;
var mockfirebase = require('mockfirebase');

function FirebaseServer(port, name, data) {
    this.name = name || 'mock.firebase.server';
    this.mockFb = new mockfirebase.MockFirebase('https://' + name + '/', data);

    var wss = new WebSocketServer({
        port: port
    });

    wss.on('connection', this.handleConnection.bind(this));
}

FirebaseServer.prototype = {
    handleConnection: function (ws) {
        console.log('new connection');

        function send(message) {
            console.log('sending', message);
            ws.send(JSON.stringify(message));
        }

        ws.on('message', function (data) {
            console.log('client', data);
            if (data === 0) {
                return;
            }
            var parsed = JSON.parse(data);
            if (parsed.t === 'd') {
                var path = parsed.d.b.p.substr(1);
                var requestId = parsed.d.r;
				var fbRef = path ? this.mockFb.child(path) : this.mockFb;
                if (parsed.d.a === 'l') {
                    console.log('listen', path);
                    // listen
                    send({d: {r: requestId, b: {s: 'ok', d: ''}}, t: 'd'});
					fbRef.on('value', function (snap) {
                        if (snap.val()) {
                            send({d: {a: 'd', b: {p: path, d: snap.val(), t: null}}, t: 'd'});
                        }
                    });
                    this.mockFb.flush();
                }
                if (parsed.d.a === 'p') {
                    console.log('update', path);
					fbRef.set(parsed.d.b.d, function () {
						// TODO check for failure
                        send({d: {r: requestId, b: {s: 'ok', d: ''}}, t: 'd'});
                    });
                }
            }
        }.bind(this));

        send({
            d: {
                t: 'h',
                d: {
                    ts: new Date().getTime(),
                    v: '5',
                    h: this.name,
                    s: ''
                }
            },
            t: 'c'
        });
    }
};

module.exports = FirebaseServer;
