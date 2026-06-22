<template>
	<PanelShell :open="open" size="tall" @close="$emit('close')" @interact="$emit('interact')">
		<div class="panel-content panel-content--new-session u-flex u-flex-column">
			<section class="panel-section">
				<h2 class="u-text-center">
					ml
				</h2>
				<DialSelector
					v-model="selectedDosage"
					:values="dosageValues"
					:format="formatDosage"
					:color-for-value="dosageColor"
					@interact="$emit('interact')"
				/>
			</section>

			<section class="panel-section">
				<h2 class="u-text-center">
					When
				</h2>
				<DialSelector
					v-model="selectedEarlierMinutes"
					:values="earlierValues"
					:format="formatEarlier"
					@interact="$emit('interact')"
				/>
				<p v-if="earlierSubtext" class="subtext u-text-center">
					{{ earlierSubtext }}
				</p>
			</section>

			<section class="panel-section">
				<h2 class="u-text-center">
					Duration
				</h2>
				<DialSelector
					v-model="selectedDurationMinutes"
					:values="durationValues"
					:format="formatDuration"
					@interact="$emit('interact')"
				/>
			</section>

			<button
				class="primary-button primary-button--green new-session-start u-flex u-items-center u-justify-center u-gap-8"
				type="button"
				@pointerdown.stop="$emit('interact')"
				@touchend.stop.prevent="activateStart"
				@click.stop="activateStart"
			>
				<Play :size="20" />
				Start
			</button>
		</div>
	</PanelShell>
</template>

<script lang="ts">
import { Play }    from '@lucide/vue';
import { markRaw } from 'vue';
import { Component, Emit, Prop, toNative, Vue, Watch } from 'vue-facing-decorator';

import DialSelector      from '@/components/widgets/DialSelector.vue';
import PanelShell        from '@/components/widgets/PanelShell.vue';
import { formatDosage }  from '@/domain/dosage';
import { useTimerStore } from '@/store/useTimerStore';

/**
 * Collects dosage, start offset, and duration before creating a new timer session.
 */
@Component({ components : { DialSelector, PanelShell, Play }, emits : [ 'close', 'interact' ] })
class NewSessionPanel extends Vue {

	@Prop({ type : Boolean, required : true })
	readonly open!: boolean;

	store         = markRaw(useTimerStore());
	earlierValues = Array.from({ length : 19 }, (_, index) => index * 5);
	durationValues = [ 45, 60, 75, 90 ];

	localSelectedDosage          = this.store.defaultUnitHundredths.value;
	localSelectedEarlierMinutes  = 0;
	localSelectedDurationMinutes = 60;
	lastStartActivatedAt         = 0;

	get dosageValues(): number[] {
		return this.store.dosageValues.value;
	}

	get selectedDosage(): number {
		return this.localSelectedDosage;
	}

	set selectedDosage(value: number) {
		this.localSelectedDosage = value;
	}

	get selectedEarlierMinutes(): number {
		return this.localSelectedEarlierMinutes;
	}

	set selectedEarlierMinutes(value: number) {
		this.localSelectedEarlierMinutes = value;
	}

	get selectedDurationMinutes(): number {
		return this.localSelectedDurationMinutes;
	}

	set selectedDurationMinutes(value: number) {
		this.localSelectedDurationMinutes = value;
	}

	get earlierSubtext(): string {
		if (this.localSelectedEarlierMinutes === 0) {
			return '';
		}

		if (this.localSelectedEarlierMinutes === 90) {
			return 'minutes earlier, really Girl???';
		}

		if (this.localSelectedEarlierMinutes >= 60) {
			return 'minutes earlier, really?';
		}

		return 'minutes earlier';
	}

	@Watch('open')
	onOpenChanged(open: boolean): void {
		if (open) {
			this.localSelectedDosage          = this.store.defaultUnitHundredths.value;
			this.localSelectedEarlierMinutes  = 0;
			this.localSelectedDurationMinutes = 60;
		}
	}

	@Emit('close')
	close(): void {}

	@Emit('interact')
	interact(): void {}

	formatDosage = formatDosage;

	formatEarlier(value: number): string {
		return value === 0 ? 'Now' : String(value);
	}

	formatDuration(value: number): string {
		return `${value}m`;
	}

	dosageColor(value: number): string {
		const defaultValue = this.store.defaultUnitHundredths.value;

		if (value === defaultValue) {
			return 'var(--text)';
		}

		if (value < defaultValue) {
			const progress = Math.min(1, (defaultValue - value) / Math.max(defaultValue, 1));
			return `color-mix(in srgb, var(--text), var(--green) ${Math.round(progress * 75)}%)`;
		}

		const progress = Math.min(
			1,
			(value - defaultValue) / Math.max(this.store.maxUnitHundredths.value - defaultValue, 1)
		);
		return `color-mix(in srgb, var(--text), var(--red) ${Math.round(progress * 75)}%)`;
	}

	activateStart(): void {
		const now = Date.now();

		if (now - this.lastStartActivatedAt < 500) {
			return;
		}

		this.lastStartActivatedAt = now;
		this.store.startSession(this.localSelectedDosage, this.localSelectedEarlierMinutes, this.localSelectedDurationMinutes);
		this.close();
	}

}

export default toNative(NewSessionPanel);
</script>

<style scoped>
.panel-content--new-session {
	padding-bottom: max(10px, env(safe-area-inset-bottom));
}

.new-session-start {
	margin-top: auto;
	touch-action: manipulation;
}
</style>
