/* License: MIT.
 * Copyright (C) 2013, 2014, Uri Shaked.
 */

'use strict';

module.exports = function (grunt) {
	require('load-grunt-tasks')(grunt);

	grunt.initConfig({
		jshint: {
			options: {
				jshintrc: '.jshintrc'
			},
			all: [
				'Gruntfile.js',
				'index.js',
				'test/*.js'
			]
		},
		mochacov: {
			options: {
				reporter: 'spec',
				coveralls: typeof process.env.COVERALLS_SERVICE_NAME !== 'undefined'
			},
			all: ['test/*.spec.js']
		}
	});

	grunt.registerTask('test', ['jshint', 'mochacov']);
	grunt.registerTask('default', ['test']);
};
