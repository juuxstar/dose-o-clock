<template>
	<PanelShell :open="open" @close="$emit('close')" @interact="$emit('interact')">
		<div class="panel-content">
			<header class="history-header u-grid u-items-center">
				<span class="history-header__spacer" />
				<h2 class="panel-title history-title u-text-center">
					History
				</h2>
				<button
					class="history-reset-button u-grid u-place-center"
					type="button"
					aria-label="Reset all data"
					:disabled="!store.hasSessionData.value"
					@click.stop="openResetModal"
				>
					<Trash2 :size="20" />
				</button>
			</header>

			<div v-if="sessions.length === 0" class="empty-state u-grid u-place-center u-content-center u-gap-10">
				<CircleHelp :size="42" />
				<p>No previous timers</p>
			</div>

			<div v-else class="history-list u-grid u-gap-8">
				<div v-for="(row, index) in sessions" :key="row.session.id" class="history-row-wrap">
					<button
						v-if="!row.active"
						class="history-delete u-grid u-place-center"
						type="button"
						:aria-label="`Delete timer from ${formatShortTime(row.session.startedAt)}`"
						@click="deleteSession(row.session.id)"
					>
						<X :size="22" />
					</button>
					<div
						class="history-row u-grid u-items-center u-gap-12"
						:class="[ index === 0 ? 'history-row--recent' : '', { 'history-row--revealed' : revealedId === row.session.id } ]"
						@pointerdown="onRowPointerDown($event, row.session.id, row.active)"
					>
						<span>{{ formatShortTime(row.session.startedAt) }}</span>
						<strong>{{ formatDuration(row.elapsed) }}</strong>
						<span class="u-text-right">{{ formatDosage(row.session.unitHundredths) }} ml</span>
					</div>
				</div>
			</div>

			<Transition name="panel-backdrop">
				<div v-if="resetModalOpen" class="history-reset-modal-backdrop u-flex" @click.self="closeResetModal">
					<section
						class="history-reset-modal u-flex u-flex-column u-justify-center u-gap-14 u-text-center"
						role="dialog"
						aria-modal="true"
						aria-labelledby="history-reset-title"
					>
						<h2 id="history-reset-title">
							Reset all Dose-o-clock data?
						</h2>
						<p>This clears the active timer and the history list.</p>
						<p>All data is also reset automatically when the current active timer has been running for 24 hours.</p>
						<button
							class="primary-button primary-button--red u-flex u-items-center u-justify-center u-gap-8"
							type="button"
							@click="resetAllData"
						>
							<Trash2 :size="20" />
							Reset All Data
						</button>
					</section>
				</div>
			</Transition>
		</div>
	</PanelShell>
</template>

<script lang="ts">
import { CircleHelp, Trash2, X } from '@lucide/vue';
import { markRaw }               from 'vue';
import { Component, Emit, Prop, toNative, Vue, Watch } from 'vue-facing-decorator';

import PanelShell                          from '@/components/widgets/PanelShell.vue';
import { formatDosage }                    from '@/domain/dosage';
import { formatDuration, formatShortTime } from '@/domain/format';
import { TimerSession }                    from '@/domain/TimerSession';
import { useTimerStore }                   from '@/store/useTimerStore';

/**
 * Displays previous timer sessions and supports lightweight history cleanup actions.
 */
@Component({ components : { CircleHelp, PanelShell, Trash2, X }, emits : [ 'close', 'interact' ] })
class HistoryPanel extends Vue {

	@Prop({ type : Boolean, required : true })
	readonly open!: boolean;

	store      = markRaw(useTimerStore());
	revealedId: string | null = null;
	resetModalOpen = false;
	dragStartX = 0;
	draggingId = '';
	revealTimeout: number | undefined;

	get sessions(): HistoryRow[] {
		const active = this.store.activeSession.value
			? [
				{
					session : this.store.activeSession.value,
					active  : true,
					elapsed : this.store.visualElapsedSeconds.value,
				},
			]
			: [];

		return [
			...active,
			...this.store.history.value.map(session => ({
				session,
				active  : false,
				elapsed : session.elapsedSeconds(this.store.currentTime.value),
			})),
		];
	}

	@Emit('close')
	close(): void {}

	@Emit('interact')
	interact(): void {}

	formatDosage     = formatDosage;
	formatDuration   = formatDuration;
	formatShortTime  = formatShortTime;

	@Watch('open')
	onOpenChanged(open: boolean): void {
		if (!open) {
			this.resetModalOpen = false;
			this.closeReveal();
		}
	}

	onRowPointerDown(event: PointerEvent, id: string, active: boolean): void {
		this.interact();

		if (active) {
			return;
		}

		this.dragStartX = event.clientX;
		this.draggingId = id;
		window.addEventListener('pointermove', this.onRowPointerMove);
		window.addEventListener('pointerup', this.onRowPointerUp, { once : true });
	}

	onRowPointerMove = (event: PointerEvent): void => {
		this.interact();
		const distance = this.dragStartX - event.clientX;

		if (distance > 96 * 0.45) {
			this.reveal(this.draggingId);
		}
		else if (distance < 8 && this.revealedId === this.draggingId) {
			this.closeReveal();
		}
	};

	onRowPointerUp = (): void => {
		window.removeEventListener('pointermove', this.onRowPointerMove);
	};

	reveal(id: string): void {
		this.revealedId = id;
		window.clearTimeout(this.revealTimeout);
		this.revealTimeout = window.setTimeout(() => this.closeReveal(), 3000);
	}

	closeReveal(): void {
		this.revealedId = null;
		window.clearTimeout(this.revealTimeout);
	}

	openResetModal(): void {
		this.interact();
		this.closeReveal();
		this.resetModalOpen = true;
	}

	closeResetModal(): void {
		this.interact();
		this.resetModalOpen = false;
	}

	resetAllData(): void {
		this.store.resetAllData();
		this.resetModalOpen = false;
		this.close();
	}

	deleteSession(id: string): void {
		this.store.deleteHistorySession(id);
		this.closeReveal();
	}

}

interface HistoryRow {
	active: boolean;
	elapsed: number;
	session: TimerSession;
}

export default toNative(HistoryPanel);
</script>

<style scoped>
.empty-state {
	height: 70%;
	color: var(--muted-text);
}

.empty-state p {
	margin: 0;
	font-weight: 700;
}

.history-header {
	grid-template-columns: 44px 1fr 44px;
	margin-bottom: 14px;
}

.history-header__spacer {
	width: 44px;
}

.history-title {
	margin: 0;
}

.history-reset-button {
	width: 44px;
	height: 38px;
	border-radius: 8px;
	background: color-mix(in srgb, var(--red), transparent 86%);
	color: var(--red);
}

.history-reset-button:disabled {
	opacity: 0.35;
}

.history-reset-modal-backdrop {
	position: absolute;
	inset: 0;
	z-index: 4;
	background: var(--secondary-grouped-bg);
}

.history-reset-modal {
	width: 100%;
	padding: 20px 0;
}

.history-reset-modal h2,
.history-reset-modal p {
	margin: 0;
}

.history-reset-modal h2 {
	font-size: 18px;
}

.history-reset-modal p {
	color: var(--muted-text);
	line-height: 1.35;
}

.history-row-wrap {
	position: relative;
	overflow: hidden;
	border-radius: 8px;
	background: var(--tertiary-grouped-bg);
}

.history-row {
	position: relative;
	z-index: 2;
	min-height: 54px;
	grid-template-columns: 1fr auto 1fr;
	border-radius: 8px;
	background: var(--tertiary-grouped-bg);
	padding: 0 14px;
	transition: transform 180ms ease;
}

.history-row--recent {
	min-height: 64px;
	font-size: 22px;
}

.history-row--revealed {
	transform: translateX(-96px);
}

.history-delete {
	position: absolute;
	top: 0;
	right: 0;
	width: 96px;
	height: 100%;
	background: var(--red);
	color: #ffffff;
}

.panel-backdrop-enter-active,
.panel-backdrop-leave-active {
	transition: opacity 260ms ease;
}

.panel-backdrop-enter-from,
.panel-backdrop-leave-to {
	opacity: 0;
}
</style>
