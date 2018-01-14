module.exports = function (wallaby) {
	return {
		files: [
			'index.ts',
			'lib/**/*.ts',
		],

		tests: [
			'test/**.spec.ts',
		],

		testFramework: 'mocha',

		env: {
			type: 'node',
			runner: 'node'
		}
	};
};
