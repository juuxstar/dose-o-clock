export const MAX_ELAPSED_SECONDS = 4 * 60 * 60;
export const AUTO_RESET_SECONDS = 24 * 60 * 60;
export const DEFAULT_DURATION_SECONDS = 60 * 60;

export class TimerSession {

	readonly id: string;
	readonly unitHundredths: number;
	readonly startedAt: string;
	readonly earlierOffsetSeconds: number;
	readonly durationSeconds: number;
	readonly endedAt?: string;

	constructor(values: TimerSessionValues);
	constructor(unitHundredths: number, earlierOffsetSeconds: number, now?: Date, durationSeconds?: number);
	constructor(
		valuesOrUnitHundredths: TimerSessionValues | number,
		earlierOffsetSeconds?: number,
		now: Date = new Date(),
		durationSeconds = DEFAULT_DURATION_SECONDS
	) {
		const values = typeof valuesOrUnitHundredths === 'number'
			? {
				id                   : createSessionId(),
				startedAt            : now.toISOString(),
				unitHundredths       : valuesOrUnitHundredths,
				earlierOffsetSeconds : earlierOffsetSeconds ?? 0,
				durationSeconds,
			}
			: valuesOrUnitHundredths;

		this.id                   = values.id;
		this.unitHundredths       = values.unitHundredths;
		this.startedAt            = values.startedAt;
		this.earlierOffsetSeconds = values.earlierOffsetSeconds;
		this.durationSeconds      = values.durationSeconds ?? MAX_ELAPSED_SECONDS;
		this.endedAt              = values.endedAt;
	}

	static isTimerSession(value: unknown): value is TimerSessionValues {
		if (!value || typeof value !== 'object') {
			return false;
		}

		const candidate = value as Partial<TimerSessionValues>;
		return (
			typeof candidate.id === 'string'
			&& typeof candidate.unitHundredths === 'number'
			&& typeof candidate.startedAt === 'string'
			&& !Number.isNaN(new Date(candidate.startedAt).getTime())
			&& typeof candidate.earlierOffsetSeconds === 'number'
			&& (candidate.durationSeconds === undefined || (typeof candidate.durationSeconds === 'number' && candidate.durationSeconds > 0))
			&& (candidate.endedAt === undefined
		  || (typeof candidate.endedAt === 'string' && !Number.isNaN(new Date(candidate.endedAt).getTime())))
		);
	}

	elapsedSeconds(now: Date = new Date()): number {
		return clamp(this.recordedElapsedSeconds(now), 0, this.durationSeconds);
	}

	recordedElapsedSeconds(now: Date = new Date()): number {
		const end     = this.endedAt ? new Date(this.endedAt) : now;
		const started = new Date(this.startedAt);
		const elapsed = (end.getTime() - started.getTime()) / 1000 + this.earlierOffsetSeconds;

		return Math.max(0, elapsed);
	}

	visualElapsedSeconds(now: Date = new Date()): number {
		const started = new Date(this.startedAt);
		const elapsed = (now.getTime() - started.getTime()) / 1000 + this.earlierOffsetSeconds;

		return Math.max(0, elapsed);
	}

	automaticStopDate(): Date {
		const started          = new Date(this.startedAt);
		const remainingSeconds = Math.max(0, this.durationSeconds - this.earlierOffsetSeconds);

		return new Date(started.getTime() + remainingSeconds * 1000);
	}

	shouldAutoStop(now: Date = new Date()): boolean {
		return !this.endedAt && this.elapsedSeconds(now) >= this.durationSeconds;
	}

	withAutomaticStop(): TimerSession {
		return new TimerSession({ ...this, endedAt : this.automaticStopDate().toISOString() });
	}

	end(now: Date = new Date()): TimerSession {
		if (this.endedAt) {
			return this;
		}

		return new TimerSession({ ...this, endedAt : now.toISOString() });
	}

	isAtLeast24HoursOld(now: Date = new Date()): boolean {
		const started = new Date(this.startedAt);
		return now.getTime() - started.getTime() >= AUTO_RESET_SECONDS * 1000;
	}

	toJSON(): TimerSessionValues {
		return {
			id                   : this.id,
			unitHundredths       : this.unitHundredths,
			startedAt            : this.startedAt,
			earlierOffsetSeconds : this.earlierOffsetSeconds,
			durationSeconds      : this.durationSeconds,
			...(this.endedAt ? { endedAt : this.endedAt } : {}),
		};
	}

}

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(Math.max(value, minimum), maximum);
}

function createSessionId(): string {
	if (globalThis.crypto?.randomUUID) {
		return globalThis.crypto.randomUUID();
	}

	const bytes = new Uint8Array(16);

	if (globalThis.crypto?.getRandomValues) {
		globalThis.crypto.getRandomValues(bytes);
	}
	else {
		for (let index = 0; index < bytes.length; index += 1) {
			bytes[index] = Math.floor(Math.random() * 256);
		}
	}

	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;

	const hex = [ ...bytes ].map(value => value.toString(16).padStart(2, '0')).join('');

	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export interface TimerSessionValues {
	id: string;
	unitHundredths: number;
	startedAt: string;
	earlierOffsetSeconds: number;
	durationSeconds?: number;
	endedAt?: string;
}
