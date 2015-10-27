'use strict';

function areGeneratorsSupported() {
	try {
		eval('(function*(){})()');
		return true;
	} catch (err) {
		return false;
	}
}

if (!areGeneratorsSupported()) {
	require('babel/register')({
		ignore: /index\.js|lib\/|node_modules/
	});
}
