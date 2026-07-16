import { beforeEach, describe, expect, it } from 'vitest';

import { TimerSession } from '@/domain/TimerSession';
import { loadState, loadString, saveActiveSession, saveHistory, saveString, storageKeys, TimerRingShape } from '@/store/storage';

describe('storage', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('loads settings in dependency order and snaps invalid combinations', () => {
		localStorage.setItem(storageKeys.dosageIncrementHundredths, '25');
		localStorage.setItem(storageKeys.maxUnitHundredths, '110');
		localStorage.setItem(storageKeys.defaultUnitHundredths, '124');
		localStorage.setItem(storageKeys.timerPosition, 'center');
		localStorage.setItem(storageKeys.timerRingShape, TimerRingShape.Bars);

		expect(loadState()).toMatchObject({
			dosageIncrementHundredths : 25,
			maxUnitHundredths         : 100,
			defaultUnitHundredths     : 100,
			timerPosition             : 'center',
			timerRingShape            : TimerRingShape.Bars,
		});
	});

	it('loads fresh dosage defaults', () => {
		expect(loadState()).toMatchObject({
			defaultUnitHundredths : 200,
			maxUnitHundredths     : 500,
			timerPosition         : 'top',
			timerRingShape        : TimerRingShape.Dots,
		});
	});

	it('falls back to dots for unknown timer ring shapes', () => {
		localStorage.setItem(storageKeys.timerRingShape, 'squares');

		expect(loadState()).toMatchObject({ timerRingShape : TimerRingShape.Dots });
	});

	it('loads newer timer ring shapes', () => {
		for (const shape of Object.values(TimerRingShape)) {
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

	it('persists string values by shared storage key', () => {
		expect(loadString('lastSeenVersion')).toBe('');

		saveString('lastSeenVersion', '1.4.0');

		expect(loadString('lastSeenVersion')).toBe('1.4.0');
		expect(localStorage.getItem(storageKeys.lastSeenVersion)).toBe('1.4.0');
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
