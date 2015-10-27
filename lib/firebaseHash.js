/*
 * firebase-server - https://github.com/urish/firebase-server
 * License: MIT.
 * Copyright (C) 2013, 2014, 2015, Uri Shaked.
 */

'use strict';

var crypto = require('crypto');

function convertToIEEE754Hex(number) {
	var buf = new Buffer(8);
	buf.writeDoubleBE(number, 0);
	return buf.toString('hex');
}

function hashPriority(priority) {
	if (typeof priority === 'number') {
		return 'number:' + convertToIEEE754Hex(priority);
	} else {
		return 'string:' + priority;
	}
}

function getFirebaseHash(value) {
	var hash = '';
	if (value === null) {
		return '';
	}
	if (value['.priority']) {
		hash += 'priority:' + hashPriority(value['.priority']) + ':';
	}
	if (value['.value']) {
		value = value['.value'];
	}
	if ((typeof value === 'object')) {
		Object.keys(value).sort().forEach(function (key) {
			if (key !== '.priority') {
				hash += ':' + key + ':' + getFirebaseHash(value[key]);
			}
		});
	} else {
		hash += typeof value + ':';
		hash += (typeof value === 'number') ? convertToIEEE754Hex(value) : value;
	}
	var sha1 = crypto.createHash('sha1');
	sha1.update(hash);
	return sha1.digest('base64');
}

module.exports = getFirebaseHash;
