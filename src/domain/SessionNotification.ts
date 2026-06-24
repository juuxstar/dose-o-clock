import { TimerSession } from '@/domain/TimerSession';

const LAST_NOTIFIED_SESSION_KEY = 'dose-o-clock.last-notified-session-id';
const NOTIFICATIONS_ENABLED_KEY = 'dose-o-clock.notifications-enabled';
const SESSION_COMPLETE_TAG      = 'dose-o-clock-session-complete';
const NOTIFICATION_TITLE        = 'Dose-o-clock';
const NOTIFICATION_BODY         = 'Session duration complete.';

export class SessionNotification {

	private static completionTimeout: number | undefined;

	static status(): SessionNotificationStatus {
		if (!this.isSupported()) {
			return 'unavailable';
		}

		if (Notification.permission === 'granted') {
			return this.isEnabled() ? 'on' : 'off';
		}

		return Notification.permission === 'denied' ? 'blocked' : 'off';
	}

	static async requestPermission(): Promise<SessionNotificationStatus> {
		if (!this.isSupported()) {
			return 'unavailable';
		}

		if (Notification.permission === 'default') {
			await Notification.requestPermission();
		}

		if (Notification.permission === 'granted') {
			this.setEnabled(true);
		}

		return this.status();
	}

	static disable(): SessionNotificationStatus {
		this.setEnabled(false);
		this.clearSchedule();
		return this.status();
	}

	static schedule(session: TimerSession | null, now: Date = new Date()): void {
		this.clearSchedule();

		if (!session || this.status() !== 'on' || this.wasNotified(session.id)) {
			return;
		}

		const completionAt = session.automaticStopDate().getTime();
		const delay        = Math.max(0, completionAt - now.getTime());

		this.completionTimeout = window.setTimeout(() => void this.show(session).catch(() => undefined), delay);
	}

	static clearSchedule(): void {
		window.clearTimeout(this.completionTimeout);
		this.completionTimeout = undefined;
	}

	static clearState(): void {
		this.clearSchedule();
		localStorage.removeItem(LAST_NOTIFIED_SESSION_KEY);
	}

	private static async show(session: TimerSession): Promise<void> {
		if (this.status() !== 'on' || this.wasNotified(session.id)) {
			return;
		}

		const registration = await navigator.serviceWorker.ready;

		await registration.showNotification(NOTIFICATION_TITLE, {
			badge              : '/icons/icon.svg',
			body               : NOTIFICATION_BODY,
			data               : { sessionId : session.id, url : '/' },
			icon               : '/icons/icon.svg',
			requireInteraction : true,
			tag                : SESSION_COMPLETE_TAG,
		});

		localStorage.setItem(LAST_NOTIFIED_SESSION_KEY, session.id);
	}

	private static isSupported(): boolean {
		return Boolean(
			window.isSecureContext
			&& 'Notification' in window
			&& 'serviceWorker' in navigator
			&& navigator.serviceWorker
			&& 'ready' in navigator.serviceWorker
		);
	}

	private static wasNotified(sessionId: string): boolean {
		return localStorage.getItem(LAST_NOTIFIED_SESSION_KEY) === sessionId;
	}

	private static isEnabled(): boolean {
		return localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) !== 'false';
	}

	private static setEnabled(enabled: boolean): void {
		localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(enabled));
	}

}

export type SessionNotificationStatus = 'on' | 'off' | 'blocked' | 'unavailable';
