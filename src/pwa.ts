import { registerSW } from 'virtual:pwa-register';

export const updateServiceWorker = registerSW({ immediate : true });

export async function refreshPwa(): Promise<void> {
	if ('serviceWorker' in navigator) {
		const registration = await navigator.serviceWorker.getRegistration();

		if (registration && navigator.onLine) {
			await registration.update().catch(() => undefined);
		}

		await updateServiceWorker(true).catch(() => undefined);
	}

	window.location.reload();
}
