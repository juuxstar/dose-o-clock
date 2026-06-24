<template>
	<div class="settings-page u-grid u-gap-12">
		<section class="panel-section">
			<h3 class="u-text-center">
				Default Dosage (ml)
			</h3>
			<DialSelector
				:model-value="store.defaultUnitHundredths.value"
				:values="store.dosageValues.value"
				:format="formatDosage"
				@update:model-value="store.setDefaultDosage"
				@interact="$emit('interact')"
			/>
		</section>
		<section class="panel-section">
			<h3 class="u-text-center">
				Max Dosage (ml)
			</h3>
			<DialSelector
				:model-value="store.maxUnitHundredths.value"
				:values="store.maxDosageValues.value"
				:format="formatDosage"
				@update:model-value="store.setMaxDosage"
				@interact="$emit('interact')"
			/>
		</section>
		<section class="panel-section">
			<h3 class="u-text-center">
				Dosage Increment
			</h3>
			<DialSelector
				:model-value="store.dosageIncrementHundredths.value"
				:values="incrementValues"
				:format="formatDosage"
				@update:model-value="store.setDosageIncrement"
				@interact="$emit('interact')"
			/>
		</section>
	</div>
</template>

<script lang="ts">
import { markRaw }                  from 'vue';
import { Component, toNative, Vue } from 'vue-facing-decorator';

import DialSelector      from '@/components/widgets/DialSelector.vue';
import { Dosage }        from '@/domain/Dosage';
import { useTimerStore } from '@/store/useTimerStore';

/**
 * Edits the dosage default, maximum, and increment settings.
 */
@Component({ components : { DialSelector }, emits : [ 'interact' ] })
class DosagePage extends Vue {

	store           = markRaw(useTimerStore());
	incrementValues = [ ...Dosage.supportedIncrementValues ];
	formatDosage    = Dosage.format;

}

export default toNative(DosagePage);
</script>
