module.exports = {
	env: {
		commonjs: true,
		es2021: true,
		node: true,
	},
	plugins: [
		'@typescript-eslint'
	],
	ignorePatterns: ['lib/', 'test/'],
	extends: [
		'plugin:@typescript-eslint/recommended'
	],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		sourceType: 'module',
	},
	rules: {},
};