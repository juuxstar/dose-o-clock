<template>
	<div class="settings-page dev-tools-page u-grid u-gap-12">
		<button
			class="primary-button primary-button--green u-flex u-items-center u-justify-center u-gap-8 u-width-100"
			type="button"
			:disabled="sending"
			@click="sendSampleExpiryNotification"
		>
			<Send :size="20" />
			{{ sendButtonLabel }}
		</button>
		<p v-if="statusMessage" class="dev-tools-page__status u-margin-0 u-text-center">
			{{ statusMessage }}
		</p>
	</div>
</template>

<script lang="ts">
import { Send }                     from '@lucide/vue';
import { Component, toNative, Vue } from 'vue-facing-decorator';

import { SessionNotification } from '@/domain/SessionNotification';

/**
 * Provides development-only actions for testing app integrations.
 */
@Component({ components : { Send }, emits : [ 'interact' ] })
class DevToolsPage extends Vue {

	sending = false;
	statusMessage = '';

	get sendButtonLabel(): string {
		return this.sending ? 'Sending...' : 'Send Sample Session Expiry';
	}

	async sendSampleExpiryNotification(): Promise<void> {
		this.$emit('interact');
		this.sending       = true;
		this.statusMessage = '';

		try {
			await SessionNotification.sendSampleExpiryNotification();
			this.statusMessage = 'Sample notification scheduled for immediate delivery.';
		}
		catch {
			this.statusMessage = 'Unable to send the sample notification.';
		}
		finally {
			this.sending = false;
		}
	}

}

export default toNative(DevToolsPage);
</script>

<style scoped>
.dev-tools-page {
	align-content: start;
	min-height: 210px;
}

.dev-tools-page__status {
	color: var(--muted-text);
	font-size: var(--font-size-sm);
	line-height: 1.3;
}
</style>
