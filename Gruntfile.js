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
				'lib/*.js',
				'test/*.js'
			]
		},
		mochacov: {
			all: ['test/*.spec.js'],
			test: {
				options: {
					reporter: 'spec'
				}
			},
			coverage: {
				options: {
					reporter: 'mocha-lcov-reporter',
					coveralls: true
				}
			}
		}
	});

	var testTasks = ['jshint', 'mochacov:test'];
	if (process.env.TRAVIS === 'true') {
		testTasks.push('mochacov:coverage');
	}
	grunt.registerTask('test', testTasks);

	grunt.registerTask('default', ['test']);
};
