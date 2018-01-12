/* License: MIT.
 * Copyright (C) 2015, James Talmage.
 */

'use strict';

const assert = require('assert');
const { normalize, TokenValidator } = require('../lib/token-validator');
const TokenGenerator = require('firebase-token-generator');
const VERSION = 0;

describe('token-validator', () => {
	it('#decode should decode a valid token', () => {
		const generator = new TokenGenerator('mySecret');
		const validator = TokenValidator('mySecret', 100 * 1000);

		const token = generator.createToken(
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

	it('#decode should include token options (e.g. iat, notBefore, expires) in decoded token', () => {
		const generator = new TokenGenerator('someOtherSecret');
		const validator = TokenValidator('someOtherSecret', 250 * 1000);

		const token = generator.createToken(
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

	it('#normalize should convert `nbf` and `exp` to longer form names', () => {
		assert.deepEqual(
			normalize({
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

	it('#decode should throw if token has a bad signature', () => {
		const generator = new TokenGenerator('badSecret');
		const validator = TokenValidator('goodSecret');

		const token = generator.createToken(
			{uid: 'expiresTest', customProperty: 'bar'}
		);

		assert.throws(() => {
			validator.decode(token);
		});
	});

	it('should accept a custom clock function', () => {
		const generator = new TokenGenerator('mySecret');
		const token = generator.createToken({uid:'1'}, {iat: 100, notBefore: 200, expires: 300});

		let time;
		const validator = TokenValidator('mySecret', () => time * 1000);

		time = 150;
		assert.throws(() => {
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
		assert.throws(() => {
			validator.decode(token);
		});
	});

	it('#withTime should create a new token-validator with a different testable-clock', () => {
		const generator = new TokenGenerator('mySecret');
		const token = generator.createToken({uid:'1'}, {iat: 100, notBefore: 200, expires: 300});

		const validator = TokenValidator('mySecret');

		assert.throws(() => {
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

		assert.throws(() => {
			validator.withTime(350 * 1000).decode(token);
		});
	});

	it('should not validate the signature (i.e. allow any signer), if secret is not set', () => {
		const generator1 = new TokenGenerator('secret1');
		const generator2 = new TokenGenerator('secret2');

		const validator = TokenValidator();

		validator.decode(generator1.createToken({uid: '1'}));
		validator.decode(generator2.createToken({uid: '1'}));
	});
});
