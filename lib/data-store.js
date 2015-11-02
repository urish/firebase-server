/*
 * firebase-server - https://github.com/urish/firebase-server
 * License: MIT.
 * Copyright (C) 2015, James Talmage.
 */

/* eslint no-sync: 0 */

'use strict';

var firebaseCopy = require('firebase-copy');
var url = require('url');
var util = require('util');
var debug = require('debug')('firebase-server:data-store');
var Fireproof;
var ensureFireproof;

try {
	Fireproof = require('fireproof');
	Fireproof.bless(require('native-or-bluebird'));
	ensureFireproof = function () {};
	debug('Fireproof found: dataStore.ref() return values will be wrapped.');
} catch (e) {
	debug('Fireproof not found: dataStore.ref() return values will not be wrapped.');
	ensureFireproof = function (usage) {
		throw new Error('You must install Fireproof to use ' + usage + '. (`npm install --save fireproof`)');
	};
	Fireproof = function (obj) {
		return obj;
	};
}

var SyncSnapshot = require('./sync-snapshot');

module.exports = DataStore;

function DataStore(initialData) {
	if (!this instanceof DataStore) {
		return new DataStore(initialData);
	}
	this.Firebase = firebaseCopy();

	this.Firebase.goOffline();
	this.baseRef = new this.Firebase('ws://fakeserver.firebaseio.test');

	this.baseRef.set(initialData || null);
}

var DSp = DataStore.prototype;

function toRef(baseRef, ref) {
	var path = ref && url.parse(ref.toString()).path;
	if (path && path[0] === '/') {
		path = path.substring(1);
	}
	return path ? baseRef.child(path) : baseRef;
}

DSp.ref = function (ref) {
	return new Fireproof(toRef(this.baseRef, ref));
};

DSp.sync = function(ref) {
	return new SyncSnapshot(toRef(this.baseRef, ref));
};

DSp.getData = util.deprecate(
	function () {
		return this.sync().val();
	},
	'getData() is deprecated! Please use sync().val() instead'
);

DSp.getValue = util.deprecate(
	function (ref) {
		ensureFireproof('getValue()');
		return this.ref(ref).then(function(snap) {
			return snap.val();
		});
	},
	'getValue() is deprecated! Please use ref().then(snap => snap.val())'
);

DSp.exportData = util.deprecate(
	function (ref) {
		ensureFireproof('exportData()');
		return this.ref(ref).then(function(snap) {
			return snap.exportVal();
		});
	},
	'exportData() is deprecated! Please use ref().then(snap => snap.exportVal())'
);
