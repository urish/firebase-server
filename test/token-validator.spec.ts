/* License: MIT.
 * Copyright (C) 2015, James Talmage.
 */

import * as assert from 'assert';
import * as lolex from 'lolex';

import TokenGenerator = require('firebase-token-generator');

import { normalize, TokenValidator } from '../lib/token-validator';

const VERSION = 0;

describe('token-validator', () => {
	let clock: lolex.Clock;

	beforeEach(() => {
		clock = lolex.install();
	});

	afterEach(() => {
		clock.uninstall();
	});

	it('#decode should decode a valid token', () => {
		const generator = new TokenGenerator('mySecret');
		const validator = TokenValidator('mySecret');

		const token = generator.createToken(
			{ uid: 'encodeDecodeTest', customProperty: 'foo' },
			{ iat: 100 },
		);

		clock.setSystemTime(100 * 1000);

		assert.deepEqual(validator.decode(token), {
			d: { uid: 'encodeDecodeTest', customProperty: 'foo' },
			iat: 100,
			v: VERSION,
		});
	});

	it('#decode should include token options (e.g. iat, notBefore, expires) in decoded token', () => {
		const generator = new TokenGenerator('someOtherSecret');
		const validator = TokenValidator('someOtherSecret');

		const token = generator.createToken(
			{ uid: 'expiresTest', customProperty: 'bar' },
			{ notBefore: 100, iat: 200, expires: 300, admin: true, debug: true, simulate: true },
		);

		clock.setSystemTime(250 * 1000);

		assert.deepEqual(
			validator.decode(token), {
				admin: true,
				d: { uid: 'expiresTest', customProperty: 'bar' },
				debug: true,
				exp: 300,
				iat: 200,
				nbf: 100,
				simulate: true,
				v: VERSION,
			},
		);
	});

	it('#normalize should convert `nbf` and `exp` to longer form names', () => {
		assert.deepEqual(
			normalize({
				admin: true,
				d: { uid: 'normalizeTest', foo: 'bar' },
				debug: true,
				exp: 300,
				iat: 200,
				nbf: 100,
				simulate: true,
				v: VERSION,
			}), {
				admin: true,
				auth: { uid: 'normalizeTest', foo: 'bar' },
				debug: true,
				expires: 300,
				iat: 200,
				notBefore: 100,
				simulate: true,
			},
		);
	});

	it('#decode should throw if token has a bad signature', () => {
		const generator = new TokenGenerator('badSecret');
		const validator = TokenValidator('goodSecret');

		const token = generator.createToken(
			{ uid: 'expiresTest', customProperty: 'bar' },
		);

		assert.throws(() => {
			validator.decode(token);
		});
	});

	it('#decode should throw if the token has expired', () => {
		const generator = new TokenGenerator('mySecret');
		const validator = TokenValidator('mySecret');

		const token = generator.createToken(
			{ uid: 'encodeDecodeTest', customProperty: 'foo' },
			{ iat: 100 },
		);

		clock.setSystemTime(100000000);

		assert.throws(() => {
			validator.decode(token);
		});
	});

	it('should not validate the signature (i.e. allow any signer), if secret is not set', () => {
		const generator1 = new TokenGenerator('secret1');
		const generator2 = new TokenGenerator('secret2');

		const validator = TokenValidator();

		validator.decode(generator1.createToken({ uid: '1' }));
		validator.decode(generator2.createToken({ uid: '1' }));
	});
});
