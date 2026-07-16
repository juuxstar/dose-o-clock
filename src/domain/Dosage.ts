const supportedIncrementHundredths = [ 10, 20, 25, 50 ] as const;

export type DosageIncrementHundredths = (typeof supportedIncrementHundredths)[number]

export class Dosage {

	static readonly minHundredths          = 1;
	static readonly minMaxHundredths       = 100;
	static readonly absoluteMaxHundredths  = 1000;
	static readonly defaultHundredths      = 200;
	static readonly defaultMaxHundredths   = 500;
	static readonly defaultIncrement       = 10;
	static readonly supportedIncrementValues = supportedIncrementHundredths;

	static isSupportedIncrement(value: number): value is DosageIncrementHundredths {
		return this.supportedIncrementValues.includes(value as DosageIncrementHundredths);
	}

	static normalizeIncrement(value: number): DosageIncrementHundredths {
		return this.isSupportedIncrement(value) ? value : this.defaultIncrement;
	}

	static generateValues(maxDosageHundredths: number, incrementHundredths: number): number[] {
		const increment        = this.normalizeIncrement(incrementHundredths);
		const max              = Math.min(Math.max(increment, maxDosageHundredths), this.absoluteMaxHundredths);
		const values: number[] = [];

		for (let value = increment; value <= max; value += increment) {
			if (value >= this.minHundredths) {
				values.push(value);
			}
		}

		return values;
	}

	static generateMaxValues(incrementHundredths: number): number[] {
		return this.generateValues(this.absoluteMaxHundredths, incrementHundredths).filter(
			value => value >= this.minMaxHundredths
		);
	}

	static closestValue(target: number, values: number[]): number {
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

	static snapMax(maxDosageHundredths: number, incrementHundredths: number): number {
		return this.closestValue(maxDosageHundredths, this.generateMaxValues(incrementHundredths));
	}

	static snapDefault(defaultDosageHundredths: number, maxDosageHundredths: number, incrementHundredths: number): number {
		return this.closestValue(defaultDosageHundredths, this.generateValues(maxDosageHundredths, incrementHundredths));
	}

	static format(valueHundredths: number): string {
		if (valueHundredths % 100 === 0 || valueHundredths % 10 === 0) {
			return (valueHundredths / 100).toFixed(1);
		}

		return (valueHundredths / 100).toFixed(2);
	}

}
