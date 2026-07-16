import { describe, expect, it } from 'vitest';

import { Dosage } from '@/domain/Dosage';

describe('dosage', () => {
	it('generates dosage values from increment through max dosage', () => {
		expect(Dosage.generateValues(100, 25)).toEqual([ 25, 50, 75, 100 ]);
	});

	it('falls back to the default increment for unsupported increments', () => {
		expect(Dosage.normalizeIncrement(15)).toBe(Dosage.defaultIncrement);
		expect(Dosage.generateValues(30, 15)).toEqual([ 10, 20, 30 ]);
	});

	it('filters maximum dosage values to at least 1.0 ml', () => {
		expect(Dosage.generateMaxValues(50)[0]).toBe(100);
	});

	it('allows maximum dosage values up to 10.0 ml', () => {
		const values = Dosage.generateMaxValues(50);
		expect(values[values.length - 1]).toBe(1000);
	});

	it('snaps max and default dosage to the closest valid values', () => {
		expect(Dosage.snapMax(1200, 25)).toBe(1000);
		expect(Dosage.snapDefault(110, 500, 25)).toBe(100);
	});

	it('formats dosage values with the required precision', () => {
		expect(Dosage.format(100)).toBe('1.0');
		expect(Dosage.format(50)).toBe('0.5');
		expect(Dosage.format(25)).toBe('0.25');
	});
});
