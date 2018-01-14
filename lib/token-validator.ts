/* License: MIT.
 * Copyright (C) 2015, James Talmage.
 * Copyright (C) 2018, Uri Shaked
 */

import * as debug from 'debug';
import * as jwt from 'jwt-simple';

const log = debug('firebase-server:token-validator');

interface IClaims {
	v?: number;
	d?: {
		uid?: string;
		[key: string]: any;
	};
	nbf?: number;
	exp?: number;
	iat?: number;
	admin?: boolean;
	simulate?: boolean;
	debug?: boolean;
}

export function TokenValidator(secret?: string|null) {
	setSecret(secret);

	function getTime() {
		return Math.floor(new Date().getTime() / 1000);
	}

	function decode(token: string, noVerify = false) {
		const decoded = jwt.decode(token, secret || '', !secret || noVerify);
		if (secret && !noVerify && !isValidTimestamp(decoded)) {
			throw new Error('invalid timestamp');
		}
		log('decode(token: %j, secret: %j) => %j', token, secret, decoded);
		return decoded;
	}

	function isValidTimestamp(claims: object, now = getTime()) {
		const since = validSince(claims);
		const until = validUntil(claims);
		return typeof now === 'number' &&
			typeof since === 'number' &&
			typeof until === 'number' &&
			now >= since &&
			now <= until;
	}

	function setSecret(newSecret?: null|string) {
		secret = newSecret || null;
	}

	function withSecret(newSecret) {
		return TokenValidator(newSecret);
	}

	return {
		decode,
		isValidTimestamp,
		normalize,
		setSecret,
		withSecret,
	};
}

export function normalize(input: object) {
	const normal = {};

	function grab(a: string, b = a) {
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

function validUntil(claims: IClaims) {
	let result: number | null = null;
	if (typeof claims === 'object') {
		if (claims.exp) {
			result = claims.exp;
		} else {
			result = validSince(claims);
			if (result) {
				result += 86400;
			}
		}
	}
	return result;
}

function validSince(claims: IClaims) {
	let result: number | null = null;
	if (typeof claims === 'object') {
		if (claims.nbf) {
			result = claims.nbf;
		} else if (claims.iat) {
			result = claims.iat;
		}
	}
	return result;
}
