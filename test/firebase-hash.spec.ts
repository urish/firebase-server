/* License: MIT.
 * Copyright (C) 2013-2018 Uri Shaked.
 */

import * as assert from 'assert';
import { getFirebaseHash } from '../lib/firebase-hash';

describe('#firebaseHash', () => {
	it('should return empty hash string for null values', () => {
		assert.equal(getFirebaseHash(null), '');
	});

	it('should return correct hash for boolean true', () => {
		assert.equal(getFirebaseHash(true), 'E5z61QM0lN/U2WsOnusszCTkR8M=');
	});

	it('should return correct hash for boolean false', () => {
		assert.equal(getFirebaseHash(false), 'aSSNoqcS4oQwJ2xxH20rvpp3zP0=');
	});

	it('should return correct hash for numeric values', () => {
		assert.equal(getFirebaseHash(500), 'Ajg9bohDwTVmqR14o1bVJnneryM=');
	});

	it('should return correct hash for string values', () => {
		assert.equal(getFirebaseHash('Hello World'), 'B8HWXc7zXMjrsnJxPRj7wrNGqt4=');
	});

	it('should return correct hash for objects with a single key', () => {
		assert.equal(getFirebaseHash({foo: 'bar'}), 'XnLeTeWQmzTHImTbSMDLg/qMrKY=');
	});

	it('should return correct hash for objects with a multiple keys', () => {
		assert.equal(getFirebaseHash({z: 1, a: '2', b: 'true', c: false}), '8qk5vmuZGXWJx+77SGwjYRM0yPA=');
	});

	it('should return correct hash for primitive value with a numeric priority', () => {
		assert.equal(getFirebaseHash({'.priority': 200, '.value': 'primitive'}), 'R9u8hs9fhRzuQ2M/3BQ0uhxz5ys=');
	});

	it('should return correct hash for primitive value a string priority', () => {
		assert.equal(getFirebaseHash({'.priority': 'high', '.value': 42}), 'd/2FMFWchvDsa06RLXZhzvM9aQc=');
	});

	it('should return correct hash for objects with a numeric priority', () => {
		assert.equal(getFirebaseHash({'.priority': 128.256, 'someKey': 'value'}), 'WYR8kBGna+a7E5x75zvhPhzACOQ=');
	});

	it('should return correct hash for objects with a string priority', () => {
		assert.equal(getFirebaseHash({'.priority': 'high', 'someKey': 'value'}), '/KquMIGoCuKO/ipoLoQzqnU0BcI=');
	});
});
