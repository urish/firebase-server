
'use strict';

module.exports = lookupAction;

var ACTION_KEYS = {
	'l': 'listen',
	'q': 'query',
	'm': 'update',
	'p': 'set',
	'auth': 'auth'
};

function lookupAction(actionKey) {
	return ACTION_KEYS[actionKey] || null;
}
