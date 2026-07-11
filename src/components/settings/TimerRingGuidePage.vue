<template>
	<div class="timer-ring-guide settings-page u-grid u-gap-12">
		<section
			v-for="example in examples"
			:key="example.title"
			class="timer-ring-example u-grid u-items-center u-gap-12"
		>
			<div class="timer-ring-example__preview u-grid u-place-center">
				<RingTimer
					:elapsed-seconds="example.elapsedSeconds"
					:duration-seconds="durationSeconds"
					ring-shape="minimal"
				/>
			</div>
			<div class="timer-ring-example__copy u-grid u-gap-4">
				<h3 class="u-margin-0">
					{{ example.title }}
				</h3>
				<p class="u-margin-0">
					{{ example.description }}
				</p>
			</div>
		</section>
	</div>
</template>

<script lang="ts">
import { Component, toNative, Vue } from 'vue-facing-decorator';

import RingTimer from '@/components/widgets/RingTimer.vue';

/**
 * Explains the timer ring's normal progress and overtime colour behavior.
 */
@Component({ components : { RingTimer } })
class TimerRingGuidePage extends Vue {

	durationSeconds = guideDurationSeconds;
	examples        = timerRingExamples;

}

const guideDurationSeconds = 60;

const timerRingExamples: TimerRingExample[] = [
	{
		description    : 'A new timer starts as a quiet gray ring, with no elapsed colour filled in yet.',
		elapsedSeconds : 0,
		title          : 'Starting Off',
	},
	{
		description    : 'As time passes, the ring fills clockwise through red, yellow, and green until the original duration is complete.',
		elapsedSeconds : 45,
		title          : 'During the Timer',
	},
	{
		description    : 'If the timer keeps running past that duration, the older red and yellow parts keep turning green.',
		elapsedSeconds : 90,
		title          : 'Past Completion',
	},
];

interface TimerRingExample {
	description: string;
	elapsedSeconds: number;
	title: string;
}

export default toNative(TimerRingGuidePage);
</script>

<style scoped>
.timer-ring-guide {
	align-content: start;
}

.timer-ring-example {
	grid-template-columns: 82px 1fr;
	min-height: 104px;
	border-radius: 8px;
	background: var(--tertiary-grouped-bg);
	padding: 12px;
}

.timer-ring-example__preview {
	width: 72px;
	aspect-ratio: 1;
}

.timer-ring-example__copy h3 {
	color: var(--text);
	font-size: var(--font-size-body);
	font-weight: 800;
}

.timer-ring-example__copy p {
	color: var(--muted-text);
	font-size: var(--font-size-body);
	line-height: 1.35;
}
</style>
