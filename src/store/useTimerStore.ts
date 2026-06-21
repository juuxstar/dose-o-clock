import { computed, ref } from 'vue';

import {
	generateDosageValues, generateMaxDosageValues, normalizeIncrement, snapDefaultDosage, snapMaxDosage
} from '@/domain/dosage';
import { TimerSession } from '@/domain/TimerSession';
import { type DotColorStyle, loadState, removeSessionData, saveActiveSession, saveHistory, saveSetting, type TimerPosition } from '@/store/storage';

const initialState = loadState();

const activeSession             = ref<TimerSession | null>(initialState.activeSession);
const history                   = ref<TimerSession[]>(initialState.history);
const defaultUnitHundredths     = ref(initialState.defaultUnitHundredths);
const maxUnitHundredths         = ref(initialState.maxUnitHundredths);
const dosageIncrementHundredths = ref(initialState.dosageIncrementHundredths);
const dotColorStyle             = ref<DotColorStyle>(initialState.dotColorStyle);
const timerPosition             = ref<TimerPosition>(initialState.timerPosition);
const currentTime               = ref(new Date());

const dosageValues         = computed(() => generateDosageValues(maxUnitHundredths.value, dosageIncrementHundredths.value));
const maxDosageValues      = computed(() => generateMaxDosageValues(dosageIncrementHundredths.value));
const hasSessionData       = computed(() => Boolean(activeSession.value) || history.value.length > 0);
const activeElapsedSeconds = computed(() => activeSession.value?.elapsedSeconds(currentTime.value) ?? 0);

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

	function startSession(unitHundredths: number, earlierMinutes: number, now: Date = new Date()): void {
		if (activeSession.value) {
			history.value = [ activeSession.value.end(now), ...history.value ];
		}

		activeSession.value = TimerSession.create(unitHundredths, earlierMinutes * 60, now);
		currentTime.value   = now;
		persistSessions();
	}

	function deleteHistorySession(id: string): void {
		history.value = history.value.filter(session => session.id !== id);
		saveHistory(history.value);
	}

	function resetAllData(): void {
		activeSession.value = null;
		history.value       = [];
		removeSessionData();
	}

	function setDefaultDosage(value: number): void {
		defaultUnitHundredths.value = snapDefaultDosage(value, maxUnitHundredths.value, dosageIncrementHundredths.value);
		saveSetting('defaultUnitHundredths', defaultUnitHundredths.value);
	}

	function setMaxDosage(value: number): void {
		maxUnitHundredths.value     = snapMaxDosage(value, dosageIncrementHundredths.value);
		defaultUnitHundredths.value = snapDefaultDosage(
			defaultUnitHundredths.value,
			maxUnitHundredths.value,
			dosageIncrementHundredths.value
		);
		saveSetting('maxUnitHundredths', maxUnitHundredths.value);
		saveSetting('defaultUnitHundredths', defaultUnitHundredths.value);
	}

	function setDosageIncrement(value: number): void {
		dosageIncrementHundredths.value = normalizeIncrement(value);
		maxUnitHundredths.value         = snapMaxDosage(maxUnitHundredths.value, dosageIncrementHundredths.value);
		defaultUnitHundredths.value     = snapDefaultDosage(
			defaultUnitHundredths.value,
			maxUnitHundredths.value,
			dosageIncrementHundredths.value
		);
		saveSetting('dosageIncrementHundredths', dosageIncrementHundredths.value);
		saveSetting('maxUnitHundredths', maxUnitHundredths.value);
		saveSetting('defaultUnitHundredths', defaultUnitHundredths.value);
	}

	function setDotColorStyle(value: DotColorStyle): void {
		dotColorStyle.value = value;
		saveSetting('dotColorStyle', value);
	}

	function setTimerPosition(value: TimerPosition): void {
		timerPosition.value = value;
		saveSetting('timerPosition', value);
	}

	function persistSessions(): void {
		saveActiveSession(activeSession.value);
		saveHistory(history.value);
	}

	return {
		activeSession,
		history,
		currentTime,
		defaultUnitHundredths,
		maxUnitHundredths,
		dosageIncrementHundredths,
		dotColorStyle,
		timerPosition,
		dosageValues,
		maxDosageValues,
		hasSessionData,
		activeElapsedSeconds,
		tick,
		startSession,
		deleteHistorySession,
		resetAllData,
		setDefaultDosage,
		setMaxDosage,
		setDosageIncrement,
		setDotColorStyle,
		setTimerPosition,
	};
}
