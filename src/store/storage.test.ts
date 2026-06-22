import { beforeEach, describe, expect, it } from 'vitest';

import { TimerSession } from '@/domain/TimerSession';
import { loadState, saveActiveSession, saveHistory, STORAGE_KEYS } from '@/store/storage';

describe('storage', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('loads settings in dependency order and snaps invalid combinations', () => {
		localStorage.setItem(STORAGE_KEYS.dosageIncrementHundredths, '25');
		localStorage.setItem(STORAGE_KEYS.maxUnitHundredths, '110');
		localStorage.setItem(STORAGE_KEYS.defaultUnitHundredths, '124');
		localStorage.setItem(STORAGE_KEYS.timerPosition, 'center');

		expect(loadState()).toMatchObject({
			dosageIncrementHundredths : 25,
			maxUnitHundredths         : 100,
			defaultUnitHundredths     : 100,
			timerPosition             : 'center',
		});
	});

	it('loads fresh dosage defaults', () => {
		expect(loadState()).toMatchObject({ defaultUnitHundredths : 200, maxUnitHundredths : 500, timerPosition : 'top' });
	});

	it('persists active session and history', () => {
		const session = TimerSession.create(100, 0, new Date('2026-06-15T12:00:00.000Z'));

		saveActiveSession(session);
		saveHistory([ session ]);

		const loaded = loadState(new Date('2026-06-15T12:01:00.000Z'));
		expect(loaded.activeSession?.id).toBe(session.id);
		expect(loaded.activeSession).toBeInstanceOf(TimerSession);
		expect(loaded.history[0]).toBeInstanceOf(TimerSession);
		expect(loaded.history).toHaveLength(1);
	});

	it('clears active session and history on load when active session is 24 hours old', () => {
		const oldSession = TimerSession.create(100, 0, new Date('2026-06-14T12:00:00.000Z'));
		saveActiveSession(oldSession);
		saveHistory([ oldSession ]);

		const loaded = loadState(new Date('2026-06-15T12:00:00.000Z'));

		expect(loaded.activeSession).toBeNull();
		expect(loaded.history).toEqual([]);
		expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull();
		expect(localStorage.getItem(STORAGE_KEYS.history)).toBeNull();
	});
});
