import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionNotification } from '@/domain/SessionNotification';
import { TimerSession }        from '@/domain/TimerSession';

describe('SessionNotification', () => {
	let permission: NotificationPermission = 'granted';
	let showNotification: ReturnType<typeof vi.fn>;
	let requestPermission: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.useFakeTimers();
		localStorage.clear();
		showNotification  = vi.fn().mockResolvedValue(undefined);
		requestPermission = vi.fn(async () => permission);
		permission        = 'granted';

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
		Object.defineProperty(navigator, 'serviceWorker', {
			configurable : true,
			value        : {
				ready : Promise.resolve({ showNotification }),
			},
		});
	});

	afterEach(() => {
		SessionNotification.clearSchedule();
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('schedules for the remaining session time', async () => {
		const session = new TimerSession(100, 0, new Date('2026-06-15T12:00:00.000Z'), 60);

		SessionNotification.schedule(session, new Date('2026-06-15T12:00:30.000Z'));
		await vi.advanceTimersByTimeAsync(29_999);

		expect(showNotification).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);

		expect(showNotification).toHaveBeenCalledWith('Dose-o-clock', expect.objectContaining({
			body : 'Session duration complete.',
			tag  : 'dose-o-clock-session-complete',
		}));
	});

	it('fires immediately for overdue active sessions', async () => {
		const session = new TimerSession(100, 0, new Date('2026-06-15T12:00:00.000Z'), 60);

		SessionNotification.schedule(session, new Date('2026-06-15T12:05:00.000Z'));
		await vi.advanceTimersByTimeAsync(0);

		expect(showNotification).toHaveBeenCalledOnce();
	});

	it('does not notify twice for the same session id', async () => {
		const session = new TimerSession(100, 0, new Date('2026-06-15T12:00:00.000Z'), 60);

		SessionNotification.schedule(session, new Date('2026-06-15T12:05:00.000Z'));
		await vi.advanceTimersByTimeAsync(0);
		SessionNotification.schedule(session, new Date('2026-06-15T12:06:00.000Z'));
		await vi.advanceTimersByTimeAsync(0);

		expect(showNotification).toHaveBeenCalledOnce();
	});

	it('clears replaced timers when a new session starts', async () => {
		const firstSession  = new TimerSession(100, 0, new Date('2026-06-15T12:00:00.000Z'), 60);
		const secondSession = new TimerSession(100, 0, new Date('2026-06-15T12:00:10.000Z'), 60);

		SessionNotification.schedule(firstSession, new Date('2026-06-15T12:00:00.000Z'));
		SessionNotification.schedule(secondSession, new Date('2026-06-15T12:00:10.000Z'));
		await vi.advanceTimersByTimeAsync(59_999);

		expect(showNotification).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);

		expect(showNotification).toHaveBeenCalledWith('Dose-o-clock', expect.objectContaining({
			data : expect.objectContaining({ sessionId : secondSession.id }),
		}));
	});

	it('no-ops when notifications are unavailable', async () => {
		Object.defineProperty(window, 'isSecureContext', { configurable : true, value : false });
		const session = new TimerSession(100, 0, new Date('2026-06-15T12:00:00.000Z'), 60);

		SessionNotification.schedule(session, new Date('2026-06-15T12:05:00.000Z'));
		await vi.advanceTimersByTimeAsync(0);

		expect(SessionNotification.status()).toBe('unavailable');
		expect(showNotification).not.toHaveBeenCalled();
	});

	it('requests permission from a user action helper', async () => {
		permission = 'default';
		requestPermission.mockImplementationOnce(async () => {
			permission = 'granted';
			return permission;
		});

		await expect(SessionNotification.requestPermission()).resolves.toBe('on');

		expect(requestPermission).toHaveBeenCalledOnce();
	});

	it('clears pending timers and notification state', async () => {
		const session = new TimerSession(100, 0, new Date('2026-06-15T12:00:00.000Z'), 60);

		SessionNotification.schedule(session, new Date('2026-06-15T12:00:00.000Z'));
		SessionNotification.clearState();
		await vi.advanceTimersByTimeAsync(60_000);

		expect(showNotification).not.toHaveBeenCalled();
	});
});
