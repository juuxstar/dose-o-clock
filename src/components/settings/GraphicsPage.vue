<template>
	<div class="settings-page u-grid u-gap-12">
		<section class="panel-section u-grid u-gap-10">
			<h3 class="u-margin-0 u-text-center">
				Timer Position
			</h3>
			<DialSelector
				:model-value="timerPositionValue"
				:values="timerPositionValues"
				:format="formatTimerPosition"
				:center-oval-width="116"
				:item-spacing="116"
				@update:model-value="setTimerPositionValue"
				@interact="$emit('interact')"
			/>
		</section>

		<section class="panel-section u-grid u-gap-10">
			<h3 class="u-margin-0 u-text-center">
				Timer Ring Style
			</h3>
			<DialSelector
				:model-value="timerRingShapeValue"
				:values="timerRingShapeValues"
				:format="formatTimerRingShape"
				:center-oval-width="132"
				:item-spacing="132"
				@update:model-value="setTimerRingShapeValue"
				@interact="$emit('interact')"
			/>
		</section>
	</div>
</template>

<script lang="ts">
import { markRaw }                  from 'vue';
import { Component, toNative, Vue } from 'vue-facing-decorator';

import DialSelector                           from '@/components/widgets/DialSelector.vue';
import type { TimerPosition, TimerRingShape } from '@/store/storage';
import { useTimerStore }                      from '@/store/useTimerStore';

/**
 * Edits display options for the active timer.
 */
@Component({ components : { DialSelector }, emits : [ 'interact' ] })
class GraphicsPage extends Vue {

	store = markRaw(useTimerStore());
	timerPositionValues = timerPositionOptions.map(option => option.value);
	timerRingShapeValues = timerRingShapeOptions.map(option => option.value);

	get timerPositionValue(): number {
		return timerPositionOptions.find(option => option.position === this.store.timerPosition.value)?.value ?? timerPositionOptions[0].value;
	}

	get timerRingShapeValue(): number {
		return timerRingShapeOptions.find(option => option.shape === this.store.timerRingShape.value)?.value ?? timerRingShapeOptions[0].value;
	}

	formatTimerPosition(value: number): string {
		return timerPositionOptions.find(option => option.value === value)?.label ?? '';
	}

	formatTimerRingShape(value: number): string {
		return timerRingShapeOptions.find(option => option.value === value)?.label ?? '';
	}

	setTimerPositionValue(value: number): void {
		const position = timerPositionOptions.find(option => option.value === value)?.position;

		if (position) {
			this.store.setTimerPosition(position);
		}
	}

	setTimerRingShapeValue(value: number): void {
		const shape = timerRingShapeOptions.find(option => option.value === value)?.shape;

		if (shape) {
			this.store.setTimerRingShape(shape);
		}
	}

}

const timerPositionOptions: TimerPositionOption[] = [
	{ value : 0, label : 'Top', position : 'top' },
	{ value : 1, label : 'Center', position : 'center' },
];

const timerRingShapeOptions: TimerRingShapeOption[] = [
	{ value : 0, label : 'Dots', shape : 'dots' },
	{ value : 1, label : 'Darts', shape : 'darts' },
	{ value : 2, label : 'Diamond', shape : 'diamond' },
	{ value : 3, label : 'Bars', shape : 'bars' },
	{ value : 4, label : 'Capsules', shape : 'capsules' },
	{ value : 5, label : 'Ticks', shape : 'ticks' },
	{ value : 6, label : 'Petals', shape : 'petals' },
	{ value : 7, label : 'Minimal', shape : 'minimal' },
];

interface TimerPositionOption {
	label: string;
	position: TimerPosition;
	value: number;
}

interface TimerRingShapeOption {
	label: string;
	shape: TimerRingShape;
	value: number;
}

export default toNative(GraphicsPage);
</script>
