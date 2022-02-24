module.exports = {
	env: {
		commonjs: true,
		es2021: true,
		node: true,
	},
	plugins: [
		'@typescript-eslint'
	],
	ignorePatterns: ['node_modules/', '*.js', '*.js.map'],
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended'
	],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		sourceType: 'module'
	},
	rules: {
		'@typescript-eslint/adjacent-overload-signatures': 'error',
		'@typescript-eslint/array-type': ['error', {
			default: 'array-simple'
		}],
		"@typescript-eslint/await-thenable": "error",
		'@typescript-eslint/ban-ts-comment': ['error', 'allow-with-description'],
		"@typescript-eslint/ban-types": "error",
		"@typescript-eslint/consistent-indexed-object-style": [
			"error",
			"index-signature"
		],
		"@typescript-eslint/consistent-type-definitions": ["error", "interface"],
		'@typescript-eslint/consistent-type-exports': 'error',
		'@typescript-eslint/consistent-type-imports': ['error', {
			prefer: 'type-imports',
			disallowTypeAnnotations: true,
		}],
        "@typescript-eslint/explicit-member-accessibility": [
			'error',
			{
				accessibility: "explicit",
			}
		],
		"@typescript-eslint/no-base-to-string": "error",
		"@typescript-eslint/no-confusing-non-null-assertion": "error",
		"@typescript-eslint/no-confusing-void-expression": [
			"error",
			{ "ignoreArrowShorthand": true },
			{ "ignoreVoidOperator": true }
		],
		"@typescript-eslint/no-empty-interface": [
			"error",
			{
			  "allowSingleExtends": false
			}
		],
		"@typescript-eslint/no-explicit-any": "error",
		"@typescript-eslint/no-extra-non-null-assertion": "error",
		"@typescript-eslint/no-floating-promises": "error",
		"@typescript-eslint/no-for-in-array": "error",
		"@typescript-eslint/no-inferrable-types": "error",
		"@typescript-eslint/no-extraneous-class": "error",
		"@typescript-eslint/no-invalid-void-type": "error",
		"@typescript-eslint/no-meaningless-void-operator": "error",
		"@typescript-eslint/no-misused-new": "error",
		"@typescript-eslint/no-misused-promises": [
			"error",
			{
				"checksVoidReturn": true,
			  "checksConditionals": true
			}
		  ],
		"@typescript-eslint/no-namespace": ["error", { "allowDeclarations": false, "allowDefinitionFiles": true }],
		"@typescript-eslint/no-non-null-asserted-nullish-coalescing": "error",
		"@typescript-eslint/no-non-null-asserted-optional-chain": "error",
		"@typescript-eslint/no-parameter-properties": "error",
		"@typescript-eslint/no-require-imports": "error",
		"@typescript-eslint/no-this-alias": [
			"error",
			{
			  "allowDestructuring": false,
			  "allowedNames": []
			}
		  ],
		"@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
		"@typescript-eslint/no-unnecessary-condition": "error",
		"@typescript-eslint/no-unnecessary-qualifier": "error",
		"@typescript-eslint/no-unnecessary-type-arguments": "error",
		"@typescript-eslint/no-unnecessary-type-assertion": "error",
		"@typescript-eslint/no-unnecessary-type-constraint": "error",
		"@typescript-eslint/no-unsafe-argument": "error",
		"@typescript-eslint/no-unsafe-assignment": "error",
		"@typescript-eslint/no-unsafe-call": "error",
		"@typescript-eslint/no-unsafe-member-access": "error",
		"@typescript-eslint/no-unsafe-return": "error",
		"@typescript-eslint/no-var-requires": "error",
		"@typescript-eslint/non-nullable-type-assertion-style": "error",
		"@typescript-eslint/prefer-for-of": "error",
		"@typescript-eslint/prefer-function-type": "error",
		"@typescript-eslint/prefer-includes": "error",
		"@typescript-eslint/prefer-ts-expect-error": "error",
		"@typescript-eslint/prefer-return-this-type": "error",
		"@typescript-eslint/prefer-reduce-type-parameter": "error",
		"@typescript-eslint/prefer-readonly-parameter-types": "error",
		"@typescript-eslint/prefer-regexp-exec": "error",
		"@typescript-eslint/prefer-readonly": "error",
		"@typescript-eslint/require-array-sort-compare": "error",
		"@typescript-eslint/unified-signatures": "error",
		"@typescript-eslint/unbound-method": [
			"error",
			{
			  "ignoreStatic": true
			}
		],
		"@typescript-eslint/type-annotation-spacing": ["error", { "before": true, "after": true }],
		"@typescript-eslint/switch-exhaustiveness-check": "error",
		"@typescript-eslint/sort-type-union-intersection-members": "error",
		"@typescript-eslint/restrict-template-expressions": "error",
		'@typescript-eslint/restrict-plus-operands': ["error", { "checkCompoundAssignments": true }],
		"@typescript-eslint/asd": "error",
		"@typescript-eslint/asd": "error",
		"@typescript-eslint/asd": "error",
		"@typescript-eslint/asd": "error",
		"@typescript-eslint/asd": "error",
		"@typescript-eslint/asd": "error",
		"@typescript-eslint/asd": "error",
		"@typescript-eslint/asd": "error",
		"@typescript-eslint/asd": "error",
	},
};