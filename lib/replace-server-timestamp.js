/*
 * firebase-server - https://github.com/urish/firebase-server
 * License: MIT.
 * Copyright (C) 2013, 2014, 2015, Uri Shaked.
 */

'use strict';

var _ = require('lodash');

var TIMESTAMP = {
	'.sv': 'timestamp'
};

module.exports = function (root, clock) {
	var time;
	var called = false;

	function replaceServerTimestamp(data) {
		if (_.isEqual(data, TIMESTAMP)) {
			if (!called) {
				called = true;
				time = clock();
			}
			return time;
		} else if (_.isObject(data)) {
			return _.mapValues(data, replaceServerTimestamp);
		} else {
			return data;
		}
	}

	return replaceServerTimestamp(root);
};
