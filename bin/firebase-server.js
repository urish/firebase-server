#!/usr/bin/env node

'use strict';

var cli = require('cli');
var debug = require('debug');

cli.parse({
	verbose: ['v', 'Enable verbose (debug) output'],
	port: ['p', 'Listen on this port', 'number', 5000],
	name: ['n', 'Hostname of the firebase server', 'string', 'localhost.firebaseio.test']
});

cli.main(function (args, options) {
	if (options.verbose) {
		debug.enable('firebase-server*');
	}

	var FirebaseServer = require('../index.js');

	new FirebaseServer(options.port, options.name, {}); // eslint-disable-line no-new

	this.ok('Listening on port ' + options.port);
});
