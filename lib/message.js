
'use strict';

var _ = require('lodash');
var normalizePath = require('./normalize-path');
var lookupAction = require('./lookup-action');

module.exports = Message;

function Message(rawData) {
	if (!this instanceof Message) {
		return new Message(rawData);
	}
	if (_.isString(rawData)) {
		rawData = JSON.parse(rawData);
	}
	this.rawData = rawData;
}

var Mp = Message.prototype;

Mp._get = function _get(path, defaultValue) {
	return _.get(this, path, defaultValue);
};

Mp.get = function get(path, defaultValue) {
	return _.get(this.rawData, path, defaultValue);
};

Object.defineProperties(Mp, _.mapValues({
	normalizedPath: function () {
		var path = this.get('d.b.p');
		path = path && path.substr(1);
		return normalizePath(path || '');
	},
	action: function () {
		return lookupAction(this.rawAction);
	},
	rawAction: fromPath('rawData.d.a'),
	path: fromPath('normalizedPath.path'),
	fullPath: fromPath('normalizedPath.fullPath'),
	isPriorityPath: fromPath('normalizedPath.isPriorityPath'),
	requestId: fromPath('rawData.d.r'),
	data: fromPath('rawData.d.b.d'),
	hash: fromPath('rawData.d.b.h'),
	credentials: fromPath('rawData.d.b.cred')
}, function (fn) {
	return {
		get: fn,
		enumerable: true
	};
}));

Mp.fbRef = function fbRef(baseRef) {
	var path = this.path;
	return path ? baseRef.child(path) : baseRef;
};

function fromPath(path, defaultValue) {
	return function () {
		return this._get(path, defaultValue);
	};
}
