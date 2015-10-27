/*
 * firebase-server - https://github.com/urish/firebase-server
 * License: MIT.
 * Copyright (C) 2015, James Talmage.
 */

'use strict';

module.exports = function normalizePath(fullPath) {
	var path = fullPath;
	var isPriorityPath = /\/?\.priority$/.test(path);
	if (isPriorityPath) {
		path = path.replace(/\/?\.priority$/, '');
	}
	return {
		isPriorityPath: isPriorityPath,
		path: path,
		fullPath: fullPath
	};
};
