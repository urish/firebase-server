/* License: MIT.
 * Copyright (C) 2015, James Talmage.
 */

'use strict';

const assert = require('assert');
const TestableClock = require('../lib/testable-clock.js');

describe('testable-clock', () => {
	it('should be of type `function`', () => {
		assert.strictEqual(typeof new TestableClock(), 'function');
	});

	it('should lock to a static time if set to a number', () => {
		const clock = new TestableClock(3);

		assert.strictEqual(clock(), 3);

		clock.setTime(6);

		assert.strictEqual(clock(), 6);
	});

	it('should accept a function that returns the current time', () => {
		let time = 3;
		const clock = new TestableClock(() => time);

		assert.strictEqual(clock(), 3);

		time = 6;

		assert.strictEqual(clock(), 6);
	});

	it('should proxy another clock', () => {
		const clock1 = new TestableClock(3);
		const clock2 = new TestableClock(clock1);

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

	it('should default to the system time', () => {
		const clock = new TestableClock();

		const before = (new Date()).getTime();
		const time = clock();
		const after = (new Date()).getTime();

		assert(before <= time, 'before');
		assert(after >= time, 'after');
	});

	it('should throw if provided bad input', () => {
		assert.throws(() => new TestableClock(true));
	});
});
