/* License: MIT.
 * Copyright (C) 2015, James Talmage.
 */

'use strict';

module.exports = TestableClock;

function TestableClock (time) {
	validateTime(time);

	function invalidTime() {
		throw new Error('time needs to be function / number / falsie');
	}

	function validateTime(newTime) {
		if (newTime &&
			typeof newTime !== 'function' &&
			typeof newTime !== 'number' &&
			!(newTime instanceof TestableClock)) {
			invalidTime();
		}
	}

	function getTime() {
		if (typeof time === 'function' || time instanceof TestableClock) {
			return time();
		}
		if (typeof time === 'number') {
			return time;
		}
		if (!time) {
			return (new Date()).getTime();
		}
		invalidTime();
	}

	getTime.setTime = function (newTime) {
		validateTime(newTime);
		time = newTime;
	};

	return getTime;
}
