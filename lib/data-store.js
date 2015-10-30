/*
 * firebase-server - https://github.com/urish/firebase-server
 * License: MIT.
 * Copyright (C) 2015, James Talmage.
 */

'use strict';

var firebaseCopy = require('firebase-copy');
var Promise = require('native-or-bluebird');
var url = require('url');
var util = require('util');

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

DSp.ref = function (ref) {
	var path = ref && url.parse(ref.toString()).path;
	if (path && path[0] === '/') {
		path = path.substring(1);
	}
	return path ? this.baseRef.child(path) : this.baseRef;
};

DSp.getSnap = DSp.snap = async();
DSp.getSnapSync = DSp.snapSync = sync();

DSp.getValue = DSp.val = async('val');
DSp.getValueSync = DSp.valSync = sync('val');
DSp.getData = util.deprecate(
	DSp.getValueSync,
	'FirebaseServer.getData() is deprecated! Please use FirebaseServer.valSync() instead'
);

DSp.getPriority = async('getPriority');
DSp.getPrioritySync = sync('getPriority');

DSp.exportData = DSp.exportVal = async('exportVal');
DSp.exportDataSync = DSp.exportValSync = sync('exportVal');

DSp.exists = async('exists');
DSp.existsSync = sync('exists');

DSp.hasChildren = async('hasChildren');
DSp.hasChildrenSync = sync('hasChildren');

DSp.numChildren = async('numChildren');
DSp.numChildrenSync = sync('numChildrenSync');

function sync(adapt) {
	adapt = createAdapter(adapt);
	return function (ref) {
		var result;
		this.ref(ref).once('value', function (snap) {
			result = adapt(snap);
		});
		return result;
	};
}

function async(adapt) {
	adapt = createAdapter(adapt);
	return function (ref) {
		ref = this.ref(ref);
		return new Promise(function (resolve, reject) {
			ref.once('value', function (snap) {
				resolve(adapt(snap));
			}, reject);
		});
	};
}

function createAdapter(adapt) {
	if (!adapt) {
		return identity;
	}
	if (typeof adapt === 'function') {
		return adapt;
	}
	if (typeof adapt === 'string') {
		return exec(adapt);
	}
}

function exec(methodName) {
	return function(snap) {
		return snap[methodName]();
	};
}

function identity(snap) {
	return snap;
}
