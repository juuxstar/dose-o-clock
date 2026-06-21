import { readFileSync }       from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

import vue              from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import { VitePWA }      from 'vite-plugin-pwa';

const localTlsCertificate = readFileSync(fileURLToPath(new URL('./tomas.houseoftovig.com.pem', import.meta.url)));
const buildTimestamp      = new Date().toISOString();

export default defineConfig({
	define : {
		'import.meta.env.VITE_BUILD_TIMESTAMP' : JSON.stringify(buildTimestamp),
	},
	esbuild : {
		tsconfigRaw : {
			compilerOptions : {
				experimentalDecorators  : true,
				useDefineForClassFields : false,
			},
		},
	},
	plugins : [
		vue(),
		VitePWA({
			cleanupOutdatedCaches : true,
			injectRegister        : false,
			registerType          : 'autoUpdate',
			includeAssets         : [ 'icons/icon.svg' ],
			manifest              : {
				name               : 'Dose-o-clock',
				'short_name'       : 'Dose-o-clock',
				description        : 'A local-only dosage timer with a dot-ring clock.',
				display            : 'standalone',
				orientation        : 'portrait',
				'start_url'        : '/',
				scope              : '/',
				'background_color' : '#f2f2f7',
				'theme_color'      : '#f2f2f7',
				categories         : [ 'health', 'fitness' ],
				icons              : [
					{
						src     : '/icons/icon.svg',
						sizes   : 'any',
						type    : 'image/svg+xml',
						purpose : 'any maskable',
					},
				],
			},
			workbox : {
				globPatterns     : [ '**/*.{js,css,html,svg,png,ico}' ],
				navigateFallback : '/index.html',
				skipWaiting      : true,
				clientsClaim     : true,
			},
			devOptions : {
				enabled : false,
			},
		}),
	],
	resolve : {
		alias : {
			'@' : fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
	server : {
		host  : '0.0.0.0',
		port  : 5175,
		https : {
			key  : localTlsCertificate,
			cert : localTlsCertificate,
		},
	},
	preview : {
		host  : '0.0.0.0',
		port  : 5175,
		https : {
			key  : localTlsCertificate,
			cert : localTlsCertificate,
		},
	},
	test : {
		environment : 'jsdom',
		globals     : true,
	},
});
