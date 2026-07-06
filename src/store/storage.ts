import { Dosage }       from '@/domain/Dosage';
import { TimerSession } from '@/domain/TimerSession';

export type TimerPosition = 'top' | 'center'
export type TimerRingShape = 'dots' | 'darts' | 'diamond' | 'bars'

export interface PersistedState {
	activeSession: TimerSession | null;
	history: TimerSession[];
	defaultUnitHundredths: number;
	maxUnitHundredths: number;
	dosageIncrementHundredths: number;
	timerPosition: TimerPosition;
	timerRingShape: TimerRingShape;
}

export const storageKeys = {
	activeSession             : 'dose-o-clock.active-session',
	history                   : 'dose-o-clock.history',
	defaultUnitHundredths     : 'dose-o-clock.default-unit-hundredths',
	maxUnitHundredths         : 'dose-o-clock.max-unit-hundredths',
	dosageIncrementHundredths : 'dose-o-clock.dosage-increment-hundredths',
	timerPosition             : 'dose-o-clock.timer-position',
	timerRingShape            : 'dose-o-clock.timer-ring-shape',
} as const;

export function loadState(now: Date = new Date()): PersistedState {
	const dosageIncrementHundredths = Dosage.normalizeIncrement(
		readNumber(storageKeys.dosageIncrementHundredths, Dosage.defaultIncrement)
	);
	const maxUnitHundredths = Dosage.snapMax(
		readNumber(storageKeys.maxUnitHundredths, Dosage.defaultMaxHundredths),
		dosageIncrementHundredths
	);
	const defaultUnitHundredths = Dosage.snapDefault(
		readNumber(storageKeys.defaultUnitHundredths, Dosage.defaultHundredths),
		maxUnitHundredths,
		dosageIncrementHundredths
	);
	const timerPosition  = readTimerPosition();
	const timerRingShape = readTimerRingShape();
	const activeSession  = readSession(storageKeys.activeSession);
	const history        = readHistory();

	if (activeSession && activeSession.isAtLeast24HoursOld(now)) {
		removeSessionData();
		return {
			activeSession : null,
			history       : [],
			defaultUnitHundredths,
			maxUnitHundredths,
			dosageIncrementHundredths,
			timerPosition,
			timerRingShape,
		};
	}

	return {
		activeSession,
		history,
		defaultUnitHundredths,
		maxUnitHundredths,
		dosageIncrementHundredths,
		timerPosition,
		timerRingShape,
	};
}

export function saveActiveSession(session: TimerSession | null): void {
	if (session) {
		localStorage.setItem(storageKeys.activeSession, JSON.stringify(session));
	}
	else {
		localStorage.removeItem(storageKeys.activeSession);
	}
}

export function saveHistory(history: TimerSession[]): void {
	localStorage.setItem(storageKeys.history, JSON.stringify(history));
}

export function saveSetting(key: keyof typeof storageKeys, value: number | string): void {
	localStorage.setItem(storageKeys[key], String(value));
}

export function removeSessionData(): void {
	localStorage.removeItem(storageKeys.activeSession);
	localStorage.removeItem(storageKeys.history);
}

function readNumber(key: string, fallback: number): number {
	const raw = localStorage.getItem(key);

	if (raw === null) {
		return fallback;
	}

	const value = Number(raw);
	return Number.isFinite(value) ? value : fallback;
}

function readSession(key: string): TimerSession | null {
	const decoded = readJson(localStorage.getItem(key));
	return TimerSession.isTimerSession(decoded) ? new TimerSession(decoded) : null;
}

function readHistory(): TimerSession[] {
	const decoded = readJson(localStorage.getItem(storageKeys.history));
	return Array.isArray(decoded) ? decoded.filter(TimerSession.isTimerSession).map(session => new TimerSession(session)) : [];
}

function readTimerPosition(): TimerPosition {
	const value = localStorage.getItem(storageKeys.timerPosition);
	return value === 'top' || value === 'center' ? value : 'top';
}

function readTimerRingShape(): TimerRingShape {
	const value = localStorage.getItem(storageKeys.timerRingShape);
	return value === 'dots' || value === 'darts' || value === 'diamond' || value === 'bars' ? value : 'dots';
}

function readJson(raw: string | null): unknown {
	if (!raw) {
		return null;
	}

	try {
		return JSON.parse(raw);
	}
	catch {
		return null;
	}
}
