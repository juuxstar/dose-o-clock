<template>
	<main class="app-shell u-flex u-flex-column u-items-center" :class="timerPositionClass">
		<section class="timer-stage u-grid u-place-center u-width-100">
			<DotRingTimer
				:elapsed-seconds="store.visualElapsedSeconds.value"
				:duration-seconds="store.activeSession.value?.durationSeconds"
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
		<SettingsPanel :open="openPanelName === 'settings'" @close="closePanel" @interact="resetAutoClose" />
	</main>
</template>

<script lang="ts">
import { List, Plus, Settings }     from '@lucide/vue';
import { markRaw }                  from 'vue';
import { Component, toNative, Vue } from 'vue-facing-decorator';

import HistoryPanel      from '@/components/HistoryPanel.vue';
import NewSessionPanel   from '@/components/NewSessionPanel.vue';
import SettingsPanel     from '@/components/settings/SettingsPanel.vue';
import DotRingTimer      from '@/components/widgets/DotRingTimer.vue';
import { useTimerStore } from '@/store/useTimerStore';

/**
 * Coordinates the main timer view, persistent ticking, and temporary panels.
 */
@Component({ components : { DotRingTimer, HistoryPanel, List, NewSessionPanel, Plus, Settings, SettingsPanel } })
class MainView extends Vue {

	store         = markRaw(useTimerStore());
	openPanelName: PanelName | null = null;
	tickInterval: number | undefined;
	autoCloseTimeout: number | undefined;

	get timerPositionClass(): string {
		return `timer-position--${this.store.timerPosition.value}`;
	}

	mounted(): void {
		this.store.tick();
		this.tickInterval = window.setInterval(() => this.store.tick(), 1000);
	}

	beforeUnmount(): void {
		window.clearInterval(this.tickInterval);
		window.clearTimeout(this.autoCloseTimeout);
	}

	openPanel(panel: PanelName): void {
		this.openPanelName = panel;
		this.resetAutoClose();
	}

	closePanel(): void {
		this.openPanelName = null;
		window.clearTimeout(this.autoCloseTimeout);
	}

	resetAutoClose(): void {
		window.clearTimeout(this.autoCloseTimeout);

		if (this.openPanelName) {
			this.autoCloseTimeout = window.setTimeout(() => this.closePanel(), 10_000);
		}
	}

}

type PanelName = 'new' | 'history' | 'settings';

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
