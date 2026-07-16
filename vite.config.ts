import { execSync }                 from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { networkInterfaces }        from 'node:os';
import { fileURLToPath, URL }       from 'node:url';

import vue                           from '@vitejs/plugin-vue';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA }                   from 'vite-plugin-pwa';

const localTlsCertificatePath = fileURLToPath(new URL('./tomas.houseoftovig.com.pem', import.meta.url));
const buildTimestamp          = new Date().toISOString();
const appVersion              = JSON.parse(readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8')).version as string;
const devOrigin               = process.env.VITE_DEV_ORIGIN;
const devServerPort           = 5175;
const devProxyPort            = Number(process.env.HOST_LAN_PORT ?? 8888);

export default defineConfig(({ command, mode }) => {
	const useLocalHttps       = command === 'serve' && mode === 'development';
	const appEnvironment      = command === 'serve' ? 'development' : 'production';
	const localTlsCertificate = useLocalHttps && existsSync(localTlsCertificatePath)
		? readFileSync(localTlsCertificatePath)
		: undefined;
	const localHttpsConfig = localTlsCertificate ? { key : localTlsCertificate, cert : localTlsCertificate } : undefined;

	return {
		define : {
			'import.meta.env.VITE_APP_ENV'         : JSON.stringify(appEnvironment),
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
		plugins : [
			vue(),
			appVersionManifestPlugin(),
			devNetworkUrlPlugin(devProxyPort, getDevNetworkProtocol(Boolean(localHttpsConfig))),
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
					importScripts    : [ 'notification-events.js' ],
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
			host       : '0.0.0.0',
			port       : devServerPort,
			strictPort : true,
			https      : localHttpsConfig,
			...(devOrigin ? { origin : devOrigin } : {}),
		},
		preview : {
			host : '0.0.0.0',
			port : devServerPort,
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

function devNetworkUrlPlugin(port: number, protocol: string): Plugin {
	return {
		name : 'dose-o-clock-dev-network-url',
		configureServer(server) {
			server.middlewares.use((request, response, next) => {
				if (request.url?.startsWith('/dev-network-url')) {
					response.setHeader('Cache-Control', 'no-store');
					response.setHeader('Content-Type', 'application/json');
					response.end(`${JSON.stringify({ url : getDevNetworkUrl(port, protocol) })}\n`);
					return;
				}

				next();
			});
		},
	};
}

function getAppVersionManifest(): string {
	return `${JSON.stringify({ version : appVersion, buildTimestamp })}\n`;
}

function getDevNetworkUrl(port: number, protocol: string): string {
	const host = getLocalNetworkAddress() ?? process.env.HOSTNAME ?? 'localhost';
	return `${protocol}://${host}:${port}/`;
}

function getDevNetworkProtocol(useHttps: boolean): string {
	if (devOrigin) {
		return new URL(devOrigin).protocol.replace(':', '');
	}

	return useHttps ? 'https' : 'http';
}

function getLocalNetworkAddress(): string | null {
	return getConfiguredLocalNetworkAddress()
		?? getDefaultRouteLocalNetworkAddress()
		?? getNetworkInterfaceLocalNetworkAddress();
}

function getConfiguredLocalNetworkAddress(): string | null {
	const value = process.env.HOST_LAN_IP || process.env.VITE_HOST_LAN_IP;
	return value && isLocalNetworkAddress(value) ? value : null;
}

function getDefaultRouteLocalNetworkAddress(): string | null {
	const defaultInterface = runShell('route get default 2>/dev/null | awk \'/interface:/{print $2; exit}\'');

	if (!defaultInterface) {
		return null;
	}

	const address = runShell(`ipconfig getifaddr ${defaultInterface} 2>/dev/null`);
	return address && isLocalNetworkAddress(address) ? address : null;
}

function getNetworkInterfaceLocalNetworkAddress(): string | null {
	const candidates: string[] = [];

	for (const [ name, addresses ] of Object.entries(networkInterfaces())) {
		for (const address of addresses ?? []) {
			if (address.family === 'IPv4' && !address.internal && isLocalNetworkAddress(address.address) && isPreferredLocalInterface(name)) {
				candidates.push(address.address);
			}
		}
	}

	return candidates[0] ?? null;
}

function runShell(command: string): string | null {
	try {
		return execSync(command, { encoding : 'utf8' }).trim() || null;
	}
	catch {
		return null;
	}
}

function isPreferredLocalInterface(name: string): boolean {
	return !/^(br-|bridge|docker|veth|utun|awdl|llw|lo|anpi|vmenet)/u.test(name);
}

function isLocalNetworkAddress(address: string): boolean {
	return /^10\./u.test(address)
		|| /^192\.168\.(?!64\.)/u.test(address)
		|| /^172\.(1[6-9]|2\d|3[01])\./u.test(address);
}
