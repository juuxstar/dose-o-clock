self.addEventListener('push', event => {
	event.waitUntil((async () => {
		const payload = readPushPayload(event);

		await self.registration.showNotification(payload.title || 'Timer finished', {
			badge              : '/icons/icon.svg',
			body               : payload.body || `Timer started at ${payload.startedAtLabel || 'the scheduled time'} has finished.`,
			data               : { sessionId : payload.sessionId, url : payload.url || '/' },
			icon               : '/icons/icon.svg',
			requireInteraction : true,
			tag                : 'dose-o-clock-session-complete',
		});

		if (payload.ackUrl && payload.ackToken) {
			await fetch(payload.ackUrl, {
				body    : JSON.stringify({ ackToken : payload.ackToken }),
				headers : { 'Content-Type' : 'application/json' },
				method  : 'POST',
			}).catch(() => undefined);
		}
	})());
});

self.addEventListener('notificationclick', event => {
	event.notification.close();

	const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;

	event.waitUntil((async () => {
		const clientList = await self.clients.matchAll({ type : 'window', includeUncontrolled : true });
		const existingClient = clientList.find(client => new URL(client.url).origin === self.location.origin);

		if (existingClient) {
			await existingClient.focus();
			return;
		}

		await self.clients.openWindow(targetUrl);
	})());
});

function readPushPayload(event) {
	if (!event.data) {
		return {};
	}

	try {
		return event.data.json();
	}
	catch {
		return {};
	}
}
