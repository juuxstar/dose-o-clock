import { TimerSession } from '@/domain/TimerSession';

enum LocalStorageKeys {
	lastNotifiedSession  = 'dose-o-clock.last-notified-session-id',
	notificationsEnabled = 'dose-o-clock.notifications-enabled',
	clientId             = 'dose-o-clock.notification-client-id',
	clientSecret         = 'dose-o-clock.notification-client-secret',
}

export class SessionNotification {

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
		void this.deleteRemote('subscription').catch(() => undefined);
		return this.status();
	}

	static schedule(session: TimerSession | null, now: Date = new Date()): Promise<void> {
		void now;

		if (!session || this.status() !== 'on' || this.wasNotified(session.id)) {
			return Promise.resolve();
		}

		return this.scheduleRemote(session);
	}

	static clearSchedule(): Promise<void> {
		return this.deleteRemote('timer');
	}

	static clearState(): void {
		void this.clearSchedule().catch(() => undefined);
		localStorage.removeItem(LocalStorageKeys.lastNotifiedSession);
	}

	static sendSampleExpiryNotification(): Promise<void> {
		return this.scheduleRemote(new TimerSession(100, 60, new Date(), 60));
	}

	private static isSupported(): boolean {
		return Boolean(
			this.apiUrl()
			&& this.vapidPublicKey()
			&& window.isSecureContext
			&& 'Notification' in window
			&& 'serviceWorker' in navigator
			&& navigator.serviceWorker
			&& 'ready' in navigator.serviceWorker
			&& typeof window.PushManager !== 'undefined'
		);
	}

	private static async scheduleRemote(session: TimerSession): Promise<void> {
		const registration = await navigator.serviceWorker.ready;
		const subscription = await this.getPushSubscription(registration);
		const identity     = this.getClientIdentity();

		const response = await fetch(`${this.apiUrl()}/clients/${encodeURIComponent(identity.clientId)}/timer`, {
			body : JSON.stringify({
				clientSecret : identity.clientSecret,
				subscription : subscription.toJSON(),
				timer        : {
					durationSeconds : session.durationSeconds,
					expiresAt       : session.automaticStopDate().toISOString(),
					startedAt       : session.startedAt,
					startedAtLabel  : formatStartedAt(session.startedAt),
					sessionId       : session.id,
				},
			}),
			headers : { 'Content-Type' : 'application/json' },
			method  : 'POST',
		});

		if (!response.ok) {
			throw new Error(`Notification schedule failed with ${response.status}`);
		}
	}

	private static async deleteRemote(resource: 'subscription' | 'timer'): Promise<void> {
		if (!this.apiUrl()) {
			return;
		}

		const identity = this.getExistingClientIdentity();
		if (!identity) {
			return;
		}

		await fetch(`${this.apiUrl()}/clients/${encodeURIComponent(identity.clientId)}/${resource}`, {
			body    : JSON.stringify({ clientSecret : identity.clientSecret }),
			headers : { 'Content-Type' : 'application/json' },
			method  : 'DELETE',
		});
	}

	private static async getPushSubscription(registration: ServiceWorkerRegistration): Promise<PushSubscription> {
		const existing = await registration.pushManager.getSubscription();
		if (existing && this.subscriptionUsesCurrentVapidKey(existing)) {
			return existing;
		}

		await existing?.unsubscribe();
		return registration.pushManager.subscribe({
			applicationServerKey : base64UrlToArrayBuffer(this.vapidPublicKey()),
			userVisibleOnly      : true,
		});
	}

	private static subscriptionUsesCurrentVapidKey(subscription: PushSubscription): boolean {
		const applicationServerKey = subscription.options.applicationServerKey;
		if (!applicationServerKey) {
			return false;
		}

		return arrayBuffersEqual(applicationServerKey, base64UrlToArrayBuffer(this.vapidPublicKey()));
	}

	private static wasNotified(sessionId: string): boolean {
		return localStorage.getItem(LocalStorageKeys.lastNotifiedSession) === sessionId;
	}

	private static isEnabled(): boolean {
		return localStorage.getItem(LocalStorageKeys.notificationsEnabled) !== 'false';
	}

	private static setEnabled(enabled: boolean): void {
		localStorage.setItem(LocalStorageKeys.notificationsEnabled, String(enabled));
	}

	private static getClientIdentity(): SessionNotificationClientIdentity {
		const existing = this.getExistingClientIdentity();
		if (existing) {
			return existing;
		}

		const identity = { clientId : createToken(), clientSecret : createToken() };

		localStorage.setItem(LocalStorageKeys.clientId, identity.clientId);
		localStorage.setItem(LocalStorageKeys.clientSecret, identity.clientSecret);

		return identity;
	}

	private static getExistingClientIdentity(): SessionNotificationClientIdentity | null {
		const clientId     = localStorage.getItem(LocalStorageKeys.clientId);
		const clientSecret = localStorage.getItem(LocalStorageKeys.clientSecret);

		if (!clientId || !clientSecret) {
			return null;
		}

		return { clientId, clientSecret };
	}

	private static apiUrl(): string {
		return import.meta.env.VITE_NOTIFICATION_API_URL?.replace(/\/$/, '') ?? '';
	}

	private static vapidPublicKey(): string {
		return import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '';
	}

}

function base64UrlToArrayBuffer(value: string): ArrayBuffer {
	const padding = '='.repeat((4 - value.length % 4) % 4);
	const base64  = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
	const decoded = window.atob(base64);
	const bytes   = new Uint8Array(decoded.length);

	for (let index = 0; index < decoded.length; index += 1) {
		bytes[index] = decoded.charCodeAt(index);
	}

	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function arrayBuffersEqual(left: ArrayBuffer, right: ArrayBuffer): boolean {
	const leftBytes  = new Uint8Array(left);
	const rightBytes = new Uint8Array(right);

	return leftBytes.byteLength === rightBytes.byteLength
		&& leftBytes.every((value, index) => value === rightBytes[index]);
}

function createToken(): string {
	if (globalThis.crypto?.randomUUID) {
		return globalThis.crypto.randomUUID();
	}

	const bytes = new Uint8Array(16);
	globalThis.crypto?.getRandomValues(bytes);

	return [ ...bytes ].map(value => value.toString(16).padStart(2, '0')).join('');
}

function formatStartedAt(startedAt: string): string {
	return new Intl.DateTimeFormat(undefined, { hour : 'numeric', minute : '2-digit' }).format(new Date(startedAt));
}

interface SessionNotificationClientIdentity {
	clientId: string;
	clientSecret: string;
}

export type SessionNotificationStatus = 'on' | 'off' | 'blocked' | 'unavailable';
