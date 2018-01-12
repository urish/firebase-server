/* License: MIT.
 * Copyright (C) 2015, James Talmage.
 * Copyright (C) 2018, Uri Shaked
 */

import * as debug from 'debug';
import * as jwt from 'jwt-simple';

// tslint:disable-next-line:no-var-requires
const TestableClock = require('./testable-clock');
const low = debug('firebase-server:token-validator');

export function TokenValidator(secret, time) {
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
		return TokenValidator(secret, newClock);
	}

	function decode(token, noVerify) {
		const decoded = jwt.decode(token, secret, !secret || noVerify);
		if (!noVerify && !isValidTimestamp(decoded)) {
			throw new Error('invalid timestamp');
		}
		low('decode(token: %j, secret: %j) => %j', token, secret, decoded);
		return decoded;
	}

	function isValidTimestamp(claims, now = getTime()) {
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
		return TokenValidator(newSecret, time);
	}

	return {
		decode,
		isValidTimestamp,
		normalize,
		setSecret,
		setTime: clock.setTime,
		withSecret,
		withTime,
	};
}

export function normalize(input) {
	const normal = {};

	function grab(a, b = a) {
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
	let result;
	if (typeof claims === 'object') {
		if (claims.hasOwnProperty('exp')) {
			result = claims.exp;
		} else {
			result = validSince(claims) + 86400;
		}
	}
	return result;
}

function validSince(claims) {
	let result;
	if (typeof claims === 'object') {
		if (claims.hasOwnProperty('nbf')) {
			result = claims.nbf;
		} else if (claims.hasOwnProperty('iat')) {
			result = claims.iat;
		}
	}
	return result;
}
