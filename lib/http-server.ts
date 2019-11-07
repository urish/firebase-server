import * as debug from 'debug';
import * as firebase from 'firebase/app';
import * as http from 'http';
import * as url from 'url';

const log = debug('firebase-server');

export function HttpServer(port: number, address: undefined, db: firebase.database.Database) {
	function writeResponse(response: http.ServerResponse, payload: object | null) {
		response.writeHead(200, { 'Content-Type': 'application/json' });
		response.write(JSON.stringify(payload));
		response.end();
	}

	function handleReadRequest(request: http.IncomingMessage, response: http.ServerResponse, path: string) {
		db.ref(path).once('value').then((snapshot) => {
			writeResponse(response, snapshot.val());
		});
	}

	function handleWriteRequest(
		request: http.IncomingMessage,
		response: http.ServerResponse,
		path: string,
		writeMethod: string,
	) {
		let body = '';
		request.on('data', (data) => {
			body += data;
			if (body.length > 1e6) {
				request.connection.destroy();
			}
		});
		request.on('end', () => {
			const payload = JSON.parse(body);
			db.ref(path)[writeMethod](payload);
			if (writeMethod === 'update') {
				db.ref(path).once('value').then((snapshot) => writeResponse(response, snapshot.val()));
			} else {
				writeResponse(response, payload);
			}
		});
	}

	function handleDeleteRequest(request: http.IncomingMessage, response: http.ServerResponse, path: string) {
		db.ref(path).remove();
		writeResponse(response, null);
	}

	const server = http.createServer((request, response) => {
		const urlParts = url.parse(request.url!);
		let path = urlParts.pathname;
		if (!path || !path.match(/\.json$/)) {
			response.writeHead(404);
			response.end();
			return;
		}
		path = path.replace(/\.json$/, '');
		log(`${request.method} ${path}`);
		switch (request.method) {
			case 'GET':
				handleReadRequest(request, response, path);
				break;
			case 'PUT':
				handleWriteRequest(request, response, path, 'set');
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

	server.listen(port, address);
	return server;
}
