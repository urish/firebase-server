'use strict';
var assert = require('assert');
var Message = require('../lib/message.js');

describe('Message', function () {
	it('should normalize path values for a non-priority path', function () {
		var message = new Message({d: {b: {p: '/a/b/c'}}});
		assert.strictEqual(message.path, 'a/b/c');
		assert.strictEqual(message.fullPath, 'a/b/c');
		assert.strictEqual(message.isPriorityPath, false);
	});

	it('should normalize path values for a priority path', function () {
		var message = new Message({d: {b: {p: '/a/b/c/.priority'}}});
		assert.strictEqual(message.path, 'a/b/c');
		assert.strictEqual(message.fullPath, 'a/b/c/.priority');
		assert.strictEqual(message.isPriorityPath, true);
	});

	it('should lookup the action type', function () {
		var message = new Message({d: {a: 'l'}});
		assert.strictEqual(message.rawAction, 'l');
		assert.strictEqual(message.action, 'listen');

		assert.strictEqual(new Message({d: {a: 'q'}}).action, 'query');
	});
});
