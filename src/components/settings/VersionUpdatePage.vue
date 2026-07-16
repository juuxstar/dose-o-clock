<template>
	<div class="settings-page version-update-page u-grid u-gap-12">
		<div class="version-status u-grid u-items-center u-gap-12 u-text-left" :class="{ 'version-status--ready' : updateAvailable }">
			<Download v-if="updateAvailable" :size="28" aria-hidden="true" />
			<CheckCircle2 v-else-if="versionUpdateStatus === 'up-to-date'" :size="28" aria-hidden="true" />
			<RefreshCw v-else :size="28" aria-hidden="true" />
			<div>
				<strong>{{ statusLabel }}</strong>
				<p class="u-margin-0">
					{{ statusDescription }}
				</p>
			</div>
		</div>

		<button
			v-if="updateAvailable"
			class="primary-button primary-button--green u-flex u-items-center u-justify-center u-gap-8 u-width-100"
			type="button"
			:disabled="refreshingApp"
			@click="installVersionUpdate"
		>
			<Download :size="20" />
			{{ refreshingApp ? 'Installing Update' : 'Install Update' }}
		</button>

		<button
			v-else-if="!currentAndLatestMatch"
			class="secondary-button u-flex u-items-center u-justify-center u-gap-8 u-width-100"
			type="button"
			@click="refreshVersionUpdateStatus"
		>
			<RefreshCw :size="20" />
			Check Again
		</button>

		<div class="build-details u-grid u-gap-10">
			<div class="build-detail u-flex u-justify-between u-gap-12">
				<span>Current</span>
				<strong class="u-text-right">{{ currentVersionDetails }}</strong>
			</div>
			<div class="build-detail u-flex u-justify-between u-gap-12">
				<span>Latest</span>
				<strong class="u-text-right">{{ latestVersionDetails }}</strong>
			</div>
			<div v-if="isDevelopmentMode" class="build-detail u-flex u-justify-between u-gap-12">
				<span>Environment</span>
				<strong class="u-text-right">{{ appEnvironment }}</strong>
			</div>
		</div>

		<div class="release-history u-grid u-gap-10">
			<strong>What changed</strong>
			<div v-if="releaseHistory.length" class="release-history__list u-grid u-gap-12">
				<section v-for="release in releaseHistory" :key="release.version" class="release-entry u-grid u-gap-4">
					<header class="release-entry__header u-flex u-items-baseline u-justify-between u-gap-12">
						<strong>{{ release.version }}</strong>
						<span v-if="formatPublishedAt(release.publishedAt)">{{ formatPublishedAt(release.publishedAt) }}</span>
					</header>
					<ul v-if="release.changes?.length" class="release-entry__changes u-grid u-gap-4 u-margin-0">
						<li v-for="change in release.changes" :key="change">
							{{ change }}
						</li>
					</ul>
					<p v-else class="release-entry__empty u-margin-0">
						No summary recorded.
					</p>
				</section>
			</div>
			<p v-else class="release-entry__empty u-margin-0">
				No release summaries recorded yet.
			</p>
		</div>
	</div>
</template>

<script lang="ts">
import { CheckCircle2, Download, RefreshCw } from '@lucide/vue';
import { Component, Prop, toNative, Vue }    from 'vue-facing-decorator';

import { appEnvironment, isDevelopmentMode }   from '@/domain/AppEnvironment';
import { type AppRelease, loadReleaseHistory } from '@/domain/AppVersion';
import { checkVersionUpdate, refreshPwa, type VersionUpdateCheck, type VersionUpdateStatus } from '@/pwa';

/**
 * Shows app version status, update installation, and build metadata.
 */
@Component({ components : { CheckCircle2, Download, RefreshCw }, emits : [ 'interact', 'status-change' ] })
class VersionUpdatePage extends Vue {

	@Prop({ type : String, required : true })
	readonly initialVersionUpdateStatus!: VersionUpdateStatus;

	refreshingApp         = false;
	versionUpdateStatus   = this.initialVersionUpdateStatus;
	latestBuildTimestamp = '';
	latestVersion        = '';
	appEnvironment       = appEnvironment;
	isDevelopmentMode    = isDevelopmentMode;
	releaseHistory: AppRelease[] = [];

	get buildStamp(): string {
		return new Intl.DateTimeFormat(undefined, { dateStyle : 'medium', timeStyle : 'short' })
			.format(new Date(import.meta.env.VITE_BUILD_TIMESTAMP));
	}

	get currentVersion(): string {
		return import.meta.env.VITE_APP_VERSION;
	}

	get currentVersionDetails(): string {
		return `${this.currentVersion} - ${this.buildStamp}`;
	}

	get currentAndLatestMatch(): boolean {
		if (!this.latestVersion || !this.latestBuildTimestamp) {
			return false;
		}

		return this.currentVersion === this.latestVersion
			&& new Date(import.meta.env.VITE_BUILD_TIMESTAMP).getTime() === new Date(this.latestBuildTimestamp).getTime();
	}

	get latestBuildStamp(): string {
		if (!this.latestBuildTimestamp) {
			return 'Unknown';
		}

		return new Intl.DateTimeFormat(undefined, { dateStyle : 'medium', timeStyle : 'short' })
			.format(new Date(this.latestBuildTimestamp));
	}

	get updateAvailable(): boolean {
		return this.versionUpdateStatus === 'available';
	}

	get latestVersionLabel(): string {
		return this.latestVersion || 'Unknown';
	}

	get latestVersionDetails(): string {
		return `${this.latestVersionLabel} - ${this.latestBuildStamp}`;
	}

	get statusLabel(): string {
		if (this.updateAvailable) {
			return 'Update available';
		}
		if (this.versionUpdateStatus === 'up-to-date') {
			return 'Up-to-date';
		}
		return 'Update status unknown';
	}

	get statusDescription(): string {
		if (this.updateAvailable) {
			return 'Install the newest version and reload the app.';
		}
		if (this.versionUpdateStatus === 'up-to-date') {
			return 'This device is running the newest available build.';
		}
		return 'Check again when the device is online.';
	}

	mounted(): void {
		void this.refreshVersionUpdateStatus();
		void this.refreshReleaseHistory();
	}

	async installVersionUpdate(): Promise<void> {
		if (this.refreshingApp) {
			return;
		}

		if (!this.updateAvailable) {
			await this.refreshVersionUpdateStatus();
			return;
		}

		this.refreshingApp = true;
		this.$emit('interact');
		await refreshPwa();
	}

	async refreshVersionUpdateStatus(): Promise<void> {
		const updateCheck = await checkVersionUpdate();
		this.rememberLatestVersion(updateCheck);
		this.versionUpdateStatus = updateCheck.status;
		this.$emit('status-change', updateCheck.status);
	}

	rememberLatestVersion(updateCheck: VersionUpdateCheck): void {
		this.latestBuildTimestamp = updateCheck.latestBuildTimestamp ?? '';
		this.latestVersion        = updateCheck.latestVersion ?? '';
	}

	async refreshReleaseHistory(): Promise<void> {
		this.releaseHistory = await loadReleaseHistory();
	}

	formatPublishedAt(publishedAt: string | undefined): string {
		if (!publishedAt) {
			return '';
		}

		return new Intl.DateTimeFormat(undefined, { dateStyle : 'medium' })
			.format(new Date(publishedAt));
	}

}

export default toNative(VersionUpdatePage);
</script>

<style scoped>
.version-update-page {
	min-height: 300px;
	align-content: start;
}

.version-status {
	grid-template-columns: 32px 1fr;
	border-radius: var(--radius-control);
	background: var(--tertiary-grouped-bg);
	padding: 12px;
}

.version-status svg {
	color: var(--blue);
}

.version-status--ready svg {
	color: var(--green);
}

.version-status strong {
	display: block;
	margin-bottom: 3px;
}

.version-status p,
.build-detail span {
	color: var(--muted-text);
	font-size: var(--font-size-sm);
	line-height: 1.3;
}

.secondary-button {
	min-height: 52px;
	border-radius: var(--radius-control);
	background: var(--tertiary-grouped-bg);
	font-weight: 800;
}

.build-details {
	border-radius: var(--radius-control);
	background: var(--tertiary-grouped-bg);
	padding: 12px;
}

.release-history {
	border-radius: var(--radius-control);
	background: var(--tertiary-grouped-bg);
	padding: 12px;
}

.release-history > strong {
	display: block;
}

.release-entry {
	border-top: 1px solid var(--separator);
	padding-top: 10px;
}

.release-entry__header {
	min-width: 0;
}

.release-entry__header span,
.release-entry__empty {
	color: var(--muted-text);
	font-size: var(--font-size-sm);
	line-height: 1.3;
}

.release-entry__changes {
	padding-left: 18px;
	font-size: var(--font-size-sm);
	line-height: 1.35;
}

.build-detail {
	min-width: 0;
}

.build-detail strong {
	min-width: 0;
	overflow-wrap: anywhere;
}
</style>
