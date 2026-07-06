import { beforeEach, describe, expect, it } from 'vitest';

import { TimerSession } from '@/domain/TimerSession';
import { loadState, saveActiveSession, saveHistory, storageKeys } from '@/store/storage';

describe('storage', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('loads settings in dependency order and snaps invalid combinations', () => {
		localStorage.setItem(storageKeys.dosageIncrementHundredths, '25');
		localStorage.setItem(storageKeys.maxUnitHundredths, '110');
		localStorage.setItem(storageKeys.defaultUnitHundredths, '124');
		localStorage.setItem(storageKeys.timerPosition, 'center');
		localStorage.setItem(storageKeys.timerRingShape, 'bars');

		expect(loadState()).toMatchObject({
			dosageIncrementHundredths : 25,
			maxUnitHundredths         : 100,
			defaultUnitHundredths     : 100,
			timerPosition             : 'center',
			timerRingShape            : 'bars',
		});
	});

	it('loads fresh dosage defaults', () => {
		expect(loadState()).toMatchObject({
			defaultUnitHundredths : 200,
			maxUnitHundredths     : 500,
			timerPosition         : 'top',
			timerRingShape        : 'dots',
		});
	});

	it('falls back to dots for unknown timer ring shapes', () => {
		localStorage.setItem(storageKeys.timerRingShape, 'squares');

		expect(loadState()).toMatchObject({ timerRingShape : 'dots' });
	});

	it('loads newer timer ring shapes', () => {
		for (const shape of [ 'capsules', 'ticks', 'petals', 'minimal' ]) {
			localStorage.setItem(storageKeys.timerRingShape, shape);

			expect(loadState()).toMatchObject({ timerRingShape : shape });
		}
	});

	it('persists active session and history', () => {
		const session = new TimerSession(100, 0, new Date('2026-06-15T12:00:00.000Z'));

		saveActiveSession(session);
		saveHistory([ session ]);

		const loaded = loadState(new Date('2026-06-15T12:01:00.000Z'));
		expect(loaded.activeSession?.id).toBe(session.id);
		expect(loaded.activeSession).toBeInstanceOf(TimerSession);
		expect(loaded.history[0]).toBeInstanceOf(TimerSession);
		expect(loaded.history).toHaveLength(1);
	});

	it('clears active session and history on load when active session is 24 hours old', () => {
		const oldSession = new TimerSession(100, 0, new Date('2026-06-14T12:00:00.000Z'));
		saveActiveSession(oldSession);
		saveHistory([ oldSession ]);

		const loaded = loadState(new Date('2026-06-15T12:00:00.000Z'));

		expect(loaded.activeSession).toBeNull();
		expect(loaded.history).toEqual([]);
		expect(localStorage.getItem(storageKeys.activeSession)).toBeNull();
		expect(localStorage.getItem(storageKeys.history)).toBeNull();
	});
});
