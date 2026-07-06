import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationClient } from './index';

describe('NotificationClient', () => {
	let storage: FakeDurableObjectStorage;
	let client: NotificationClient;
	let env: TestWorkerEnv;
	let pushSubscription: TestPushSubscription;
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		storage          = new FakeDurableObjectStorage();
		env              = await createEnv();
		client           = new NotificationClient({ id : { toString : () => 'opaque-id' }, storage }, env as never);
		pushSubscription = await createPushSubscription();
		fetchMock        = vi.fn(async () => new Response('', { status : 201 }));
		vi.stubGlobal('fetch', fetchMock);
	});

	it('stores subscription, stores timer, updates lastSeenAt, and sets the due alarm', async () => {
		const response = await setTimer(client, pushSubscription, {
			expiresAt : new Date(Date.now() + 60_000).toISOString(),
			sessionId : 'session-1',
		});
		const activeTimer = storage.values.get('activeTimer') as TestActiveTimer;

		expect(response.status).toBe(200);
		expect(storage.values.get('clientId')).toBe('client-1');
		expect(storage.values.get('pushSubscription')).toEqual(pushSubscription);
		expect(storage.values.get('lastSeenAt')).toEqual(expect.any(String));
		expect(storage.alarm).toBe(Date.parse(activeTimer.expiresAt));
	});

	it('replaces the old timer, ack token, retry state, and alarm', async () => {
		await setTimer(client, pushSubscription, { expiresAt : new Date(Date.now() + 60_000).toISOString(), sessionId : 'session-1' });
		const firstTimer = storage.values.get('activeTimer') as TestActiveTimer;

		const replacementExpiresAt = new Date(Date.now() + 180_000).toISOString();
		await setTimer(client, pushSubscription, { expiresAt : replacementExpiresAt, sessionId : 'session-2' });

		const secondTimer = storage.values.get('activeTimer') as TestActiveTimer;
		expect(secondTimer.sessionId).toBe('session-2');
		expect(secondTimer.ackToken).not.toBe(firstTimer.ackToken);
		expect(secondTimer.retryCount).toBe(0);
		expect(storage.alarm).toBe(Date.parse(replacementExpiresAt));
	});

	it('sends web push with TTL/topic and schedules a retry when no ack exists', async () => {
		await setTimer(client, pushSubscription, { expiresAt : new Date(Date.now() - 1000).toISOString(), sessionId : 'session-1' });

		await client.alarm();

		expect(fetchMock).toHaveBeenCalledOnce();
		expect(fetchMock.mock.calls[0][0]).toBe(pushSubscription.endpoint);
		expect(fetchMock.mock.calls[0][1].headers).toMatchObject({ TTL : '5400', Topic : 'dose-session-1', Urgency : 'high' });
		expect(storage.alarm).toBeGreaterThan(Date.now());
		expect((storage.values.get('activeTimer') as TestActiveTimer).retryCount).toBe(1);
	});

	it('ack stops retries and records the notified session', async () => {
		await setTimer(client, pushSubscription, { expiresAt : new Date(Date.now() - 1000).toISOString(), sessionId : 'session-1' });
		const activeTimer = storage.values.get('activeTimer') as TestActiveTimer;

		const response = await client.fetch(new Request('https://notifications.example.test/clients/client-1/timer/session-1/ack', {
			body   : JSON.stringify({ ackToken : activeTimer.ackToken }),
			method : 'POST',
		}));

		expect(response.status).toBe(200);
		expect(storage.values.has('activeTimer')).toBe(false);
		expect(storage.values.get('lastNotifiedSessionId')).toBe('session-1');
		expect(storage.alarm).toBe(Date.parse(storage.values.get('lastSeenAt') as string) + 90 * 24 * 60 * 60 * 1000);
	});

	it('stops retries after 90 minutes and schedules cleanup', async () => {
		await setTimer(client, pushSubscription, {
			expiresAt : new Date(Date.now() - 91 * 60 * 1000).toISOString(),
			sessionId : 'session-1',
		});

		await client.alarm();

		expect(fetchMock).not.toHaveBeenCalled();
		expect(storage.values.has('activeTimer')).toBe(false);
		expect(storage.alarm).toBe(Date.parse(storage.values.get('lastSeenAt') as string) + 90 * 24 * 60 * 60 * 1000);
	});

	it('clears stale subscriptions on 410 push responses', async () => {
		fetchMock.mockResolvedValueOnce(new Response('', { status : 410 }));
		await setTimer(client, pushSubscription, { expiresAt : new Date(Date.now() - 1000).toISOString(), sessionId : 'session-1' });

		await client.alarm();

		expect(storage.values.has('activeTimer')).toBe(false);
		expect(storage.values.has('pushSubscription')).toBe(false);
		expect(storage.alarm).toBe(Date.parse(storage.values.get('lastSeenAt') as string) + 90 * 24 * 60 * 60 * 1000);
	});

	it('deletes storage only after 90 inactive days and no active timer', async () => {
		await setTimer(client, pushSubscription, { expiresAt : new Date(Date.now() + 60_000).toISOString(), sessionId : 'session-1' });
		await client.fetch(new Request('https://notifications.example.test/clients/client-1/timer', {
			body   : JSON.stringify({ clientSecret : 'secret-1' }),
			method : 'DELETE',
		}));

		storage.values.set('lastSeenAt', new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString());
		await client.alarm();

		expect(storage.values.size).toBe(0);
	});
});

async function setTimer(
	client: NotificationClient,
	subscription: TestPushSubscription,
	timer: { expiresAt: string; sessionId: string }
): Promise<Response> {
	return client.fetch(new Request('https://notifications.example.test/clients/client-1/timer', {
		body    : JSON.stringify({ clientSecret : 'secret-1', subscription, timer : { durationSeconds : 60, ...timer } }),
		headers : { 'Content-Type' : 'application/json' },
		method  : 'POST',
	}));
}

async function createEnv(): Promise<TestWorkerEnv> {
	const keyPair = await crypto.subtle.generateKey({
		name       : 'ECDSA',
		namedCurve : 'P-256',
	}, true, [ 'sign', 'verify' ]) as CryptoKeyPair;
	const publicKey  = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey));
	const privateKey = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
	if (!privateKey.d) {
		throw new Error('Generated VAPID private key is missing private material.');
	}

	return {
		VAPID_PRIVATE_KEY : privateKey.d,
		VAPID_PUBLIC_KEY  : bytesToBase64Url(publicKey),
		VAPID_SUBJECT     : 'mailto:test@example.com',
	};
}

async function createPushSubscription(): Promise<TestPushSubscription> {
	const keyPair = await crypto.subtle.generateKey({
		name       : 'ECDH',
		namedCurve : 'P-256',
	}, true, [ 'deriveBits' ]) as CryptoKeyPair;
	const publicKey = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey));
	const auth      = crypto.getRandomValues(new Uint8Array(16));

	return {
		endpoint : 'https://push.example.test/send/client-1',
		keys     : {
			auth   : bytesToBase64Url(auth),
			p256dh : bytesToBase64Url(publicKey),
		},
	};
}

function bytesToBase64Url(bytes: Uint8Array): string {
	let binary = '';

	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}

	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

class FakeDurableObjectStorage {

	alarm: number | undefined;
	values = new Map<string, unknown>();

	async delete(key: string): Promise<boolean> {
		return this.values.delete(key);
	}

	async deleteAll(): Promise<void> {
		this.values.clear();
		this.alarm = undefined;
	}

	async deleteAlarm(): Promise<void> {
		this.alarm = undefined;
	}

	async get<T>(key: string): Promise<T | undefined> {
		return this.values.get(key) as T | undefined;
	}

	async put(key: string, value: unknown): Promise<void> {
		this.values.set(key, value);
	}

	async setAlarm(scheduledTime: number | Date): Promise<void> {
		this.alarm = scheduledTime instanceof Date ? scheduledTime.getTime() : scheduledTime;
	}

}

interface TestWorkerEnv {
	VAPID_PRIVATE_KEY: string;
	VAPID_PUBLIC_KEY: string;
	VAPID_SUBJECT: string;
}

interface TestPushSubscription {
	endpoint: string;
	keys: {
		auth: string;
		p256dh: string;
	};
}

interface TestActiveTimer {
	ackToken: string;
	expiresAt: string;
	retryCount: number;
	sessionId: string;
}
