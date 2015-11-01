
'use strict';

module.exports = runSequence;

var slice = Array.prototype.slice;

function runSequence(sequence) {
	if (arguments.length > 1) {
		return runSequence(slice.call(arguments));
	}
	if (!Array.isArray(sequence)) {
		sequence = [sequence];
	}

	return function () {
		var ctx = this;
		var stack = sequence.slice();
		var args = slice.call(arguments);
		var len = args.length;

		next();

		function next() {
			var fn = stack.length && stack.shift();
			if (fn) {
				var called = false;
				args[len] = function() {
					if (called) {
						throw new Error('next called twice from the same callback');
					}
					called = true;
					next();
				};
				fn.apply(ctx, args);
			}
		}
	};
}
