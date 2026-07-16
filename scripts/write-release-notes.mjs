import { execFileSync }     from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const packageJsonPath  = resolve('package.json');
const eventPath        = process.env.GITHUB_EVENT_PATH;
const outputPath       = resolve('public/app-release-notes.json');
const maxReleaseNotes  = 3;
const packageJson      = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const version          = packageJson.version;
const existingManifest = readExistingManifest();
const existingRelease  = existingManifest.releases.find(candidate => candidate.version === version);
const changes          = existingRelease?.changes?.length ? existingRelease.changes : getReleaseChanges();
const commit           = process.env.GITHUB_SHA ?? runGit([ 'rev-parse', 'HEAD' ]);

const release  = { version, publishedAt : new Date().toISOString(), commit, changes };
const releases = [ release, ...existingManifest.releases.filter(candidate => candidate.version !== version) ];
const manifest = { latest : release, releases };

mkdirSync(dirname(outputPath), { recursive : true });
writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);

function readExistingManifest() {
	if (!existsSync(outputPath)) {
		return { releases : [] };
	}

	try {
		const parsed = JSON.parse(readFileSync(outputPath, 'utf8'));
		return { releases : Array.isArray(parsed.releases) ? parsed.releases : [] };
	}
	catch {
		return { releases : [] };
	}
}

function getReleaseChanges() {
	const messages = getCommitMessages()
		.map(message => message.trim())
		.filter(Boolean)
		.filter(message => message !== 'chore: bump app version');

	return messages.length ? messages.slice(0, maxReleaseNotes) : [ 'Maintenance and polish updates.' ];
}

function getCommitMessages() {
	const event  = readGithubEvent();
	const before = normalizeSha(event?.before);
	const after  = normalizeSha(event?.after ?? process.env.GITHUB_SHA);
	const range  = before && after ? `${before}..${after}` : '-1';

	try {
		return runGit([ 'log', '--format=%s', range ]).split('\n');
	}
	catch {
		return runGit([ 'log', '-1', '--format=%s' ]).split('\n');
	}
}

function readGithubEvent() {
	if (!eventPath || !existsSync(eventPath)) {
		return null;
	}

	try {
		return JSON.parse(readFileSync(eventPath, 'utf8'));
	}
	catch {
		return null;
	}
}

function normalizeSha(value) {
	return typeof value === 'string' && !/^0+$/u.test(value) ? value : null;
}

function runGit(args) {
	return execFileSync('git', args, { encoding : 'utf8' }).trim();
}
