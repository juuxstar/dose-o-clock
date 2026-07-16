<template>
	<div class="display-guide settings-page u-grid u-gap-12">
		<section class="display-guide__intro u-grid u-gap-8">
			<p class="u-margin-0">
				The Display Options allow various customizations such as ring position and ring style, so you can move the timer
				between the top and center of the screen and choose the ring style you like best.
			</p>
		</section>

		<section class="ring-style-grid u-grid u-gap-10">
			<button
				v-for="style in ringStyles"
				:key="style.label"
				class="ring-style-card u-grid u-gap-8"
				:class="{ 'ring-style-card--selected' : style.shape === selectedRingShape }"
				type="button"
				:aria-pressed="style.shape === selectedRingShape"
				@click="selectRingStyle(style.shape)"
			>
				<div class="ring-style-card__preview u-grid u-place-center">
					<RingTimer
						:elapsed-seconds="previewElapsedSeconds"
						:duration-seconds="previewDurationSeconds"
						:ring-segments="previewRingSegments"
						:ring-shape="style.shape"
					/>
				</div>
				<strong class="u-text-center">{{ style.label }}</strong>
			</button>
		</section>
	</div>
</template>

<script lang="ts">
import { markRaw }                  from 'vue';
import { Component, toNative, Vue } from 'vue-facing-decorator';

import RingTimer          from '@/components/widgets/RingTimer.vue';
import { TimerRingShape } from '@/store/storage';
import { useTimerStore }  from '@/store/useTimerStore';

/**
 * Introduces display settings and previews a few timer ring styles.
 */
@Component({ components : { RingTimer } })
class DisplayGuidePage extends Vue {

	store                  = markRaw(useTimerStore());
	previewDurationSeconds = previewDurationSeconds;
	previewElapsedSeconds  = previewElapsedSeconds;
	previewRingSegments    = previewRingSegments;
	ringStyles             = displayRingStyles;

	get selectedRingShape(): TimerRingShape {
		return this.store.timerRingShape.value;
	}

	selectRingStyle(shape: TimerRingShape): void {
		this.store.setTimerRingShape(shape);
	}

}

const previewDurationSeconds = 60;
const previewElapsedSeconds  = 42;
const previewRingSegments    = 24;

const displayRingStyles: DisplayRingStyle[] = [
	{ label : 'Dots', shape : TimerRingShape.Dots },
	{ label : 'Capsules', shape : TimerRingShape.Capsules },
	{ label : 'Minimal', shape : TimerRingShape.Minimal },
];

interface DisplayRingStyle {
	label: string;
	shape: TimerRingShape;
}

export default toNative(DisplayGuidePage);
</script>

<style scoped>
.display-guide {
	align-content: start;
}

.display-guide__intro {
	padding: 2px 8px 0;
}

.display-guide__intro p {
	color: var(--muted-text);
	font-size: var(--font-size-body);
	line-height: 1.35;
}

.ring-style-grid {
	grid-template-columns: repeat(3, minmax(0, 1fr));
}

.ring-style-card {
	justify-items: center;
	border: 1px solid transparent;
	border-radius: var(--radius-control);
	background: var(--tertiary-grouped-bg);
	color: var(--text);
	padding: 10px 8px;
	font: inherit;
	cursor: pointer;
}

.ring-style-card__preview {
	width: min(100%, 82px);
	aspect-ratio: 1;
}

.ring-style-card strong {
	font-size: var(--font-size-sm);
}

.ring-style-card--selected {
	border-color: var(--green);
	background: color-mix(in srgb, var(--tertiary-grouped-bg), var(--green) 14%);
}
</style>
