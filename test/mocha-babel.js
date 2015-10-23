'use strict';

function areGeneratorsSupported() {
	try {
		// jshint evil:true
		eval('(function*(){})()');
		return true;
	} catch (err) {
		return false;
	}
}

if (!areGeneratorsSupported()) {
	require('babel/register');
}

