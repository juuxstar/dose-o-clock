import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_DURATION_SECONDS, MAX_ELAPSED_SECONDS, TimerSession } from '@/domain/TimerSession';

describe('TimerSession', () => {
	it('clamps elapsed time from zero through the default duration', () => {
		const startedAt = new Date('2026-06-15T12:00:00.000Z');
		const session   = new TimerSession(100, 0, startedAt);

		expect(session.elapsedSeconds(new Date('2026-06-15T11:59:00.000Z'))).toBe(0);
		expect(session.elapsedSeconds(new Date('2026-06-15T13:30:00.000Z'))).toBe(DEFAULT_DURATION_SECONDS);
	});

	it('includes earlier offset in elapsed time', () => {
		const session = new TimerSession(100, 30 * 60, new Date('2026-06-15T12:00:00.000Z'));

		expect(session.elapsedSeconds(new Date('2026-06-15T12:00:10.000Z'))).toBe(1810);
	});

	it('keeps visual elapsed time moving beyond the selected duration', () => {
		const session = new TimerSession(100, 0, new Date('2026-06-15T12:00:00.000Z'), 90 * 60);
		const stopped = session.withAutomaticStop();

		expect(stopped.elapsedSeconds(new Date('2026-06-15T15:00:00.000Z'))).toBe(90 * 60);
		expect(stopped.visualElapsedSeconds(new Date('2026-06-15T15:00:00.000Z'))).toBe(3 * 60 * 60);
	});

	it('keeps the recorded elapsed time for sessions ended after their selected duration', () => {
		const session = new TimerSession(100, 0, new Date('2026-06-15T12:00:00.000Z'), 60 * 60)
			.end(new Date('2026-06-15T13:25:00.000Z'));

		expect(session.elapsedSeconds(new Date('2026-06-15T14:00:00.000Z'))).toBe(60 * 60);
		expect(session.recordedElapsedSeconds(new Date('2026-06-15T14:00:00.000Z'))).toBe(85 * 60);
	});

	it('calculates automatic stop date from remaining elapsed time', () => {
		const session = new TimerSession(100, 30 * 60, new Date('2026-06-15T12:00:00.000Z'), 90 * 60);

		expect(session.automaticStopDate().toISOString()).toBe('2026-06-15T13:00:00.000Z');
	});

	it('marks sessions stopped once their selected duration is reached', () => {
		const session = new TimerSession(100, 0, new Date('2026-06-15T12:00:00.000Z'));

		expect(session.shouldAutoStop(new Date('2026-06-15T13:00:00.000Z'))).toBe(true);
		expect(session.withAutomaticStop().endedAt).toBe('2026-06-15T13:00:00.000Z');
	});

	it('uses the former four-hour duration for legacy session data', () => {
		const session = new TimerSession({
			id                   : 'legacy',
			unitHundredths       : 100,
			startedAt            : '2026-06-15T12:00:00.000Z',
			earlierOffsetSeconds : 0,
		});

		expect(session.durationSeconds).toBe(MAX_ELAPSED_SECONDS);
		expect(session.elapsedSeconds(new Date('2026-06-15T16:30:00.000Z'))).toBe(MAX_ELAPSED_SECONDS);
	});

	it('preserves an existing endedAt value when ending a session', () => {
		const session = new TimerSession({
			...new TimerSession(100, 0, new Date('2026-06-15T12:00:00.000Z')),
			endedAt : '2026-06-15T13:00:00.000Z',
		});

		expect(session.end(new Date('2026-06-15T14:00:00.000Z')).endedAt).toBe('2026-06-15T13:00:00.000Z');
	});

	it('detects sessions started at least 24 real hours ago', () => {
		const session = new TimerSession(100, 90 * 60, new Date('2026-06-14T12:00:00.000Z'));

		expect(session.isAtLeast24HoursOld(new Date('2026-06-15T11:59:59.000Z'))).toBe(false);
		expect(session.isAtLeast24HoursOld(new Date('2026-06-15T12:00:00.000Z'))).toBe(true);
	});

	it('uses stable UUIDs from the platform', () => {
		vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('11111111-1111-4111-8111-111111111111');

		expect(new TimerSession(100, 0).id).toBe('11111111-1111-4111-8111-111111111111');
	});

	it('falls back to a generated UUID when randomUUID is unavailable', () => {
		const originalRandomUUID = crypto.randomUUID;

		Object.defineProperty(crypto, 'randomUUID', { configurable : true, value : undefined });

		try {
			expect(new TimerSession(100, 0).id).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
			);
		}
		finally {
			Object.defineProperty(crypto, 'randomUUID', { configurable : true, value : originalRandomUUID });
		}
	});
});
