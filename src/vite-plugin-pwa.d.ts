/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
	readonly VITE_APP_VERSION: string;
	readonly VITE_BUILD_TIMESTAMP: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
