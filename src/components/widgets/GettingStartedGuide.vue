<template>
	<div class="getting-started-guide u-grid u-gap-12">
		<header class="guide-intro u-grid u-gap-8 u-text-center">
			<h3 class="u-margin-0">
				{{ heading }}
			</h3>
			<p class="u-margin-0">
				{{ intro }}
			</p>
		</header>

		<div class="guide-actions u-grid u-gap-10">
			<button class="primary-button primary-button--green u-width-100" type="button" @click="$emit('start')">
				Start Setup
			</button>
			<button class="secondary-button u-width-100" type="button" @click="$emit('skip')">
				Skip
			</button>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, toNative, Vue } from 'vue-facing-decorator';

/**
 * Introduces the setup tasks that make Dose-o-clock easier to reuse.
 */
@Component({ emits : [ 'skip', 'start' ] })
class GettingStartedGuide extends Vue {

	get heading(): string {
		return 'Set up Dose-o-clock?';
	}

	get intro(): string {
		return 'Take a quick pass through defaults, app mode, and completion alerts.';
	}

}

export type GettingStartedTarget = 'dosage' | 'install' | 'notifications';

export default toNative(GettingStartedGuide);
</script>

<style scoped>
.getting-started-guide {
	align-content: start;
}

.guide-intro {
	padding: 2px 8px 6px;
}

.guide-intro h3 {
	font-size: var(--font-size-title);
}

.guide-intro p {
	color: var(--muted-text);
	font-size: var(--font-size-body);
	line-height: 1.35;
}

.secondary-button {
	min-height: 48px;
	border-radius: var(--radius-control);
	background: var(--tertiary-grouped-bg);
	font-weight: 800;
}
</style>
