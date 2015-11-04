/*
 * firebase-server - https://github.com/urish/firebase-server
 * License: MIT.
 * Copyright (C) 2015, James Talmage.
 */

'use strict';

/* eslint no-sync: 0 */

var assert = require('assert');
var DataStore = require('../lib/data-store');

describe('data-store', () => {
	var store;

	beforeEach(() => store = new DataStore());

	it('(yield ref()).val() should return snap.val() ', function *() {
		store.ref().set({foo: 'bar'});
		assert.deepEqual(
			(yield store.ref()).val(),
			{foo: 'bar'}
		);
	});

	it('sync().val() should return snap.val() synchronously', () => {
		store.ref().set({foo: 'bar'});
		assert.deepEqual(
			store.sync().val(),
			{foo: 'bar'}
		);
	});

	it('(yield ref()).exportVal() should return snap.exportVal()', function *() {
		store.ref('foo').setWithPriority('bar', 3);
		assert.deepEqual(
			(yield store.ref()).exportVal(),
			{
				foo: {
					'.value': 'bar',
					'.priority': 3
				}
			}
		);
	});

	it('sync().exportVal() should return snap.exportVal() synchronously', () => {
		store.ref('foo').setWithPriority('bar', 3);
		assert.deepEqual(
			store.sync().exportVal(),
			{
				foo: {
					'.value': 'bar',
					'.priority': 3
				}
			}
		);
	});
});
