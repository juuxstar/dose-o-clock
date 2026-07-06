import { computed, ref } from 'vue';

import { Dosage }              from '@/domain/Dosage';
import { SessionNotification } from '@/domain/SessionNotification';
import { TimerSession }        from '@/domain/TimerSession';
import { loadState, removeSessionData, saveActiveSession, saveHistory, saveSetting, type TimerPosition, type TimerRingShape } from '@/store/storage';

const initialState = loadState();

const activeSession             = ref<TimerSession | null>(initialState.activeSession);
const history                   = ref<TimerSession[]>(initialState.history);
const defaultUnitHundredths     = ref(initialState.defaultUnitHundredths);
const maxUnitHundredths         = ref(initialState.maxUnitHundredths);
const dosageIncrementHundredths = ref(initialState.dosageIncrementHundredths);
const timerPosition             = ref<TimerPosition>(initialState.timerPosition);
const timerRingShape            = ref<TimerRingShape>(initialState.timerRingShape);
const currentTime               = ref(new Date());

const dosageValues         = computed(() => Dosage.generateValues(maxUnitHundredths.value, dosageIncrementHundredths.value));
const maxDosageValues      = computed(() => Dosage.generateMaxValues(dosageIncrementHundredths.value));
const hasSessionData       = computed(() => Boolean(activeSession.value) || history.value.length > 0);
const activeElapsedSeconds = computed(() => activeSession.value?.elapsedSeconds(currentTime.value) ?? 0);
const visualElapsedSeconds = computed(() => activeSession.value?.visualElapsedSeconds(currentTime.value) ?? 0);

void SessionNotification.schedule(activeSession.value, currentTime.value).catch(() => undefined);

export function useTimerStore() {
	function tick(now: Date = new Date()): void {
		currentTime.value = now;

		if (activeSession.value && activeSession.value.isAtLeast24HoursOld(now)) {
			resetAllData();
			return;
		}

		if (activeSession.value && activeSession.value.shouldAutoStop(now)) {
			activeSession.value = activeSession.value.withAutomaticStop();
			saveActiveSession(activeSession.value);
		}
	}

	function startSession(unitHundredths: number, earlierMinutes: number, durationMinutes: number, now: Date = new Date()): void {
		if (activeSession.value) {
			history.value = [ activeSession.value.end(now, { preserveExisting : false }), ...history.value ];
		}

		activeSession.value = new TimerSession(unitHundredths, earlierMinutes * 60, now, durationMinutes * 60);
		currentTime.value   = now;
		persistSessions();
		void SessionNotification.schedule(activeSession.value, now).catch(() => undefined);
	}

	function deleteHistorySession(id: string): void {
		history.value = history.value.filter(session => session.id !== id);
		saveHistory(history.value);
	}

	function resetAllData(): void {
		activeSession.value = null;
		history.value       = [];
		removeSessionData();
		SessionNotification.clearState();
	}

	function setDefaultDosage(value: number): void {
		defaultUnitHundredths.value = Dosage.snapDefault(value, maxUnitHundredths.value, dosageIncrementHundredths.value);
		saveSetting('defaultUnitHundredths', defaultUnitHundredths.value);
	}

	function setMaxDosage(value: number): void {
		maxUnitHundredths.value     = Dosage.snapMax(value, dosageIncrementHundredths.value);
		defaultUnitHundredths.value = Dosage.snapDefault(
			defaultUnitHundredths.value,
			maxUnitHundredths.value,
			dosageIncrementHundredths.value
		);
		saveSetting('maxUnitHundredths', maxUnitHundredths.value);
		saveSetting('defaultUnitHundredths', defaultUnitHundredths.value);
	}

	function setDosageIncrement(value: number): void {
		dosageIncrementHundredths.value = Dosage.normalizeIncrement(value);
		maxUnitHundredths.value         = Dosage.snapMax(maxUnitHundredths.value, dosageIncrementHundredths.value);
		defaultUnitHundredths.value     = Dosage.snapDefault(
			defaultUnitHundredths.value,
			maxUnitHundredths.value,
			dosageIncrementHundredths.value
		);
		saveSetting('dosageIncrementHundredths', dosageIncrementHundredths.value);
		saveSetting('maxUnitHundredths', maxUnitHundredths.value);
		saveSetting('defaultUnitHundredths', defaultUnitHundredths.value);
	}

	function setTimerPosition(value: TimerPosition): void {
		timerPosition.value = value;
		saveSetting('timerPosition', value);
	}

	function setTimerRingShape(value: TimerRingShape): void {
		timerRingShape.value = value;
		saveSetting('timerRingShape', value);
	}

	function persistSessions(): void {
		saveActiveSession(activeSession.value);
		saveHistory(history.value);
	}

	function refreshSessionNotificationSchedule(): void {
		void SessionNotification.schedule(activeSession.value, currentTime.value).catch(() => undefined);
	}

	function clearSessionNotificationSchedule(): void {
		void SessionNotification.clearSchedule().catch(() => undefined);
	}

	return {
		activeSession,
		history,
		currentTime,
		defaultUnitHundredths,
		maxUnitHundredths,
		dosageIncrementHundredths,
		timerPosition,
		timerRingShape,
		dosageValues,
		maxDosageValues,
		hasSessionData,
		activeElapsedSeconds,
		visualElapsedSeconds,
		tick,
		startSession,
		deleteHistorySession,
		resetAllData,
		refreshSessionNotificationSchedule,
		clearSessionNotificationSchedule,
		setDefaultDosage,
		setMaxDosage,
		setDosageIncrement,
		setTimerPosition,
		setTimerRingShape,
	};
}
