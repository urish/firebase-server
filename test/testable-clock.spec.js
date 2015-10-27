/* License: MIT.
 * Copyright (C) 2015, James Talmage.
 */

'use strict';

var assert = require('assert');
var TestableClock = require('../lib/testable-clock.js');

describe('testable-clock', function () {
	it('should be of type `function`', function () {
		assert.strictEqual(typeof new TestableClock(), 'function');
	});

	it('should lock to a static time if set to a number', function () {
		var clock = new TestableClock(3);

		assert.strictEqual(clock(), 3);

		clock.setTime(6);

		assert.strictEqual(clock(), 6);
	});

	it('should accept a function that returns the current time', function () {
		var time = 3;
		var clock = new TestableClock(function () {
			return time;
		});

		assert.strictEqual(clock(), 3);

		time = 6;

		assert.strictEqual(clock(), 6);
	});

	it('should proxy another clock', function () {
		var clock1 = new TestableClock(3);
		var clock2 = new TestableClock(clock1);

		assert.strictEqual(clock2(), 3);

		clock1.setTime(6);

		assert.strictEqual(clock2(), 6);

		clock2.setTime(9);

		assert.strictEqual(clock2(), 9);

		clock1.setTime(12);

		assert.strictEqual(clock2(), 9);

		clock2.setTime(clock1);

		assert.strictEqual(clock2(), 12);
	});

	it('should default to the system time', function () {
		var clock = new TestableClock();

		var before = (new Date()).getTime();
		var time = clock();
		var after = (new Date()).getTime();

		assert(before <= time, 'before');
		assert(after >= time, 'after');
	});

	it('should throw if provided bad input', function () {
		assert.throws(function () {
			return new TestableClock(true);
		});
	});
});
