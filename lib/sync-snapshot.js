'use strict';

module.exports = SyncSnapshot;

function SyncSnapshot(ref) {
	if (!this instanceof SyncSnapshot) {
		return new SyncSnapshot(ref);
	}
	this._snap = null;
	this._err = null;
	ref.once(
		'value',
		function (snap) {
			this._snap  = snap;
		},
		function (err) {
			this._err = err;
		},
		this
	);
}

function makeMethod(methodName) {
	var prefix = 'SyncSnapshot.' + methodName + ' ';
	SyncSnapshot.prototype[methodName] = function() {
		if (this._err) {
			throw new Error(prefix + 'resolved with error: ', this._err);
		}
		if (!this._snap) {
			throw new Error(prefix + 'called with ref that did not resolve synchronously.');
		}
		return this._snap[methodName].apply(this._snap, arguments);
	};
}

['exists', 'val', 'child', 'forEach', 'hasChild', 'hasChildren',
	'key', 'name','numChildren', 'ref', 'getPriority', 'exportVal'
].forEach(makeMethod);
