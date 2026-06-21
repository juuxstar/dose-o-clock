export const MIN_DOSAGE_HUNDREDTHS          = 1;
export const MIN_MAX_DOSAGE_HUNDREDTHS      = 100;
export const ABSOLUTE_MAX_DOSAGE_HUNDREDTHS = 500;
export const DEFAULT_DOSAGE_HUNDREDTHS      = 200;
export const DEFAULT_MAX_DOSAGE_HUNDREDTHS  = 500;
export const DEFAULT_INCREMENT_HUNDREDTHS   = 10;
export const SUPPORTED_INCREMENT_HUNDREDTHS = [ 10, 20, 25, 50 ] as const;

export type DosageIncrementHundredths = (typeof SUPPORTED_INCREMENT_HUNDREDTHS)[number]

export function isSupportedIncrement(value: number): value is DosageIncrementHundredths {
	return SUPPORTED_INCREMENT_HUNDREDTHS.includes(value as DosageIncrementHundredths);
}

export function normalizeIncrement(value: number): DosageIncrementHundredths {
	return isSupportedIncrement(value) ? value : DEFAULT_INCREMENT_HUNDREDTHS;
}

export function generateDosageValues(maxDosageHundredths: number, incrementHundredths: number): number[] {
	const increment        = normalizeIncrement(incrementHundredths);
	const max              = Math.min(Math.max(increment, maxDosageHundredths), ABSOLUTE_MAX_DOSAGE_HUNDREDTHS);
	const values: number[] = [];

	for (let value = increment; value <= max; value += increment) {
		if (value >= MIN_DOSAGE_HUNDREDTHS) {
			values.push(value);
		}
	}

	return values;
}

export function generateMaxDosageValues(incrementHundredths: number): number[] {
	return generateDosageValues(ABSOLUTE_MAX_DOSAGE_HUNDREDTHS, incrementHundredths).filter(
		value => value >= MIN_MAX_DOSAGE_HUNDREDTHS
	);
}

export function closestValue(target: number, values: number[]): number {
	if (values.length === 0) {
		throw new Error('closestValue requires at least one candidate');
	}

	return values.reduce((closest, value) => {
		const currentDistance = Math.abs(value - target);
		const closestDistance = Math.abs(closest - target);

		if (currentDistance < closestDistance) {
			return value;
		}

		if (currentDistance === closestDistance && value < closest) {
			return value;
		}

		return closest;
	}, values[0]);
}

export function snapMaxDosage(maxDosageHundredths: number, incrementHundredths: number): number {
	return closestValue(maxDosageHundredths, generateMaxDosageValues(incrementHundredths));
}

export function snapDefaultDosage(defaultDosageHundredths: number, maxDosageHundredths: number, incrementHundredths: number): number {
	return closestValue(defaultDosageHundredths, generateDosageValues(maxDosageHundredths, incrementHundredths));
}

export function formatDosage(valueHundredths: number): string {
	if (valueHundredths % 100 === 0 || valueHundredths % 10 === 0) {
		return (valueHundredths / 100).toFixed(1);
	}

	return (valueHundredths / 100).toFixed(2);
}
