import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, URL }       from 'node:url';

import vue                           from '@vitejs/plugin-vue';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA }                   from 'vite-plugin-pwa';

import { cloudflare } from "@cloudflare/vite-plugin";

const localTlsCertificatePath = fileURLToPath(new URL('./tomas.houseoftovig.com.pem', import.meta.url));
const buildTimestamp          = new Date().toISOString();
const appVersion              = JSON.parse(readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8')).version as string;

export default defineConfig(({ command, mode }) => {
	const useLocalHttps       = command === 'serve' && mode === 'development';
	const localTlsCertificate = useLocalHttps && existsSync(localTlsCertificatePath)
		? readFileSync(localTlsCertificatePath)
		: undefined;
	const localHttpsConfig = localTlsCertificate ? { key : localTlsCertificate, cert : localTlsCertificate } : undefined;

	return {
		define : {
			'import.meta.env.VITE_APP_VERSION'     : JSON.stringify(appVersion),
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
		plugins : [vue(), appVersionManifestPlugin(), VitePWA({
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
                importScripts    : [ 'notification-events.js' ],
                navigateFallback : '/index.html',
                skipWaiting      : true,
                clientsClaim     : true,
            },
            devOptions : {
                enabled : false,
            },
        }), cloudflare()],
		resolve : {
			alias : {
				'@' : fileURLToPath(new URL('./src', import.meta.url)),
			},
		},
		server : {
			host  : '0.0.0.0',
			port  : 5175,
			https : localHttpsConfig,
		},
		preview : {
			host : '0.0.0.0',
			port : 5175,
		},
		test : {
			environment : 'jsdom',
			globals     : true,
		},
	};
});

function appVersionManifestPlugin(): Plugin {
	return {
		name : 'dose-o-clock-app-version-manifest',
		configureServer(server) {
			server.middlewares.use((request, response, next) => {
				if (request.url?.startsWith('/app-version.json')) {
					response.setHeader('Cache-Control', 'no-store');
					response.setHeader('Content-Type', 'application/json');
					response.end(getAppVersionManifest());
					return;
				}

				next();
			});
		},
		generateBundle() {
			this.emitFile({ type : 'asset', fileName : 'app-version.json', source : getAppVersionManifest() });
		},
	};
}

function getAppVersionManifest(): string {
	return `${JSON.stringify({ version : appVersion, buildTimestamp })}\n`;
}