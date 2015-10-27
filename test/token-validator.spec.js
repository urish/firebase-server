/* License: MIT.
 * Copyright (C) 2015, James Talmage.
 */

'use strict';

var assert = require('assert');
var TokenValidator = require('../lib/token-validator');
var TokenGenerator = require('firebase-token-generator');
var VERSION = 0;

describe('token-validator', function () {
	it('#decode should decode a valid token', function () {
		var generator = new TokenGenerator('mySecret');
		var validator = new TokenValidator('mySecret', 100 * 1000);

		var token = generator.createToken(
			{uid: 'encodeDecodeTest', customProperty: 'foo'},
			{iat: 100}
		);

		assert.deepEqual(
			validator.decode(token),
			{
				v: VERSION,
				iat: 100,
				d: {uid: 'encodeDecodeTest', customProperty: 'foo'}
			}
		);
	});

	it('#decode should include token options (e.g. iat, notBefore, expires) in decoded token', function () {
		var generator = new TokenGenerator('someOtherSecret');
		var validator = new TokenValidator('someOtherSecret', 250 * 1000);

		var token = generator.createToken(
			{uid: 'expiresTest', customProperty: 'bar'},
			{notBefore: 100, iat: 200, expires: 300, admin: true, debug: true, simulate: true}
		);

		assert.deepEqual(
			validator.decode(token),
			{
				v: VERSION,
				nbf: 100,
				iat: 200,
				exp: 300,
				admin: true,
				debug: true,
				simulate: true,
				d: {uid: 'expiresTest', customProperty: 'bar'}
			}
		);
	});

	it('#normalize should convert `nbf` and `exp` to longer form names', function () {
		assert.deepEqual(
			TokenValidator.normalize({
				v: VERSION,
				nbf: 100,
				iat: 200,
				exp: 300,
				admin: true,
				debug: true,
				simulate: true,
				d: {uid: 'normalizeTest', foo: 'bar'}
			}),
			{
				notBefore: 100,
				iat: 200,
				expires: 300,
				admin: true,
				debug: true,
				simulate: true,
				auth: {uid: 'normalizeTest', foo: 'bar'}
			}
		);
	});

	it('#decode should throw if token has a bad signature', function () {
		var generator = new TokenGenerator('badSecret');
		var validator = new TokenValidator('goodSecret');

		var token = generator.createToken(
			{uid: 'expiresTest', customProperty: 'bar'}
		);

		assert.throws(function () {
			validator.decode(token);
		});
	});

	it('should accept a custom clock function', function () {
		var generator = new TokenGenerator('mySecret');
		var token = generator.createToken({uid:'1'}, {iat: 100, notBefore: 200, expires: 300});

		var time;
		var validator = new TokenValidator('mySecret', function () {
			return time * 1000;
		});

		time = 150;
		assert.throws(function () {
			validator.decode(token);
		});

		time = 250;
		assert.deepEqual(
			validator.decode(token),
			{
				v: VERSION,
				iat: 100,
				nbf: 200,
				exp: 300,
				d: {uid: '1'}
			}
		);

		time = 350;
		assert.throws(function () {
			validator.decode(token);
		});
	});

	it('#withTime should create a new token-validator with a different testable-clock', function () {
		var generator = new TokenGenerator('mySecret');
		var token = generator.createToken({uid:'1'}, {iat: 100, notBefore: 200, expires: 300});

		var validator = new TokenValidator('mySecret');

		assert.throws(function () {
			validator.withTime(150 * 1000).decode(token);
		});

		assert.deepEqual(
			validator.withTime(250 * 1000).decode(token),
			{
				v: VERSION,
				iat: 100,
				nbf: 200,
				exp: 300,
				d: {uid: '1'}
			}
		);

		assert.throws(function () {
			validator.withTime(350 * 1000).decode(token);
		});
	});

	it('should not validate the signature (i.e. allow any signer), if secret is not set', function () {
		var generator1 = new TokenGenerator('secret1');
		var generator2 = new TokenGenerator('secret2');

		var validator = new TokenValidator();

		validator.decode(generator1.createToken({uid: '1'}));
		validator.decode(generator2.createToken({uid: '1'}));
	});
});
