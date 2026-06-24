import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('useTimerStore', () => {
	beforeEach(() => {
		localStorage.clear();
		vi.resetModules();
	});

	it('records the full overrun duration when a new session ends the active one', async () => {
		const { useTimerStore } = await import('@/store/useTimerStore');
		const store             = useTimerStore();

		store.startSession(100, 0, 60, new Date('2026-06-15T12:00:00.000Z'));
		store.startSession(100, 0, 60, new Date('2026-06-15T13:25:00.000Z'));

		expect(store.history.value).toHaveLength(1);
		expect(store.history.value[0].elapsedSeconds()).toBe(60 * 60);
		expect(store.history.value[0].recordedElapsedSeconds()).toBe(85 * 60);
	});
});
