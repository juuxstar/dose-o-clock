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
