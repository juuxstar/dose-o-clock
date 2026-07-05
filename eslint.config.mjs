import lcbConfig from '@frontlobby/eslint-config-lcb';
import globals from 'globals';

export default [
	{
		ignores : [
			'dist/**',
			'dev-dist/**',
			'eslint.config.mjs',
			'node_modules/**',
			'coverage/**',
			'public/notification-events.js',
		],
	},
	...lcbConfig,
	{
		files           : [ '**/*.{js,mjs,ts,vue}' ],
		languageOptions : {
			parserOptions : {
				extraFileExtensions : [ '.vue' ],
				project         : './tsconfig.eslint.json',
				tsconfigRootDir : import.meta.dirname,
			},
			globals : {
				...globals.browser,
				...globals.node,
			},
		},
		rules : {
			'vue/component-definition-name-casing' : 'off',
		},
	},
	{
		files           : [ '**/*.test.ts' ],
		languageOptions : {
			globals : globals.vitest,
		},
	},
	{
		files           : [ 'worker/**/*.ts' ],
		languageOptions : {
			parserOptions : {
				project : './tsconfig.worker.json',
			},
		},
	},
	{
		files : [
			'src/**/*.vue',
			'src/main.ts',
		],
		rules : {
			'@typescript-eslint/naming-convention' : 'off',
		},
	},
	{
		files : [ 'vite.config.ts' ],
		rules : {
			'@typescript-eslint/naming-convention' : 'off',
			'quote-props'                          : 'off',
		},
	},
];
