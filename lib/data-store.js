/*
 * firebase-server - https://github.com/urish/firebase-server
 * License: MIT.
 * Copyright (C) 2015, James Talmage.
 */

'use strict';

var firebaseCopy = require('firebase-copy');
var Promise = require('native-or-bluebird');
var url = require('url');

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
	if (!path || path.length < 2){
		return this.baseRef;
	}
	return this.baseRef.child(path.substring(1));
};

DSp.getData = function (ref) {
	console.warn('FirebaseServer.getData() is deprecated! Please use FirebaseServer.getValue() instead'); // eslint-disable-line no-console
	var result = null;
	this.ref(ref).once('value', function (snap) {
		result = snap.val();
	});
	return result;
};

DSp.getSnap = function (ref) {
	ref = this.ref(ref);
	return new Promise(function (resolve) {
		ref.once('value', function (snap) {
			resolve(snap);
		});
	});
};

DSp.getValue = function (ref) {
	return this.getSnap(ref).then(function (snap) {
		return snap.val();
	});
};

DSp.exportData = function (ref) {
	return this.getSnap(ref).then(function (snap) {
		return snap.exportVal();
	});
};
