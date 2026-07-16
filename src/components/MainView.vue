<template>
	<main class="app-shell u-flex u-flex-column u-items-center" :class="timerPositionClass">
		<div v-if="versionNoticeOpen" class="version-notice u-flex u-items-start u-justify-between u-gap-12" role="status">
			<div class="version-notice__copy u-grid u-gap-2">
				<strong>Updated to {{ currentVersion }}</strong>
				<span>{{ versionNoticeSummary }}</span>
				<ul v-if="releaseChanges.length" class="version-notice__changes u-grid u-gap-4">
					<li v-for="change in releaseChanges" :key="change">
						{{ change }}
					</li>
				</ul>
			</div>
			<button
				class="version-notice__close u-grid u-place-center"
				type="button"
				aria-label="Dismiss update notice"
				@click="dismissVersionNotice"
			>
				<X :size="18" />
			</button>
		</div>

		<section class="timer-stage u-grid u-place-center u-width-100">
			<RingTimer
				:elapsed-seconds="store.visualElapsedSeconds.value"
				:duration-seconds="store.activeSession.value?.durationSeconds"
				:ring-shape="store.timerRingShape.value"
			/>
		</section>

		<nav class="bottom-actions u-grid u-justify-between u-gap-12" aria-label="Timer actions">
			<button
				class="action-button action-button--gray u-grid u-place-center"
				type="button"
				aria-label="Settings"
				@click="openPanel('settings')"
			>
				<Settings :size="30" />
			</button>
			<button
				class="action-button action-button--blue u-grid u-place-center"
				type="button"
				aria-label="History"
				@click="openPanel('history')"
			>
				<List :size="30" />
			</button>
			<button
				class="action-button action-button--green u-grid u-place-center"
				type="button"
				aria-label="New session"
				@click="openPanel('new')"
			>
				<Plus :size="34" />
			</button>
		</nav>

		<NewSessionPanel :open="openPanelName === 'new'" @close="closePanel" @interact="resetAutoClose" />
		<HistoryPanel :open="openPanelName === 'history'" @close="closePanel" @interact="resetAutoClose" />
		<SettingsPanel
			:initial-page="settingsInitialPage"
			:initial-setup-mode="settingsSetupMode"
			:open="openPanelName === 'settings'"
			@close="closePanel"
			@interact="resetAutoClose"
			@setup-mode-change="setSettingsSetupMode"
		/>
		<PanelShell :open="onboardingOpen" @close="completeOnboarding" @interact="resetAutoClose">
			<div class="panel-content">
				<GettingStartedGuide
					@skip="completeOnboarding"
					@start="startOnboarding"
				/>
			</div>
		</PanelShell>
	</main>
</template>

<script lang="ts">
import { List, Plus, Settings, X }  from '@lucide/vue';
import { markRaw }                  from 'vue';
import { Component, toNative, Vue } from 'vue-facing-decorator';

import HistoryPanel          from '@/components/HistoryPanel.vue';
import NewSessionPanel       from '@/components/NewSessionPanel.vue';
import SettingsPanel         from '@/components/settings/SettingsPanel.vue';
import GettingStartedGuide   from '@/components/widgets/GettingStartedGuide.vue';
import PanelShell            from '@/components/widgets/PanelShell.vue';
import RingTimer             from '@/components/widgets/RingTimer.vue';
import { isDevelopmentMode } from '@/domain/AppEnvironment';
import { currentAppVersion, getVersionNotice, loadReleaseChanges, rememberCurrentVersion } from '@/domain/AppVersion';
import { useTimerStore }     from '@/store/useTimerStore';

const onboardingCompleteKey = 'dose-o-clock.onboarding-complete';

/**
 * Coordinates the main timer view, persistent ticking, and temporary panels.
 */
@Component({
	components : { GettingStartedGuide, HistoryPanel, List, NewSessionPanel, PanelShell, Plus, RingTimer, Settings, SettingsPanel, X },
})
class MainView extends Vue {

	store              = markRaw(useTimerStore());
	openPanelName: PanelName | null = null;
	settingsInitialPage: SettingsInitialPage | null = null;
	settingsSetupMode  = false;
	onboardingOpen     = false;
	versionNoticeOpen  = false;
	previousVersion    = '';
	releaseChanges: string[] = [];
	tickInterval: number | undefined;
	autoCloseTimeout: number | undefined;

	get currentVersion(): string {
		return currentAppVersion;
	}

	get versionNoticeSummary(): string {
		return this.releaseChanges.length
			? 'Here is what changed since your last version.'
			: 'Things may look or behave a little differently.';
	}

	get timerPositionClass(): string {
		return `timer-position--${this.store.timerPosition.value}`;
	}

	mounted(): void {
		this.store.tick();
		this.tickInterval      = window.setInterval(() => this.store.tick(), 1000);
		this.onboardingOpen    = localStorage.getItem(onboardingCompleteKey) !== 'true';
		this.versionNoticeOpen = this.shouldShowVersionNotice();

		if (this.versionNoticeOpen) {
			void this.loadReleaseNotes();
		}
	}

	beforeUnmount(): void {
		window.clearInterval(this.tickInterval);
		window.clearTimeout(this.autoCloseTimeout);
	}

	openPanel(panel: PanelName): void {
		if (panel === 'settings') {
			this.settingsInitialPage = null;
			this.settingsSetupMode   = false;
		}

		this.openPanelName = panel;
		this.resetAutoClose();
	}

	closePanel(): void {
		this.openPanelName = null;
		if (this.onboardingOpen) {
			localStorage.setItem(onboardingCompleteKey, 'true');
		}
		this.onboardingOpen    = false;
		this.settingsSetupMode = false;
		window.clearTimeout(this.autoCloseTimeout);
	}

	resetAutoClose(): void {
		window.clearTimeout(this.autoCloseTimeout);

		if (!isDevelopmentMode && (this.openPanelName || this.onboardingOpen) && !this.setupGuideOpen) {
			this.autoCloseTimeout = window.setTimeout(() => this.closePanel(), 10_000);
		}
	}

	startOnboarding(): void {
		localStorage.setItem(onboardingCompleteKey, 'true');
		this.onboardingOpen      = false;
		this.settingsInitialPage = 'dosage';
		this.settingsSetupMode   = true;
		this.openPanelName       = 'settings';
		this.resetAutoClose();
	}

	setSettingsSetupMode(setupMode: boolean): void {
		this.settingsSetupMode = setupMode;
		this.resetAutoClose();
	}

	completeOnboarding(): void {
		localStorage.setItem(onboardingCompleteKey, 'true');
		this.onboardingOpen    = false;
		this.settingsSetupMode = false;
		window.clearTimeout(this.autoCloseTimeout);
	}

	dismissVersionNotice(): void {
		rememberCurrentVersion();
		this.versionNoticeOpen = false;
	}

	get setupGuideOpen(): boolean {
		return this.onboardingOpen || this.settingsSetupMode;
	}

	shouldShowVersionNotice(): boolean {
		const versionNotice  = getVersionNotice();
		this.previousVersion = versionNotice.previousVersion;
		return versionNotice.show;
	}

	async loadReleaseNotes(): Promise<void> {
		this.releaseChanges = await loadReleaseChanges(this.previousVersion, this.currentVersion);
	}

}

type PanelName = 'new' | 'history' | 'settings';
type SettingsInitialPage = 'dosage' | 'install' | 'notifications';

export default toNative(MainView);
</script>

<style scoped>
.app-shell {
	position: relative;
	min-height: 100dvh;
	justify-content: flex-start;
	overflow: hidden;
	background: var(--grouped-bg);
	padding: env(safe-area-inset-top) 16px calc(98px + env(safe-area-inset-bottom));
}

.timer-stage {
	min-height: 50dvh;
}

.version-notice {
	position: fixed;
	top: calc(env(safe-area-inset-top) + 12px);
	right: 16px;
	left: 16px;
	z-index: 20;
	border-radius: var(--radius-control);
	background: var(--secondary-grouped-bg);
	box-shadow: 0 10px 28px var(--panel-shadow);
	padding: 12px;
}

.version-notice__copy strong {
	font-size: var(--font-size-title);
}

.version-notice__copy span {
	color: var(--muted-text);
	font-size: var(--font-size-sm);
	line-height: 1.3;
}

.version-notice__changes {
	margin: 6px 0 0;
	padding-left: 18px;
	color: var(--text);
	font-size: var(--font-size-sm);
	line-height: 1.35;
}

.version-notice__close {
	flex: 0 0 auto;
	width: 34px;
	height: 34px;
	border-radius: 999px;
	background: var(--tertiary-grouped-bg);
	color: var(--muted-text);
}

.timer-position--center .timer-stage {
	min-height: calc(100dvh - 98px - env(safe-area-inset-bottom) - env(safe-area-inset-top));
}

.bottom-actions {
	position: fixed;
	right: 0;
	bottom: 0;
	left: 0;
	z-index: 10;
	grid-template-columns: repeat(3, 64px);
	padding: 12px 20px calc(18px + env(safe-area-inset-bottom));
	pointer-events: none;
}

.action-button {
	width: 64px;
	height: 64px;
	border-radius: 999px;
	color: #ffffff;
	pointer-events: auto;
	transition:
		opacity 160ms ease,
		transform 160ms ease;
}

.action-button:active {
	transform: scale(0.94);
	opacity: 0.72;
}

.action-button:disabled {
	opacity: 0.35;
}

.action-button--gray {
	background: var(--gray);
}

.action-button--blue {
	background: var(--blue);
}

.action-button--green {
	background: var(--green);
}
</style>
