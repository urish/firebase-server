/*
 * firebase-server - https://github.com/urish/firebase-server
 * License: MIT.
 * Copyright (C) 2015, James Talmage.
 */

'use strict';

var firebaseCopy = require('firebase-copy');
var Promise = require('native-or-bluebird');

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

DataStore.prototype = {
	getData: function (ref) {
		console.warn('FirebaseServer.getData() is deprecated! Please use FirebaseServer.getValue() instead'); // eslint-disable-line no-console
		var result = null;
		this.baseRef.once('value', function (snap) {
			result = snap.val();
		});
		return result;
	},

	getSnap: function (ref) {
		return getSnap(ref || this.baseRef);
	},

	getValue: function (ref) {
		return this.getSnap(ref).then(function (snap) {
			return snap.val();
		});
	},

	exportData: function (ref) {
		return exportData(ref || this.baseRef);
	}
};

function getSnap(ref) {
	return new Promise(function (resolve) {
		ref.once('value', function (snap) {
			resolve(snap);
		});
	});
}

function exportData(ref) {
	return getSnap(ref).then(function (snap) {
		return snap.exportVal();
	});
}
