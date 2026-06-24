<template>
	<div class="settings-page u-grid u-gap-12">
		<label class="field-label">Timer Position</label>
		<div class="segmented u-grid u-gap-4" role="group" aria-label="Timer Position">
			<button
				type="button"
				:class="{ active : store.timerPosition.value === 'top' }"
				@click="store.setTimerPosition('top')"
			>
				Top
			</button>
			<button
				type="button"
				:class="{ active : store.timerPosition.value === 'center' }"
				@click="store.setTimerPosition('center')"
			>
				Center
			</button>
		</div>
	</div>
</template>

<script lang="ts">
import { markRaw }                  from 'vue';
import { Component, toNative, Vue } from 'vue-facing-decorator';

import { useTimerStore } from '@/store/useTimerStore';

/**
 * Edits display options for the active timer.
 */
@Component
class GraphicsPage extends Vue {

	store = markRaw(useTimerStore());

}

export default toNative(GraphicsPage);
</script>

<style scoped>
.field-label {
	color: var(--muted-text);
	font-size: var(--font-size-body);
	font-weight: 700;
}

.segmented {
	grid-template-columns: repeat(2, 1fr);
	border-radius: 8px;
	background: var(--tertiary-grouped-bg);
	padding: 4px;
}

.segmented button {
	min-height: 42px;
	border-radius: 6px;
	background: transparent;
	font-weight: 800;
	color: var(--muted-text);
}

.segmented button.active {
	background: var(--secondary-grouped-bg);
	color: var(--text);
	box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}
</style>
