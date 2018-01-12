module.exports = function (wallaby) {
	return {
		files: [
			'index.ts',
			'lib/**/*.js',
			'lib/**/*.ts',
		],

		tests: [
			'test/**.spec.js',
			'test/**.spec.ts',
		],

		testFramework: 'mocha',

		env: {
			type: 'node',
			runner: 'node'
		}
	};
};
