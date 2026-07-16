import { loadString, saveString } from '@/store/storage';

const releaseNotesUrl = '/app-release-notes.json';

export const currentAppVersion = import.meta.env.VITE_APP_VERSION;

export function getVersionNotice(): VersionNotice {
	const lastSeenBuild   = loadString('lastSeenBuild');
	const previousVersion = loadString('lastSeenVersion');

	rememberCurrentVersion();

	return {
		show           : Boolean(lastSeenBuild && lastSeenBuild !== import.meta.env.VITE_BUILD_TIMESTAMP),
		previousVersion,
		currentVersion : currentAppVersion,
	};
}

export function rememberCurrentVersion(): void {
	saveString('lastSeenBuild', import.meta.env.VITE_BUILD_TIMESTAMP);
	saveString('lastSeenVersion', currentAppVersion);
}

export async function loadReleaseChanges(previousVersion: string, currentVersion = currentAppVersion): Promise<string[]> {
	const releases = await loadReleaseHistory();
	return getReleaseChangesSinceVersion(releases, previousVersion, currentVersion);
}

export async function loadReleaseHistory(): Promise<AppRelease[]> {
	try {
		const response = await fetch(releaseNotesUrl, { cache : 'no-store', headers : { Accept : 'application/json' } });

		if (!response.ok) {
			return [];
		}

		const manifest = await response.json() as AppReleaseNotesManifest;
		return (manifest.releases ?? [])
			.filter(release => release.version)
			.sort((first, second) => compareVersions(second.version, first.version));
	}
	catch {
		return [];
	}
}

export interface VersionNotice {
	show: boolean;
	previousVersion: string;
	currentVersion: string;
}

export interface AppRelease {
	version?: string;
	publishedAt?: string;
	changes?: string[];
}

interface AppReleaseNotesManifest {
	releases?: AppRelease[];
}

function getReleaseChangesSinceVersion(releases: AppRelease[], previousVersion: string, currentVersion: string): string[] {
	if (!previousVersion) {
		return releases
			.filter(release => release.version === currentVersion)
			.flatMap(release => release.changes ?? [])
			.filter(Boolean);
	}

	return releases
		.filter(release => isVersionAfter(release.version, previousVersion) && !isVersionAfter(release.version, currentVersion))
		.sort((first, second) => compareVersions(first.version, second.version))
		.flatMap(release => release.changes ?? [])
		.filter(Boolean);
}

function isVersionAfter(candidate: string | undefined, reference: string): boolean {
	if (!candidate || !reference) {
		return candidate === reference;
	}

	return compareVersions(candidate, reference) > 0;
}

function compareVersions(first: string | undefined, second: string | undefined): number {
	const firstParts  = parseVersion(first);
	const secondParts = parseVersion(second);

	for (let index = 0; index < firstParts.length; index += 1) {
		const delta = firstParts[index] - secondParts[index];
		if (delta !== 0) {
			return delta;
		}
	}

	return 0;
}

function parseVersion(version: string | undefined): number[] {
	return (version ?? '')
		.replace(/^v/u, '')
		.split('.')
		.slice(0, 3)
		.map(part => Number.parseInt(part, 10) || 0)
		.concat([ 0, 0, 0 ])
		.slice(0, 3);
}
