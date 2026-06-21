import { describe, expect, it } from 'vitest';

import {
	DEFAULT_INCREMENT_HUNDREDTHS,
	formatDosage,
	generateDosageValues,
	generateMaxDosageValues,
	normalizeIncrement,
	snapDefaultDosage,
	snapMaxDosage
} from '@/domain/dosage';

describe('dosage', () => {
	it('generates dosage values from increment through max dosage', () => {
		expect(generateDosageValues(100, 25)).toEqual([ 25, 50, 75, 100 ]);
	});

	it('falls back to the default increment for unsupported increments', () => {
		expect(normalizeIncrement(15)).toBe(DEFAULT_INCREMENT_HUNDREDTHS);
		expect(generateDosageValues(30, 15)).toEqual([ 10, 20, 30 ]);
	});

	it('filters maximum dosage values to at least 1.0 ml', () => {
		expect(generateMaxDosageValues(50)[0]).toBe(100);
	});

	it('snaps max and default dosage to the closest valid values', () => {
		expect(snapMaxDosage(110, 25)).toBe(100);
		expect(snapDefaultDosage(110, 500, 25)).toBe(100);
	});

	it('formats dosage values with the required precision', () => {
		expect(formatDosage(100)).toBe('1.0');
		expect(formatDosage(50)).toBe('0.5');
		expect(formatDosage(25)).toBe('0.25');
	});
});
