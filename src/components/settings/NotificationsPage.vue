<template>
	<div class="settings-page notifications-page u-grid u-gap-12">
		<div
			class="capability-status u-grid u-items-center u-gap-12 u-text-left"
			:class="{ 'capability-status--ready' : notificationStatus === 'on' }"
		>
			<CheckCircle2 v-if="notificationStatus === 'on'" :size="28" aria-hidden="true" />
			<XCircle v-else :size="28" aria-hidden="true" />
			<div>
				<strong>{{ statusLabel }}</strong>
				<p class="u-margin-0">
					{{ statusDescription }}
				</p>
			</div>
		</div>
		<button
			v-if="notificationStatus === 'off'"
			class="primary-button primary-button--green u-flex u-items-center u-justify-center u-gap-8 u-width-100"
			type="button"
			@click="enableNotifications"
		>
			<Bell :size="20" />
			Enable Notifications
		</button>
		<button
			v-if="notificationStatus === 'on'"
			class="primary-button primary-button--red u-flex u-items-center u-justify-center u-gap-8 u-width-100"
			type="button"
			@click="disableNotifications"
		>
			<BellOff :size="20" />
			Turn Off Notifications
		</button>
	</div>
</template>

<script lang="ts">
import { Bell, BellOff, CheckCircle2, XCircle } from '@lucide/vue';
import { Component, Prop, toNative, Vue }       from 'vue-facing-decorator';

import { SessionNotification, type SessionNotificationStatus } from '@/domain/SessionNotification';
import { useTimerStore } from '@/store/useTimerStore';

/**
 * Shows notification permission state and the enable action.
 */
@Component({ components : { Bell, BellOff, CheckCircle2, XCircle }, emits : [ 'interact', 'statusChange' ] })
class NotificationsPage extends Vue {

	@Prop({ type : String, required : true })
	readonly notificationStatus!: SessionNotificationStatus;

	get statusLabel(): string {
		if (this.notificationStatus === 'on') {
			return 'Notifications on';
		}
		if (this.notificationStatus === 'blocked') {
			return 'Notifications blocked';
		}
		if (this.notificationStatus === 'unavailable') {
			return 'Notifications unavailable';
		}
		return 'Notifications off';
	}

	get statusDescription(): string {
		if (this.notificationStatus === 'on') {
			return 'Dose-o-clock can alert you when a session duration completes.';
		}
		if (this.notificationStatus === 'blocked') {
			return 'Re-enable notifications in your browser or app notification settings.';
		}
		if (this.notificationStatus === 'unavailable') {
			return 'Notifications require HTTPS or localhost, service workers, and browser support.';
		}
		return 'Enable alerts for completed session durations.';
	}

	async enableNotifications(): Promise<void> {
		this.$emit('interact');
		const status = await SessionNotification.requestPermission();
		this.$emit('statusChange', status);
		useTimerStore().refreshSessionNotificationSchedule();
	}

	disableNotifications(): void {
		this.$emit('interact');
		const status = SessionNotification.disable();
		this.$emit('statusChange', status);
		useTimerStore().clearSessionNotificationSchedule();
	}

}

export default toNative(NotificationsPage);
</script>

<style scoped>
.notifications-page {
	align-content: start;
	min-height: 210px;
}

.capability-status {
	grid-template-columns: 32px 1fr;
	border-radius: 8px;
	background: var(--tertiary-grouped-bg);
	padding: 12px;
}

.capability-status svg {
	color: var(--red);
}

.capability-status--ready svg {
	color: var(--green);
}

.capability-status strong {
	display: block;
	margin-bottom: 3px;
}

.capability-status p {
	color: var(--muted-text);
	font-size: var(--font-size-sm);
	line-height: 1.3;
}
</style>
