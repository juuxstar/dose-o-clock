import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionNotification } from '@/domain/SessionNotification';
import { TimerSession }        from '@/domain/TimerSession';

describe('SessionNotification', () => {
	let permission: NotificationPermission = 'granted';
	let requestPermission: ReturnType<typeof vi.fn>;
	let fetchMock: ReturnType<typeof vi.fn>;
	let getSubscription: ReturnType<typeof vi.fn>;
	let subscribe: ReturnType<typeof vi.fn>;
	let subscription: PushSubscription;

	beforeEach(() => {
		localStorage.clear();
		vi.stubEnv('VITE_NOTIFICATION_API_URL', 'https://notifications.example.test');
		vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'BEl6eJr4mS6E03xTvZwaM7OPs7amDGyydH6pgoYBL5wzzqf4VTIkuVaDkAyxjYtsQxLZqZ6wXk3kF-Ufng6uefA');

		requestPermission = vi.fn(async () => permission);
		permission        = 'granted';
		subscription      = {
			endpoint       : 'https://push.example.test/send/client',
			expirationTime : null,
			getKey         : vi.fn(),
			options        : { applicationServerKey : null, userVisibleOnly : true },
			toJSON         : () => ({
				endpoint       : 'https://push.example.test/send/client',
				expirationTime : null,
				keys           : {
					auth   : 'auth-secret',
					p256dh : 'client-public-key',
				},
			}),
			unsubscribe : vi.fn(),
		} as unknown as PushSubscription;
		getSubscription = vi.fn(async () => null);
		subscribe       = vi.fn(async () => subscription);
		fetchMock       = vi.fn(async () => new Response('{}', { status : 200 }));

		Object.defineProperty(window, 'isSecureContext', { configurable : true, value : true });
		Object.defineProperty(window, 'Notification', {
			configurable : true,
			value        : {
				get permission() {
					return permission;
				},
				requestPermission,
			},
		});
		Object.defineProperty(window, 'PushManager', { configurable : true, value : class PushManager {} });
		Object.defineProperty(window, 'fetch', { configurable : true, value : fetchMock });
		Object.defineProperty(navigator, 'serviceWorker', {
			configurable : true,
			value        : {
				ready : Promise.resolve({ pushManager : { getSubscription, subscribe } }),
			},
		});
	});

	afterEach(async () => {
		await SessionNotification.clearSchedule();
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
	});

	it('requests permission without creating a local timer or remote timer', async () => {
		permission = 'default';
		requestPermission.mockImplementationOnce(async () => {
			permission = 'granted';
			return permission;
		});
		await expect(SessionNotification.requestPermission()).resolves.toBe('on');

		expect(requestPermission).toHaveBeenCalledOnce();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('subscribes and sends one combined timer request', async () => {
		const session = new TimerSession(100, 0, new Date('2026-06-15T12:00:00.000Z'), 60);

		await SessionNotification.schedule(session, new Date('2026-06-15T12:00:30.000Z'));

		expect(subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly : true }));
		expect(fetchMock).toHaveBeenCalledOnce();
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringMatching(/^https:\/\/notifications\.example\.test\/clients\/.+\/timer$/),
			expect.objectContaining({ body : expect.any(String), method : 'POST' })
		);

		const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
		expect(body).toMatchObject({
			clientSecret : expect.any(String),
			subscription : {
				endpoint : 'https://push.example.test/send/client',
			},
			timer : {
				durationSeconds : 60,
				expiresAt       : '2026-06-15T12:01:00.000Z',
				sessionId       : session.id,
			},
		});
	});

	it('reuses an existing push subscription when replacing a session', async () => {
		const firstSession  = new TimerSession(100, 0, new Date('2026-06-15T12:00:00.000Z'), 60);
		const secondSession = new TimerSession(100, 0, new Date('2026-06-15T12:00:10.000Z'), 60);

		getSubscription.mockResolvedValue(subscription);
		await SessionNotification.schedule(firstSession, new Date('2026-06-15T12:00:00.000Z'));
		await SessionNotification.schedule(secondSession, new Date('2026-06-15T12:00:10.000Z'));

		expect(subscribe).not.toHaveBeenCalled();
		expect(fetchMock).toHaveBeenCalledTimes(2);
		const replacementBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
		expect(replacementBody.timer.sessionId).toBe(secondSession.id);
	});

	it('clears the remote timer', async () => {
		const session = new TimerSession(100, 0, new Date('2026-06-15T12:00:00.000Z'), 60);

		await SessionNotification.schedule(session, new Date('2026-06-15T12:00:00.000Z'));
		fetchMock.mockClear();
		await SessionNotification.clearSchedule();

		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringMatching(/^https:\/\/notifications\.example\.test\/clients\/.+\/timer$/),
			expect.objectContaining({ method : 'DELETE' })
		);
	});

	it('clears the remote subscription when disabled', async () => {
		const session = new TimerSession(100, 0, new Date('2026-06-15T12:00:00.000Z'), 60);

		await SessionNotification.schedule(session, new Date('2026-06-15T12:00:00.000Z'));
		fetchMock.mockClear();

		expect(SessionNotification.disable()).toBe('off');
		await Promise.resolve();

		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringMatching(/^https:\/\/notifications\.example\.test\/clients\/.+\/subscription$/),
			expect.objectContaining({ method : 'DELETE' })
		);
	});

	it('reports unavailable when push support is missing', async () => {
		Object.defineProperty(window, 'PushManager', { configurable : true, value : undefined });
		const session = new TimerSession(100, 0, new Date('2026-06-15T12:00:00.000Z'), 60);

		await SessionNotification.schedule(session, new Date('2026-06-15T12:00:00.000Z'));

		expect(SessionNotification.status()).toBe('unavailable');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('reports unavailable when notification service env is missing', () => {
		vi.stubEnv('VITE_NOTIFICATION_API_URL', '');

		expect(SessionNotification.status()).toBe('unavailable');
	});
});
