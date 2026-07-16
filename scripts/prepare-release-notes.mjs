import { execFileSync }                     from 'node:child_process';
import { readFileSync, writeFileSync }      from 'node:fs';
import { resolve }                          from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface }                  from 'node:readline/promises';

const manifestPath    = resolve('public/app-release-notes.json');
const packagePath     = resolve('package.json');
const maxReleaseNotes = 3;
const manifest        = JSON.parse(readFileSync(manifestPath, 'utf8'));
const packageJson     = JSON.parse(readFileSync(packagePath, 'utf8'));
const currentVersion  = packageJson.version;
const nextVersion     = getNextPatchVersion(currentVersion);
const existingRelease = manifest.releases?.find(release => release.version === nextVersion);

if (existingRelease?.changes?.length) {
	console.log(`Release notes already exist for ${nextVersion}.`);
	process.exit(0);
}

const suggestedChanges = getSuggestedChanges(manifest.latest);

if (!suggestedChanges.length) {
	console.log(`No release notes found for ${nextVersion}, and there are no committed changes to summarize.`);
	console.log('Add release notes manually before publishing if this release should mention user-facing changes.');
	process.exit(1);
}

void main();

async function main() {
	console.log(`No release notes found for ${nextVersion}.`);
	console.log('Suggested notes from changes since the last published version:');
	for (const change of suggestedChanges) {
		console.log(`- ${change}`);
	}

	if (!input.isTTY || !output.isTTY) {
		console.log('Run this command in an interactive terminal to accept the suggested notes.');
		process.exit(1);
	}

	const answer = await ask(`Add these notes for ${nextVersion}? [y/N] `);
	if (!/^y(?:es)?$/iu.test(answer.trim())) {
		console.log('Release notes were not changed.');
		process.exit(1);
	}

	const release = {
		version     : nextVersion,
		publishedAt : new Date().toISOString(),
		commit      : runGit([ 'rev-parse', 'HEAD' ]),
		changes     : suggestedChanges,
	};
	const releases     = [ release, ...(manifest.releases ?? []).filter(candidate => candidate.version !== nextVersion) ];
	const nextManifest = { latest : release, releases };

	writeFileSync(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`);
	console.log(`Added release notes for ${nextVersion}.`);
}

async function ask(question) {
	const terminal = createInterface({ input, output });

	try {
		return await terminal.question(question);
	}
	finally {
		terminal.close();
	}
}

function getSuggestedChanges(latestRelease) {
	const commits = getCommitSubjects(latestRelease).filter(subject => subject !== 'chore: bump app version');

	return commits.length ? commits.map(toReleaseNote).slice(0, maxReleaseNotes) : [];
}

function getCommitSubjects(latestRelease) {
	let args = [ 'log', '--format=%s', '-10' ];

	if (latestRelease?.commit) {
		args = [ 'log', '--format=%s', `${latestRelease.commit}..HEAD` ];
	}
	else if (latestRelease?.publishedAt) {
		args = [ 'log', '--format=%s', `--since=${latestRelease.publishedAt}` ];
	}

	try {
		return runGit(args).split('\n').map(line => line.trim()).filter(Boolean);
	}
	catch {
		return [];
	}
}

function getNextPatchVersion(version) {
	const [ major, minor, patch ] = parseVersion(version);
	return `${major}.${minor}.${patch + 1}`;
}

function parseVersion(version) {
	return version
		.replace(/^v/u, '')
		.split('.')
		.slice(0, 3)
		.map(part => Number.parseInt(part, 10) || 0)
		.concat([ 0, 0, 0 ])
		.slice(0, 3);
}

function toReleaseNote(subject) {
	const trimmed = subject.trim().replace(/[.!?]+$/u, '');
	return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}.`;
}

function runGit(args) {
	return execFileSync('git', args, { encoding : 'utf8' }).trim();
}
