<template>
	<div class="settings-page install-page u-grid u-gap-12 u-content-center">
		<div class="capability-status u-grid u-items-center u-gap-12 u-text-left" :class="{ 'capability-status--ready' : offlineReady }">
			<CheckCircle2 v-if="offlineReady" :size="28" aria-hidden="true" />
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
				class="primary-button primary-button--green u-flex u-items-center u-justify-center u-gap-8 u-width-100"
				type="button"
				:disabled="!canPromptInstall"
				@click="$emit('install')"
			>
				<Plus :size="20" />
				Add to Home Screen
			</button>
			<p v-if="canPromptInstall" class="u-margin-0">
				Use this to install Dose-o-clock as a standalone app.
			</p>
			<p v-else class="u-margin-0">
				Use your browser share menu, then choose Add to Home Screen.
			</p>
		</div>
	</div>
</template>

<script lang="ts">
import { CheckCircle2, Plus, XCircle }    from '@lucide/vue';
import { Component, Prop, toNative, Vue } from 'vue-facing-decorator';

/**
 * Shows offline and home-screen installation state.
 */
@Component({ components : { CheckCircle2, Plus, XCircle }, emits : [ 'install' ] })
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

	get homeScreenStatusLabel(): string {
		return this.isStandalone ? 'Added to Home Screen' : 'Not added to Home Screen';
	}

	get homeScreenStatusDescription(): string {
		return this.isStandalone ? 'Running as a standalone app.' : 'Use Add to Home Screen to enable app mode.';
	}

}

export default toNative(InstallPage);
</script>

<style scoped>
.install-page {
	min-height: 210px;
}

.capability-status {
	grid-template-columns: 32px 1fr;
	border-radius: 8px;
	background: var(--tertiary-grouped-bg);
	padding: 12px;
}

.capability-status svg {
	color: var(--red);
}

.capability-status--ready svg {
	color: var(--green);
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
</style>
