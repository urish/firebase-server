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
	data: ['d', 'JSON String data to bootstrap the server with', 'string', '{}'],
	file: ['f', 'JSON File to bootstrap the server with', 'file']
});

cli.main(function (args, options) {
	if (options.verbose) {
		debug.enable('firebase-server*');
	}

	var FirebaseServer = require('../index.js');
	var data = {};

	try {
		data = JSON.parse(options.file || options.data);
	} catch (e) {
		console.warn('Provided content was not valid JSON');
	}

	new FirebaseServer(options.port, options.name, data); // eslint-disable-line no-new

	this.ok('Listening on port ' + options.port);
});
