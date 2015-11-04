/*
 * firebase-server - https://github.com/urish/firebase-server
 * License: MIT.
 * Copyright (C) 2013, 2014, 2015, Uri Shaked.
 * Copyright (C) 2015 James Talmage.
 */

'use strict';

module.exports = handleSet;

var debug = require('debug')('firebase-server:set');
var _ = require('lodash');
var replaceServerTimestamp = require('./replace-server-timestamp');
var firebaseHash = require('./firebase-hash');

handleSet.attachNewData = function(req, next) {
	var newData = replaceServerTimestamp(req.data, req.clock);

	if (req.isPriorityPath) {
		return req.ref(req.path).once('value', function (parentSnap) {
			var parentData = parentSnap.exportVal();
			if (_.isObject(parentData)) {
				parentData['.priority'] = newData;
			} else {
				parentData = {
					'.value': parentData,
					'.priority': newData
				};
			}
			req.newData = parentData;
			next();
		});
	}
	req.newData = newData;
	next();
};

handleSet.checkHash = function (req, next) {
	var hash = req.hash;
	if (typeof hash !== 'undefined') {
		var path = req.path;
		return req.ref(path).once('value', function (snap) {
			var data = snap.exportVal();
			var calculatedHash = firebaseHash(data);
			if (hash !== calculatedHash) {
				req.pushData(path, data);
				req.status('datastale', 'Transaction hash does not match');
				debug('Transaction hash does not match: %j !== %j', hash, calculatedHash);
				return;
			}
			next();
		});
	}
	next();
};

function handleSet(req, next) {
	debug('Client set ' + req.fullPath);
	var path = req.path;
	var ref = req.ref(path);
	ref.set(req.newData);
	ref.once('value', function (snap) {
		req.pushData(path, snap.exportVal());
		req.ok();
		next();
	});
}
