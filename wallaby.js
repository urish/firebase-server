module.exports = function (wallaby) {
	return {
		files: [
			'index.ts',
			'lib/**/*.js',
			'lib/**/*.ts',
		],

		tests: [
			'test/**.spec.js',
		],

		testFramework: 'mocha',

		env: {
			type: 'node',
			runner: 'node'
		}
	};
};
