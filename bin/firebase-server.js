#!/usr/bin/env node

'use strict';

var fs = require('fs');
var path = require('path');
var cli = require('cli');
var debug = require('debug');

cli.parse({
	verbose: ['v', 'Enable verbose (debug) output'],
	port: ['p', 'Listen on this port', 'number', 5000],
	name: ['n', 'Hostname of the firebase server', 'string', 'localhost.firebaseio.test'],
	data: ['d', 'JSON String or File with JSON data to bootstrap the server with', 'string', '{}']
});

cli.main(function (args, options) {
	if (options.verbose) {
		debug.enable('firebase-server*');
	}

	var FirebaseServer = require('../index.js');

	var data = {};
	try {
		var filePath = path.resolve(process.cwd(), options.data)
		var stat = fs.statSync(filePath); // eslint-disable-line no-sync
		data = require(filePath);
	} catch (eFile) {
		try {
			data = JSON.parse(options.data);
		} catch (eJson) {
			data = {};
		}
	}

	new FirebaseServer(options.port, options.name, data); // eslint-disable-line no-new

	this.ok('Listening on port ' + options.port);
});
