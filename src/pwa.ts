import { registerSW } from 'virtual:pwa-register';

export const updateServiceWorker = registerSW({ immediate : true });

const APP_VERSION_URL         = '/app-version.json';
const STARTUP_UPDATE_KEY      = 'dose-o-clock-startup-update-build';
const CURRENT_BUILD_TIMESTAMP = import.meta.env.VITE_BUILD_TIMESTAMP;

export type VersionUpdateStatus = 'available' | 'up-to-date' | 'unknown';

export interface VersionUpdateCheck {
	status: VersionUpdateStatus;
	latestBuildTimestamp?: string;
	latestVersion?: string;
}

export async function refreshPwa(): Promise<void> {
	if ('serviceWorker' in navigator) {
		const registration = await navigator.serviceWorker.getRegistration();

		if (registration && navigator.onLine) {
			await registration.update().catch(() => undefined);
		}

		await updateServiceWorker(true).catch(() => undefined);
	}

	window.location.reload();
}

export async function checkVersionUpdate(): Promise<VersionUpdateCheck> {
	const controller = new AbortController();
	const timeout    = window.setTimeout(() => controller.abort(), 4000);

	try {
		const response = await fetch(getAppVersionUrl(), {
			cache   : 'no-store',
			headers : { Accept : 'application/json' },
			signal  : controller.signal,
		});

		if (!response.ok) {
			return { status : 'unknown' };
		}

		const latest = await response.json() as AppVersionManifest;
		if (isNewerBuild(latest.buildTimestamp)) {
			return { status : 'available', latestBuildTimestamp : latest.buildTimestamp, latestVersion : latest.version };
		}

		return { status : 'up-to-date', latestBuildTimestamp : latest.buildTimestamp, latestVersion : latest.version };
	}
	catch {
		return { status : 'unknown' };
	}
	finally {
		window.clearTimeout(timeout);
	}
}

export function startVersionUpdateMonitor(): void {
	void refreshFromLatestVersionIfNeeded();
	window.addEventListener('online', () => void refreshFromLatestVersionIfNeeded());
}

async function refreshFromLatestVersionIfNeeded(): Promise<void> {
	if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
		return;
	}

	if (sessionStorage.getItem(STARTUP_UPDATE_KEY) === CURRENT_BUILD_TIMESTAMP) {
		return;
	}

	const updateCheck = await checkVersionUpdate();
	if (updateCheck.status === 'available') {
		sessionStorage.setItem(STARTUP_UPDATE_KEY, CURRENT_BUILD_TIMESTAMP);
		await refreshPwa();
	}
}

function getAppVersionUrl(): string {
	const url = new URL(APP_VERSION_URL, window.location.origin);
	url.searchParams.set('t', Date.now().toString());
	return url.toString();
}

function isNewerBuild(buildTimestamp: string | undefined): boolean {
	if (!buildTimestamp) {
		return false;
	}

	return new Date(buildTimestamp).getTime() > new Date(CURRENT_BUILD_TIMESTAMP).getTime();
}

interface AppVersionManifest {
	buildTimestamp?: string;
	version?: string;
}
