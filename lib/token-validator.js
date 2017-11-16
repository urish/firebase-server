/* License: MIT.
 * Copyright (C) 2015, James Talmage.
 */

'use strict';

const jwt = require('jwt-simple');
const TestableClock = require('./testable-clock');
const debug = require('debug')('firebase-server:token-validator');

function Generator (secret, time) {
	if (!time && typeof secret !== 'string') {
		time = secret;
		secret = null;
	}
	setSecret(secret);

	const clock = new TestableClock(time);

	function getTime() {
		return Math.floor(clock() / 1000);
	}

	function withTime(newClock) {
		return new Generator(secret, newClock);
	}

	function decode(token, noVerify) {
		const decoded = jwt.decode(token, secret, !secret || noVerify);
		if (!noVerify && !isValidTimestamp(decoded)) {
			throw new Error('invalid timestamp');
		}
		debug('decode(token: %j, secret: %j) => %j', token, secret, decoded);
		return decoded;
	}

	function isValidTimestamp(claims, now) {
		now = now || getTime();
		const since = validSince(claims);
		const until = validUntil(claims);
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
		decode,
		setTime: clock.setTime,
		withTime,
		isValidTimeStamp: isValidTimestamp,
		setSecret,
		withSecret,
		normalize
	};
}

function normalize(input) {
	const normal = {};

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
	let _validUntil;
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
	let _validSince;
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
