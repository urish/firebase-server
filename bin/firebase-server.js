#!/usr/bin/env node

'use strict';

const process = require('process');
const fs = require('fs');
const path = require('path');
const cli = require('cli');
const debug = require('debug');
const pkg = require('../package.json');

cli.enable('version');
cli.setApp(pkg.name, pkg.version);

cli.parse({
	rest: ['e', 'Enable REST HTTP API'],
	verbose: ['v', 'Enable verbose (debug) output'],
	port: ['p', 'Listen on this port', 'number', 5000],
	address: ['a', 'Bind to this address', 'string'],
	daemon: ['b', 'Daemonize (run in background)'],
	pid: [false, 'Write PID to this path', 'string'],
	name: ['n', 'Hostname of the firebase server', 'string', 'localhost.firebaseio.test'],
	data: ['d', 'JSON data to bootstrap the server with', 'string', '{}'],
	file: ['f', 'JSON file to bootstrap the server with', 'file'],
	rules: ['r', 'JSON file with security rules to load', 'file'],
	secret: ['s', 'Shared client auth token secret', 'string'],
	version: [false, 'Output the version number'],
});

cli.main(function (args, options) { // eslint-disable-line max-statements,complexity
	let pidPath = options.pid;
	if (pidPath) {
		pidPath = path.resolve(pidPath);
	}

	if (options.daemon) {
		// Work around https://github.com/indexzero/daemon.node/issues/41
		require('daemon')({cwd: '/'});
	}

	if (options.pid) {
		fs.writeFile(options.pid, process.pid.toString(), () => {});

		process.on('exit', code => {
			fs.unlinkSync(options.pid, () => {}); // eslint-disable-line no-sync
		});
	}

	if (options.verbose) {
		debug.enable('firebase-server*');
	}

	const FirebaseServer = require('../dist/index.js');

	let rawData;
	if (options.file) {
		try {
			rawData = fs.readFileSync(path.resolve(process.cwd(), options.file)); // eslint-disable-line no-sync
		} catch (e) {
			this.output(e);
			this.fatal('Provided data file could not be read.');
		}
	} else {
		rawData = options.data;
	}

	var data = {};
	try {
		data = JSON.parse(rawData);
	} catch (e) {
		this.output(e);
		this.fatal('Provided data was not valid JSON.');
	}

	let rules;
	if (options.rules) {
		try {
			rules = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), options.rules))); // eslint-disable-line no-sync
		} catch (e) {
			this.output(e);
			this.fatal('Provided rules file could not be read.');
		}
	}

	const server = new FirebaseServer({
		port: options.port,
		address: options.address,
		rest: options.rest
	}, options.name, data); // eslint-disable-line no-new

	if (rules) {
		server.setRules(rules);
	}

	if (options.secret) {
		server.setAuthSecret(options.secret);
	}

	function end() {
		server.close(() => {
			process.exit(); // eslint-disable-line no-process-exit
		});
	}
	process.on('SIGINT', end);
	process.on('SIGTERM', end);

	let where;
	if (options.address) {
		where = `${options.address}:${options.port}`;
	} else {
		where = `port ${options.port}`;
	}
	this.ok(`Listening on ${where}`);
});
