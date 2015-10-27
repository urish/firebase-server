/* License: MIT.
 * Copyright (C) 2015, James Talmage.
 */

'use strict';

var jwt = require('jwt-simple');
var TestableClock = require('./testable-clock');
var debug = require('debug')('firebase-server:token-validator');

function Generator (secret, time) {
	if (!time && typeof secret !== 'string') {
		time = secret;
		secret = null;
	}
	setSecret(secret);

	var clock = new TestableClock(time);

	function getTime() {
		return Math.floor(clock() / 1000);
	}

	function withTime(newClock) {
		return new Generator(secret, newClock);
	}

	function decode(token, noVerify) {
		var decoded = jwt.decode(token, secret, !secret || noVerify);
		if (!noVerify && !isValidTimestamp(decoded)) {
			throw new Error('invalid timestamp');
		}
		debug('decode(token: %j, secret: %j) => %j', token, secret, decoded);
		return decoded;
	}

	function isValidTimestamp(claims, now) {
		now = now || getTime();
		var since = validSince(claims);
		var until = validUntil(claims);
		return typeof now === 'number' &&
			typeof since === 'number' &&
			typeof until === 'number' &&
			now >= since &&
			now <= until;
	}

	function setSecret(newSecret) {
		secret = newSecret || null;
	}

	function withSecret(newSecret) {
		return new Generator(newSecret, time);
	}

	return {
		decode: decode,
		setTime: clock.setTime,
		withTime: withTime,
		isValidTimeStamp: isValidTimestamp,
		setSecret: setSecret,
		withSecret: withSecret,
		normalize: normalize
	};
}

function normalize(input) {
	var normal = {};

	function grab(a, b) {
		b = b || a;
		if (input.hasOwnProperty(a)) {
			normal[b] = input[a];
		} else if (input.hasOwnProperty(b)) {
			normal[b] = input[b];
		}
	}

	if (input) {
		grab('d', 'auth');
		grab('nbf', 'notBefore');
		grab('exp', 'expires');
		grab('iat');
		grab('admin');
		grab('simulate');
		grab('debug');
	}
	return normal;
}

function validUntil(claims) {
	var _validUntil;
	if (typeof claims === 'object') {
		if (claims.hasOwnProperty('exp')) {
			_validUntil = claims.exp;
		} else {
			_validUntil = validSince(claims) + 86400;
		}
	}
	return _validUntil;
}

function validSince(claims) {
	var _validSince;
	if (typeof claims === 'object') {
		if (claims.hasOwnProperty('nbf')) {
			_validSince = claims.nbf;
		} else if (claims.hasOwnProperty('iat')) {
			_validSince = claims.iat;
		}
	}
	return _validSince;
}

module.exports = Generator;
module.exports.normalize = normalize;
