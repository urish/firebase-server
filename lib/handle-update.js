/*
 * firebase-server - https://github.com/urish/firebase-server
 * License: MIT.
 * Copyright (C) 2013, 2014, 2015, Uri Shaked.
 * Copyright (C) 2015 James Talmage.
 */

'use strict';

module.exports = handleUpdate;

var debug = require('debug')('firebase-server:update');
var _ = require('lodash');
var replaceServerTimestamp = require('./replace-server-timestamp');

handleUpdate.attachNewData = function (req, next) {
	var newData = replaceServerTimestamp(req.data, req.clock);

	req.ref(req.path).once('value', function (snap) {
		req.newData = _.assign(snap.exportVal(), newData);
		next();
	});
};

function handleUpdate(req, next) {
	var path = req.fullPath;
	debug('Client update ' + path);
	req.ref(path).update(replaceServerTimestamp(req.data, req.clock));
	req.ok();
	next();
}
