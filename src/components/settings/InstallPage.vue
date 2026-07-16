<template>
	<div class="settings-page install-page u-grid u-gap-12 u-content-center">
		<div
			class="capability-status u-grid u-items-center u-gap-12 u-text-left"
			:class="offlineStatusClasses"
		>
			<LoaderCircle v-if="!offlineCheckComplete" :size="28" aria-hidden="true" />
			<CheckCircle2 v-else-if="offlineReady" :size="28" aria-hidden="true" />
			<XCircle v-else :size="28" aria-hidden="true" />
			<div>
				<strong>{{ offlineStatusLabel }}</strong>
				<p class="u-margin-0">
					{{ offlineStatusDescription }}
				</p>
			</div>
		</div>
		<div class="capability-status u-grid u-items-center u-gap-12 u-text-left" :class="{ 'capability-status--ready' : isStandalone }">
			<CheckCircle2 v-if="isStandalone" :size="28" aria-hidden="true" />
			<XCircle v-else :size="28" aria-hidden="true" />
			<div>
				<strong>{{ homeScreenStatusLabel }}</strong>
				<p class="u-margin-0">
					{{ homeScreenStatusDescription }}
				</p>
			</div>
		</div>
		<div v-if="!isStandalone" class="install-actions u-grid u-gap-14 u-justify-items-center u-text-center">
			<button
				v-if="!showManualInstallSteps"
				class="primary-button primary-button--green u-flex u-items-center u-justify-center u-gap-8 u-width-100"
				type="button"
				@click="install"
			>
				<Plus :size="20" />
				Add to Home Screen
			</button>
			<div v-if="showManualInstallSteps" class="manual-install-card u-grid u-gap-12 u-text-left u-width-100">
				<p class="manual-install-note u-margin-0">
					This device cannot add Dose-o-clock to the Home Screen automatically, but you can add it with these steps.
				</p>
				<ol class="manual-install-steps u-grid u-gap-12">
					<li>
						<span>
							Tap the
							<span class="share-button-image u-grid u-place-center" aria-label="Share button">
								<Share :size="18" />
							</span>
							{{ shareButtonLabel }}.
						</span>
					</li>
					<li>
						Choose <span class="browser-action">View More</span> if needed.
					</li>
					<li>
						Choose
						<span class="browser-action browser-action--home-screen">
							<span class="browser-action__icon u-grid u-place-center">
								<Plus :size="15" />
							</span>
							Add to Home Screen
						</span>.
					</li>
				</ol>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { CheckCircle2, LoaderCircle, Plus, Share, XCircle } from '@lucide/vue';
import { Component, Prop, toNative, Vue }                   from 'vue-facing-decorator';

/**
 * Shows offline and home-screen installation state.
 */
@Component({ components : { CheckCircle2, LoaderCircle, Plus, Share, XCircle }, emits : [ 'install' ] })
class InstallPage extends Vue {

	@Prop({ type : Boolean, required : true })
	readonly canPromptInstall!: boolean;

	@Prop({ type : Boolean, required : true })
	readonly isStandalone!: boolean;

	@Prop({ type : Boolean, required : true })
	readonly offlineCheckComplete!: boolean;

	@Prop({ type : Boolean, required : true })
	readonly offlineReady!: boolean;

	@Prop({ type : String, required : true })
	readonly offlineStatusDetail!: string;

	showManualInstallSteps = false;

	get offlineStatusLabel(): string {
		if (!this.offlineCheckComplete) {
			return 'Checking offline capability';
		}
		return this.offlineReady ? 'Offline capable' : 'Offline unavailable';
	}

	get offlineStatusDescription(): string {
		if (!this.offlineCheckComplete) {
			return 'Checking for cached app files.';
		}
		if (this.offlineReady) {
			return 'Can launch without the server after first load.';
		}
		return this.offlineStatusDetail || 'Load the production app online once.';
	}

	get offlineStatusClasses(): string[] {
		if (!this.offlineCheckComplete) {
			return [ 'capability-status--checking' ];
		}
		return this.offlineReady ? [ 'capability-status--ready' ] : [];
	}

	get homeScreenStatusLabel(): string {
		return this.isStandalone ? 'Added to Home Screen' : 'Not added to Home Screen';
	}

	get homeScreenStatusDescription(): string {
		return this.isStandalone ? 'Running as a standalone app.' : 'Use Add to Home Screen to enable app mode.';
	}

	get shareButtonLabel(): string {
		if (this.browserName === 'Chrome') {
			return 'Share button in Chrome';
		}
		if (this.browserName === 'Safari') {
			return 'Share button in Safari';
		}
		return 'browser Share button';
	}

	get browserName(): BrowserName {
		const userAgent = navigator.userAgent;

		if (/CriOS/u.test(userAgent)) {
			return 'Chrome';
		}
		if (/Safari/u.test(userAgent) && !/FxiOS|EdgiOS|CriOS/u.test(userAgent)) {
			return 'Safari';
		}
		return 'Browser';
	}

	install(): void {
		this.showManualInstallSteps = !this.canPromptInstall;
		this.$emit('install');
	}

}

type BrowserName = 'Browser' | 'Chrome' | 'Safari';

export default toNative(InstallPage);
</script>

<style scoped>
.install-page {
	min-height: 210px;
}

.capability-status {
	grid-template-columns: 32px 1fr;
	border-radius: var(--radius-control);
	background: var(--tertiary-grouped-bg);
	padding: 12px;
}

.capability-status svg {
	color: var(--red);
}

.capability-status--ready svg {
	color: var(--green);
}

.capability-status--checking svg {
	animation: capability-status-spin 900ms linear infinite;
	color: var(--blue);
}

.capability-status strong {
	display: block;
	margin-bottom: 3px;
}

.capability-status p {
	color: var(--muted-text);
	font-size: var(--font-size-sm);
	line-height: 1.3;
}

.install-actions p {
	color: var(--muted-text);
	line-height: 1.35;
}

.manual-install-card {
	border-radius: var(--radius-control);
	background: var(--tertiary-grouped-bg);
	padding: 14px;
	color: var(--text);
	font-size: var(--font-size-title);
	line-height: 1.4;
}

.manual-install-note {
	color: var(--muted-text);
}

.manual-install-steps {
	margin: 0;
	padding-left: 24px;
}

.manual-install-steps li::marker {
	color: var(--muted-text);
	font-weight: 800;
}

.share-button-image {
	display: inline-grid;
	width: 30px;
	height: 30px;
	margin: 0 4px;
	border: 1px solid var(--separator);
	border-radius: var(--radius-control);
	background: var(--secondary-grouped-bg);
	color: var(--blue);
	vertical-align: middle;
}

.browser-action {
	display: inline-grid;
	min-height: 30px;
	align-items: center;
	border: 1px solid var(--separator);
	border-radius: var(--radius-control);
	background: var(--secondary-grouped-bg);
	padding: 3px 8px;
	font-weight: 700;
	vertical-align: middle;
}

.browser-action--home-screen {
	grid-template-columns: 24px auto;
	gap: 8px;
	padding-left: 4px;
}

.browser-action__icon {
	width: 24px;
	height: 24px;
	border-radius: 6px;
	background: var(--green);
	color: #ffffff;
}

@keyframes capability-status-spin {
	to {
		transform: rotate(360deg);
	}
}
</style>
