'use strict';

var http = require('http');
var url = require('url');

function HttpServer(port, db) {
	function read(path, cb) {
		db.ref(path).once('value').then(cb);
	}

	function writeResponse(response, payload) {
		response.writeHead(200, {'Content-Type': 'application/json'});
		response.write(JSON.stringify(payload));
		response.end();
	}

	function handleReadRequest(request, response, path) {
		read(path, function(snapshot) {
			writeResponse(response, snapshot.val() || {});
		});
	}

	function handleWriteRequest(request, response, path, writeMethod) {
		var body = '';
		request.on('data', function(data) {
			body += data;
			if (body.length > 1e6) {
				request.connection.destroy();
                        }
		});
		request.on('end', function () {
			var payload = JSON.parse(body);
			db.ref(path)[writeMethod](payload);
			if (writeMethod === 'update') {
				read(path, function(snapshot) { writeResponse(response, snapshot.val()); });
			} else {
				writeResponse(response, payload);
			}
		});
	}

	function handleDeleteRequest(request, response, path) {
          console.log(path)
		db.ref(path).remove();
		writeResponse(response, null);
	}

	var server = http.createServer(function(request, response) {
		var urlParts = url.parse(request.url);
		var path = urlParts.pathname;
		if (!path.match(/\.json$/)) {
			response.writeHead(404);
			response.end();
			return;
		}
		path = path.replace(/\.json$/, '');
		console.log(request.method + ' ' + path);
		switch (request.method) {
			case 'GET':
				handleReadRequest(request, response, path);
				break;
			case 'PUT':
				handleWriteRequest(request,response, path, 'set');
				break;
			case 'PATCH':
				handleWriteRequest(request, response, path, 'update');
				break;
			case 'DELETE':
				handleDeleteRequest(request, response, path);
				break;
			default:
				response.writeHead(400);
				response.end();
		}
	});

	server.listen(port, '0.0.0.0');
	return server;
}

module.exports = HttpServer
