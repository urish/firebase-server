import * as debug from 'debug';
import * as firebase from 'firebase/app';
import * as http from 'http';
import * as https from 'https';
import * as url from 'url';

const log = debug('firebase-server');

export function HttpServer(
	port: number,
	address: undefined,
	db: firebase.database.Database,
	sslCert?: string,
	sslKey?: string) {

	function writeResponse(response: any, payload: object | null) {
		response.writeHead(200, { 'Content-Type': 'application/json' });
		response.write(JSON.stringify(payload));
		response.end();
	}

	function handleReadRequest(request: any, response: any, path: string) {
		db.ref(path).once('value').then((snapshot) => {
			writeResponse(response, snapshot.val());
		});
	}

	function handleWriteRequest(
		request: any,
		response: any,
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

	function handleDeleteRequest(request: any, response: any, path: string) {
		db.ref(path).remove();
		writeResponse(response, null);
	}

	// var protocol = http;
	// // if (sslCert && sslKey) {
	// // 	protocol = https;
	// // }
	function createServer(cert: string, key: string, cb: (request: any, response: any) => void) {
		if (cert && key) {
			const args = {cert, key};
			return https.createServer(args, cb);
		} else {
			return http.createServer(cb);
		}
	}

	const server = createServer(sslCert, sslKey, (request, response) => {
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
