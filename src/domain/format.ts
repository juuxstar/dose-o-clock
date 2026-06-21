export function formatDuration(totalSeconds: number): string {
	const seconds          = Math.max(0, Math.floor(totalSeconds));
	const hours            = Math.floor(seconds / 3600);
	const minutes          = Math.floor((seconds % 3600) / 60);
	const remainingSeconds = seconds % 60;

	if (hours > 0) {
		return `${hours}:${pad(minutes)}:${pad(remainingSeconds)}`;
	}

	return `${pad(minutes)}:${pad(remainingSeconds)}`;
}

export function formatShortTime(dateIso: string): string {
	return new Intl.DateTimeFormat(undefined, { hour : 'numeric', minute : '2-digit' }).format(new Date(dateIso));
}

function pad(value: number): string {
	return value.toString().padStart(2, '0');
}
