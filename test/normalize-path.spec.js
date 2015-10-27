'use strict';
var assert = require('assert');
var normalizePath = require('../lib/normalize-path.js');

describe('normalize-path', function () {
	it('should normalize a non-priority path', function () {
		assert.deepEqual(
			normalizePath('a/b/c'),
			{
				isPriorityPath: false,
				path: 'a/b/c',
				fullPath: 'a/b/c'
			}
		);
	});

	it('should normalize a priority path', function () {
		assert.deepEqual(
			normalizePath('a/b/c/.priority'),
			{
				isPriorityPath: true,
				path: 'a/b/c',
				fullPath: 'a/b/c/.priority'
			}
		);
	});
});
