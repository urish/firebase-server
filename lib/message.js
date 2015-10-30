
'use strict';

var _ = require('lodash');
var lookupAction = require('./lookup-action');

module.exports = Message;

function Message(rawData) {
	if (!this instanceof Message) {
		return new Message(rawData);
	}
	if (_.isString(rawData)) {
		rawData = JSON.parse(rawData);
	}
	this.raw = rawData;

	// lookup the action type
	this.rawAction = this.get('d.a');
	this.action = lookupAction(this.rawAction);

	// normalize path components
	var path = this.get('d.b.p');
	this.fullPath = path = (path && path.substr(1)) || '';
	this.isPriorityPath = /\/?\.priority$/.test(path);
	if (this.isPriorityPath) {
		path = path.replace(/\/?\.priority$/, '');
	}
	this.path = path;

	// extract commonly used values
	this.requestId = this.get('d.r');
	this.data = this.get('d.b.d');
	this.hash = this.get('d.b.h');
	this.credentials = this.get('d.b.cred');
}

var Mp = Message.prototype;

Mp.get = function get(path, defaultValue) {
	return _.get(this.raw, path, defaultValue);
};
