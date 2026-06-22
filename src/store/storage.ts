import {
	DEFAULT_DOSAGE_HUNDREDTHS,
	DEFAULT_INCREMENT_HUNDREDTHS,
	DEFAULT_MAX_DOSAGE_HUNDREDTHS,
	normalizeIncrement,
	snapDefaultDosage,
	snapMaxDosage
} from '@/domain/dosage';
import { TimerSession } from '@/domain/TimerSession';

export type TimerPosition = 'top' | 'center'

export interface PersistedState {
	activeSession: TimerSession | null;
	history: TimerSession[];
	defaultUnitHundredths: number;
	maxUnitHundredths: number;
	dosageIncrementHundredths: number;
	timerPosition: TimerPosition;
}

export const STORAGE_KEYS = {
	activeSession             : 'dose-o-clock.active-session',
	history                   : 'dose-o-clock.history',
	defaultUnitHundredths     : 'dose-o-clock.default-unit-hundredths',
	maxUnitHundredths         : 'dose-o-clock.max-unit-hundredths',
	dosageIncrementHundredths : 'dose-o-clock.dosage-increment-hundredths',
	timerPosition             : 'dose-o-clock.timer-position',
} as const;

export function loadState(now: Date = new Date()): PersistedState {
	const dosageIncrementHundredths = normalizeIncrement(
		readNumber(STORAGE_KEYS.dosageIncrementHundredths, DEFAULT_INCREMENT_HUNDREDTHS)
	);
	const maxUnitHundredths = snapMaxDosage(
		readNumber(STORAGE_KEYS.maxUnitHundredths, DEFAULT_MAX_DOSAGE_HUNDREDTHS),
		dosageIncrementHundredths
	);
	const defaultUnitHundredths = snapDefaultDosage(
		readNumber(STORAGE_KEYS.defaultUnitHundredths, DEFAULT_DOSAGE_HUNDREDTHS),
		maxUnitHundredths,
		dosageIncrementHundredths
	);
	const timerPosition = readTimerPosition();
	const activeSession = readSession(STORAGE_KEYS.activeSession);
	const history       = readHistory();

	if (activeSession && activeSession.isAtLeast24HoursOld(now)) {
		removeSessionData();
		return {
			activeSession : null,
			history       : [],
			defaultUnitHundredths,
			maxUnitHundredths,
			dosageIncrementHundredths,
			timerPosition,
		};
	}

	return { activeSession, history, defaultUnitHundredths, maxUnitHundredths, dosageIncrementHundredths, timerPosition };
}

export function saveActiveSession(session: TimerSession | null): void {
	if (session) {
		localStorage.setItem(STORAGE_KEYS.activeSession, JSON.stringify(session));
	}
	else {
		localStorage.removeItem(STORAGE_KEYS.activeSession);
	}
}

export function saveHistory(history: TimerSession[]): void {
	localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
}

export function saveSetting(key: keyof typeof STORAGE_KEYS, value: number | string): void {
	localStorage.setItem(STORAGE_KEYS[key], String(value));
}

export function removeSessionData(): void {
	localStorage.removeItem(STORAGE_KEYS.activeSession);
	localStorage.removeItem(STORAGE_KEYS.history);
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
	return TimerSession.isTimerSession(decoded) ? TimerSession.from(decoded) : null;
}

function readHistory(): TimerSession[] {
	const decoded = readJson(localStorage.getItem(STORAGE_KEYS.history));
	return Array.isArray(decoded) ? decoded.filter(TimerSession.isTimerSession).map(session => TimerSession.from(session)) : [];
}

function readTimerPosition(): TimerPosition {
	const value = localStorage.getItem(STORAGE_KEYS.timerPosition);
	return value === 'top' || value === 'center' ? value : 'top';
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
