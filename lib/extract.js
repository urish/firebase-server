
'use strict';

var _ = require('lodash');
var normalizePath = require('./normalize-path');

module.exports = {
	path: extractPath,
	fbRef: extractFbRef,
	requestId: fromPath('d.r'),
	data: fromPath('d.b.d'),
	hash: fromPath('d.b.h'),
	credentials: fromPath('d.b.cred')
};

function extractPath(message) {
	var path;
	if (typeof message.d.b.p !== 'undefined') {
		path = message.d.b.p.substr(1);
	}
	return normalizePath(path || '');
}

function extractFbRef(message, baseRef) {
	var path = extractPath(message).path;
	return path ? baseRef.child(path) : baseRef;
}

function fromPath(path, defaultValue) {
	return function (message) {
		return _.get(message, path, defaultValue);
	};
}
