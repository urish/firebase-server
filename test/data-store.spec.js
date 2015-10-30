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

	it('snap() should return a snap asynchronously', function *() {
		store.ref().set({foo: 'bar'});
		assert.deepEqual(
			(yield store.snap()).val(),
			{foo: 'bar'}
		);
	});

	it('snapSync() should return a snap synchronously', () => {
		store.ref().set({foo: 'bar'});
		assert.deepEqual(
			store.snapSync().val(),
			{foo: 'bar'}
		);
	});

	it('val() should return snap.val() asynchronously', function *() {
		store.ref().set({foo: 'bar'});
		assert.deepEqual(
			yield store.val(),
			{foo: 'bar'}
		);
	});

	it('valSync() should return snap.val() synchronously', () => {
		store.ref().set({foo: 'bar'});
		assert.deepEqual(
			store.valSync(),
			{foo: 'bar'}
		);
	});

	it('exportVal() should return snap.exportVal() asynchronously', function *() {
		store.ref('foo').setWithPriority('bar', 3);
		assert.deepEqual(
			yield store.exportVal(),
			{
				foo: {
					'.value': 'bar',
					'.priority': 3
				}
			}
		);
	});

	it('exportValSync() should return snap.exportVal() synchronously', () => {
		store.ref('foo').setWithPriority('bar', 3);
		assert.deepEqual(
			store.exportValSync(),
			{
				foo: {
					'.value': 'bar',
					'.priority': 3
				}
			}
		);
	});

	it('getPriority() should return snap.getPriority() asynchronously', function *() {
		store.ref('foo').setWithPriority('bar', 3);
		assert.strictEqual(
			yield store.getPriority('foo'),
			3
		);
	});

	it('exists() / existsSync() should be proxied', function *() {
		store.ref().set({foo: 'bar'});
		assert.strictEqual(
			yield store.exists('foo'),
			true
		);
		assert.strictEqual(
			store.existsSync('baz'),
			false
		);
	});

	it('hasChildren() / hasChildrenSync() should be proxied', function *() {
		store.ref().set({foo: {bar: 'baz'}, quz: 3});
		assert.strictEqual(
			yield store.hasChildren('foo'),
			true
		);
		assert.strictEqual(
			store.hasChildrenSync('quz'),
			false
		);
	});

	it('data access methods (snap, snapSync, val, ...etc) should accept a path parameter', function *() {
		store.ref('foo/bar').setWithPriority('baz', 5);
		store.ref('foo/quz').setWithPriority('foo', 6);
		assert.deepEqual(
			(yield store.snap('foo/bar')).exportVal(),
			{
				'.value': 'baz',
				'.priority': 5
			}
		);

		assert.deepEqual(
			store.snapSync('foo/bar').exportVal(),
			{
				'.value': 'baz',
				'.priority': 5
			}
		);

		assert.strictEqual(yield store.val('foo/quz'), 'foo');
		assert.strictEqual(store.valSync('foo/quz'), 'foo');
	});
});
