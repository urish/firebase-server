/*
 * firebase-server - https://github.com/urish/firebase-server
 * License: MIT.
 * Copyright (C) 2015 James Talmage
 */

'use strict';

var assert = require('assert');
var replace = require('../lib/replace-server-timestamp');

describe('replace-server-timestamp', () => {
	var time;
	var clock = () => time += 100;

	beforeEach(() => time = 100);

	it('TIMESTAMP should equal {".sv": "timestamp"}', () =>
		assert.deepEqual(replace.TIMESTAMP, {'.sv': 'timestamp'})
	);

	it('should replace with the provided time', () => {
		assert.strictEqual(
			replace({'.sv': 'timestamp'}, 2000),
			2000
		);

		assert.strictEqual(
			replace({'.sv': 'timestamp'}, 3000),
			3000
		);
	});

	it('should accept a clock function', () => {
		assert.strictEqual(replace(replace.TIMESTAMP, clock), 200);
		assert.strictEqual(replace(replace.TIMESTAMP, clock), 300);
	});

	it('should replace deep values', () => {
		assert.deepEqual(
			replace(
				{foo: replace.TIMESTAMP, bar: 'baz'},
				100
			),
			{foo: 100, bar: 'baz'}
		);
	});

	it('should only call clock once for the whole recursion', () => {
		assert.deepEqual(
			replace(
				{foo: replace.TIMESTAMP, bar: replace.TIMESTAMP},
				clock
			),
			{foo: 200, bar: 200}
		);
	});
});
