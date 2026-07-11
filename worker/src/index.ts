const retryIntervalMs   = 5 * 60 * 1000;
const retryWindowMs     = 90 * 60 * 1000;
const cleanupWindowMs   = 90 * 24 * 60 * 60 * 1000;
const pushTtlSeconds    = 90 * 60;
const notificationTitle = 'Timer finished';

export default {
	async fetch(request: Request, env: WorkerEnv): Promise<Response> {
		if (request.method === 'OPTIONS') {
			return withCors(new Response(null, { status : 204 }), request, env);
		}

		const url   = new URL(request.url);
		const match = /^\/clients\/([^/]+)\/(?:timer(?:\/[^/]+\/ack)?|subscription)$/.exec(url.pathname);

		if (!match) {
			return withCors(json({ error : 'Not found' }, 404), request, env);
		}

		const id       = env.NOTIFICATION_CLIENTS.idFromName(decodeURIComponent(match[1]));
		const response = await env.NOTIFICATION_CLIENTS.get(id).fetch(request);

		return withCors(response, request, env);
	},
};

export class NotificationClient {

	private readonly state: DurableObjectState;
	private readonly env: WorkerEnv;

	constructor(state: DurableObjectState, env: WorkerEnv) {
		this.state = state;
		this.env   = env;
	}

	async fetch(request: Request): Promise<Response> {
		try {
			const url = new URL(request.url);

			const timerMatch = /^\/clients\/([^/]+)\/timer$/.exec(url.pathname);
			if (request.method === 'POST' && timerMatch) {
				return this.setTimer(request, url, decodeURIComponent(timerMatch[1]));
			}

			const ackMatch = /^\/clients\/([^/]+)\/timer\/([^/]+)\/ack$/.exec(url.pathname);
			if (request.method === 'POST' && ackMatch) {
				return this.acknowledgeTimer(request, decodeURIComponent(ackMatch[2]));
			}

			if (request.method === 'DELETE' && timerMatch) {
				return this.clearTimer(request);
			}

			const subscriptionMatch = /^\/clients\/([^/]+)\/subscription$/.exec(url.pathname);
			if (request.method === 'DELETE' && subscriptionMatch) {
				return this.clearSubscription(request);
			}

			return json({ error : 'Not found' }, 404);
		}
		catch (error) {
			if (error instanceof Response) {
				return error;
			}

			throw error;
		}
	}

	async alarm(): Promise<void> {
		const record = await this.readRecord();
		const now    = Date.now();

		if (record.activeTimer) {
			await this.handleTimerAlarm(record, now);
			return;
		}

		if (record.lastSeenAt && now - Date.parse(record.lastSeenAt) >= cleanupWindowMs) {
			await this.state.storage.deleteAll();
			return;
		}

		await this.scheduleCleanup(record);
	}

	private async setTimer(request: Request, url: URL, clientId: string): Promise<Response> {
		const body = await readJson<SetTimerRequest>(request);
		if (!isSetTimerRequest(body)) {
			return json({ error : 'Invalid timer request' }, 400);
		}

		const record = await this.authenticate(body.clientSecret, clientId);
		const now    = new Date();
		const timer  = {
			ackToken                  : createToken(),
			apiOrigin                 : url.origin,
			durationSeconds           : body.timer.durationSeconds,
			expiresAt                 : body.timer.expiresAt,
			lastNotificationAttemptAt : undefined,
			retryCount                : 0,
			retryUntil                : new Date(new Date(body.timer.expiresAt).getTime() + retryWindowMs).toISOString(),
			startedAt                 : body.timer.startedAt,
			startedAtLabel            : body.timer.startedAtLabel,
			sessionId                 : body.timer.sessionId,
		} satisfies ActiveTimer;

		await this.writeRecord({
			...record,
			activeTimer      : timer,
			lastSeenAt       : now.toISOString(),
			pushSubscription : body.subscription,
		});
		await this.state.storage.setAlarm(Math.max(Date.now(), Date.parse(timer.expiresAt)));

		return json({ ok : true });
	}

	private async acknowledgeTimer(request: Request, sessionId: string): Promise<Response> {
		const body   = await readJson<AckTimerRequest>(request);
		const record = await this.readRecord();

		if (!record.activeTimer || record.activeTimer.sessionId !== sessionId || body?.ackToken !== record.activeTimer.ackToken) {
			return json({ error : 'Invalid acknowledgement' }, 401);
		}

		await this.writeRecord({ ...record, activeTimer : undefined, lastNotifiedSessionId : sessionId });
		await this.scheduleCleanup({ ...record, activeTimer : undefined, lastNotifiedSessionId : sessionId });

		return json({ ok : true });
	}

	private async clearTimer(request: Request): Promise<Response> {
		const body   = await readJson<ClientSecretRequest>(request);
		const record = await this.authenticate(body?.clientSecret);

		await this.writeRecord({ ...record, activeTimer : undefined });
		await this.scheduleCleanup({ ...record, activeTimer : undefined });

		return json({ ok : true });
	}

	private async clearSubscription(request: Request): Promise<Response> {
		const body   = await readJson<ClientSecretRequest>(request);
		const record = await this.authenticate(body?.clientSecret);

		await this.writeRecord({ ...record, activeTimer : undefined, pushSubscription : undefined });
		await this.scheduleCleanup({ ...record, activeTimer : undefined, pushSubscription : undefined });

		return json({ ok : true });
	}

	private async handleTimerAlarm(record: ClientRecord, now: number): Promise<void> {
		const timer = record.activeTimer;
		if (!timer) {
			return;
		}

		if (now < Date.parse(timer.expiresAt)) {
			await this.state.storage.setAlarm(Date.parse(timer.expiresAt));
			return;
		}

		if (now > Date.parse(timer.retryUntil)) {
			await this.writeRecord({ ...record, activeTimer : undefined });
			await this.scheduleCleanup({ ...record, activeTimer : undefined });
			return;
		}

		if (!record.pushSubscription) {
			await this.writeRecord({ ...record, activeTimer : undefined });
			await this.scheduleCleanup({ ...record, activeTimer : undefined });
			return;
		}

		const response = await sendWebPush(record.pushSubscription, this.env, {
			ackToken       : timer.ackToken,
			ackUrl         : `${timer.apiOrigin}/clients/${encodeURIComponent(record.clientId)}/timer/${encodeURIComponent(timer.sessionId)}/ack`,
			body           : getNotificationBody(timer),
			clientId       : record.clientId,
			sessionId      : timer.sessionId,
			startedAtLabel : timer.startedAtLabel,
			title          : notificationTitle,
			url            : '/',
		}, timer.sessionId);
		console.info('web push send', JSON.stringify({ status : response.status, sessionId : timer.sessionId }));

		if (response.status === 404 || response.status === 410) {
			await this.writeRecord({ ...record, activeTimer : undefined, pushSubscription : undefined });
			await this.scheduleCleanup({ ...record, activeTimer : undefined, pushSubscription : undefined });
			return;
		}

		const retryAt       = this.nextRetryAt(response, now);
		const updatedRecord = {
			...record,
			activeTimer : {
				...timer,
				lastNotificationAttemptAt : new Date(now).toISOString(),
				retryCount                : timer.retryCount + 1,
			},
		};

		await this.writeRecord(updatedRecord);
		await this.state.storage.setAlarm(Math.min(retryAt, Date.parse(timer.retryUntil) + 1));
	}

	private nextRetryAt(response: Response, now: number): number {
		if (response.status !== 429) {
			return now + retryIntervalMs;
		}

		const retryAfter = response.headers.get('Retry-After');
		if (!retryAfter) {
			return now + retryIntervalMs;
		}

		const seconds = Number(retryAfter);
		if (Number.isFinite(seconds)) {
			return now + seconds * 1000;
		}

		const date = Date.parse(retryAfter);
		return Number.isNaN(date) ? now + retryIntervalMs : date;
	}

	private async authenticate(clientSecret: string | undefined, clientId?: string): Promise<ClientRecord> {
		if (!clientSecret) {
			throw json({ error : 'Missing client secret' }, 401);
		}

		const record = await this.readRecord();
		const hash   = await hashSecret(clientSecret);

		if (!record.clientSecretHash) {
			const next = { ...record, clientId : clientId ?? record.clientId, clientSecretHash : hash };
			await this.writeRecord(next);
			return next;
		}

		if (record.clientSecretHash !== hash) {
			throw json({ error : 'Invalid client secret' }, 401);
		}

		return record;
	}

	private async scheduleCleanup(record: ClientRecord): Promise<void> {
		if (!record.lastSeenAt) {
			await this.state.storage.deleteAlarm();
			return;
		}

		await this.state.storage.setAlarm(Date.parse(record.lastSeenAt) + cleanupWindowMs);
	}

	private async readRecord(): Promise<ClientRecord> {
		return {
			activeTimer           : await this.state.storage.get('activeTimer'),
			clientId              : await this.state.storage.get('clientId') ?? '',
			clientSecretHash      : await this.state.storage.get('clientSecretHash'),
			lastSeenAt            : await this.state.storage.get('lastSeenAt'),
			lastNotifiedSessionId : await this.state.storage.get('lastNotifiedSessionId'),
			pushSubscription      : await this.state.storage.get('pushSubscription'),
		};
	}

	private async writeRecord(record: ClientRecord): Promise<void> {
		await Promise.all([
			putOrDelete(this.state.storage, 'activeTimer', record.activeTimer),
			putOrDelete(this.state.storage, 'clientId', record.clientId),
			putOrDelete(this.state.storage, 'clientSecretHash', record.clientSecretHash),
			putOrDelete(this.state.storage, 'lastSeenAt', record.lastSeenAt),
			putOrDelete(this.state.storage, 'lastNotifiedSessionId', record.lastNotifiedSessionId),
			putOrDelete(this.state.storage, 'pushSubscription', record.pushSubscription),
		]);
	}

}

export async function sendWebPush(
	subscription: StoredPushSubscription,
	env: WorkerEnv,
	payload: PushPayload,
	topic: string
): Promise<Response> {
	const encrypted = await encryptPushPayload(subscription, JSON.stringify(payload));
	const jwt       = await createVapidJwt(subscription.endpoint, env);

	return fetch(subscription.endpoint, {
		body    : bytesToBuffer(encrypted.body),
		headers : {
			'Authorization'    : `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
			'Content-Encoding' : 'aes128gcm',
			'Content-Type'     : 'application/octet-stream',
			'TTL'              : String(pushTtlSeconds),
			'Topic'            : getPushTopic(topic),
			'Urgency'          : 'high',
		},
		method : 'POST',
	});
}

function getPushTopic(topic: string): string {
	const normalizedTopic = topic.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 19);
	return `dose-${normalizedTopic || 'timer'}`;
}

async function encryptPushPayload(subscription: StoredPushSubscription, payload: string): Promise<EncryptedPayload> {
	const receiverPublicKey = base64UrlToBytes(subscription.keys.p256dh);
	const authSecret        = base64UrlToBytes(subscription.keys.auth);
	const salt              = crypto.getRandomValues(new Uint8Array(16));
	const keyPair           = await crypto.subtle.generateKey({
		name       : 'ECDH',
		namedCurve : 'P-256',
	}, true, [ 'deriveBits' ]) as CryptoKeyPair;

	const senderPublicKey = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey));
	const receiverKey     = await crypto.subtle.importKey('raw', bytesToBuffer(receiverPublicKey), {
		name       : 'ECDH',
		namedCurve : 'P-256',
	}, false, []);

	const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({
		name   : 'ECDH',
		public : receiverKey,
	}, keyPair.privateKey, 256));

	const keyInfo   = concatBytes(utf8('WebPush: info\0'), receiverPublicKey, senderPublicKey);
	const ikm       = await hkdf(sharedSecret, authSecret, keyInfo, 32);
	const cek       = await hkdf(ikm, salt, utf8('Content-Encoding: aes128gcm\0'), 16);
	const nonce     = await hkdf(ikm, salt, utf8('Content-Encoding: nonce\0'), 12);
	const key       = await crypto.subtle.importKey('raw', bytesToBuffer(cek), 'AES-GCM', false, [ 'encrypt' ]);
	const plaintext = concatBytes(utf8(payload), new Uint8Array([ 0x02 ]));

	const ciphertext = new Uint8Array(await crypto.subtle.encrypt({
		name : 'AES-GCM',
		iv   : bytesToBuffer(nonce),
	}, key, bytesToBuffer(plaintext)));
	const recordSize = new Uint8Array([ 0, 0, 16, 0 ]);

	return { body : concatBytes(salt, recordSize, new Uint8Array([ senderPublicKey.byteLength ]), senderPublicKey, ciphertext) };
}

async function createVapidJwt(endpoint: string, env: WorkerEnv): Promise<string> {
	const publicKeyBytes = base64UrlToBytes(env.VAPID_PUBLIC_KEY);
	const privateKey     = await crypto.subtle.importKey('jwk', {
		crv : 'P-256',
		d   : env.VAPID_PRIVATE_KEY,
		ext : false,
		kty : 'EC',
		x   : bytesToBase64Url(publicKeyBytes.slice(1, 33)),
		y   : bytesToBase64Url(publicKeyBytes.slice(33, 65)),
	}, { name : 'ECDSA', namedCurve : 'P-256' }, false, [ 'sign' ]);
	const header = bytesToBase64Url(utf8(JSON.stringify({ alg : 'ES256', typ : 'JWT' })));
	const claims = bytesToBase64Url(utf8(JSON.stringify({
		aud : new URL(endpoint).origin,
		exp : Math.floor(Date.now() / 1000) + 12 * 60 * 60,
		sub : env.VAPID_SUBJECT,
	})));
	const signingInput = `${header}.${claims}`;
	const signature    = new Uint8Array(await crypto.subtle.sign(
		{ name : 'ECDSA', hash : 'SHA-256' },
		privateKey,
		bytesToBuffer(utf8(signingInput))
	));

	return `${signingInput}.${bytesToBase64Url(signature)}`;
}

async function hkdf(input: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
	const key = await crypto.subtle.importKey('raw', bytesToBuffer(input), 'HKDF', false, [ 'deriveBits' ]);
	return new Uint8Array(await crypto.subtle.deriveBits({
		hash : 'SHA-256',
		info : bytesToBuffer(info),
		name : 'HKDF',
		salt : bytesToBuffer(salt),
	}, key, length * 8));
}

async function hashSecret(secret: string): Promise<string> {
	return bytesToBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', bytesToBuffer(utf8(secret)))));
}

async function putOrDelete(storage: DurableObjectStorage, key: string, value: unknown): Promise<void> {
	if (value === undefined) {
		await storage.delete(key);
		return;
	}

	await storage.put(key, value);
}

async function readJson<T>(request: Request): Promise<T | undefined> {
	try {
		return await request.json() as T;
	}
	catch {
		return undefined;
	}
}

function isSetTimerRequest(value: unknown): value is SetTimerRequest {
	const candidate = value as Partial<SetTimerRequest>;
	return Boolean(
		candidate
		&& typeof candidate.clientSecret === 'string'
		&& isPushSubscription(candidate.subscription)
		&& candidate.timer
		&& typeof candidate.timer.sessionId === 'string'
		&& typeof candidate.timer.expiresAt === 'string'
		&& !Number.isNaN(Date.parse(candidate.timer.expiresAt))
		&& typeof candidate.timer.startedAt === 'string'
		&& !Number.isNaN(Date.parse(candidate.timer.startedAt))
		&& typeof candidate.timer.startedAtLabel === 'string'
		&& typeof candidate.timer.durationSeconds === 'number'
		&& candidate.timer.durationSeconds > 0
	);
}

function getNotificationBody(timer: ActiveTimer): string {
	return `Timer started at ${timer.startedAtLabel} has finished.`;
}

function isPushSubscription(value: unknown): value is StoredPushSubscription {
	const candidate = value as Partial<StoredPushSubscription>;
	return Boolean(
		candidate
		&& typeof candidate.endpoint === 'string'
		&& candidate.keys
		&& typeof candidate.keys.auth === 'string'
		&& typeof candidate.keys.p256dh === 'string'
	);
}

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { headers : { 'Content-Type' : 'application/json' }, status });
}

function withCors(response: Response, request: Request, env: WorkerEnv): Response {
	const origin         = request.headers.get('Origin') ?? '';
	const allowedOrigins = new Set((env.ALLOWED_ORIGINS || 'http://localhost:5175').split(',').map(value => value.trim()));
	const headers        = new Headers(response.headers);

	if (allowedOrigins.has(origin)) {
		headers.set('Access-Control-Allow-Origin', origin);
		headers.set('Vary', 'Origin');
	}

	headers.set('Access-Control-Allow-Headers', 'Content-Type');
	headers.set('Access-Control-Allow-Methods', 'DELETE, OPTIONS, POST');

	return new Response(response.body, { headers, status : response.status, statusText : response.statusText });
}

function createToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	return bytesToBase64Url(bytes);
}

function concatBytes(...chunks: Uint8Array[]): Uint8Array {
	const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
	const bytes = new Uint8Array(total);
	let offset  = 0;

	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}

	return bytes;
}

function base64UrlToBytes(value: string): Uint8Array {
	const padding = '='.repeat((4 - value.length % 4) % 4);
	const base64  = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
	const binary  = atob(base64);
	const bytes   = new Uint8Array(binary.length);

	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}

	return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
	let binary = '';

	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}

	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function bytesToBuffer(bytes: Uint8Array): ArrayBuffer {
	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function utf8(value: string): Uint8Array {
	return new TextEncoder().encode(value);
}

interface WorkerEnv {
	ALLOWED_ORIGINS?: string;
	NOTIFICATION_CLIENTS: DurableObjectNamespace;
	VAPID_PRIVATE_KEY: string;
	VAPID_PUBLIC_KEY: string;
	VAPID_SUBJECT: string;
}

interface DurableObjectNamespace {
	get(id: DurableObjectId): DurableObjectStub;
	idFromName(name: string): DurableObjectId;
}

interface DurableObjectId {
	toString(): string;
}

interface DurableObjectStub {
	fetch(request: Request): Promise<Response>;
}

interface DurableObjectState {
	readonly id: DurableObjectId;
	readonly storage: DurableObjectStorage;
}

interface DurableObjectStorage {
	delete(key: string): Promise<boolean>;
	deleteAll(): Promise<void>;
	deleteAlarm(): Promise<void>;
	get<T>(key: string): Promise<T | undefined>;
	put(key: string, value: unknown): Promise<void>;
	setAlarm(scheduledTime: number | Date): Promise<void>;
}

interface ClientRecord {
	activeTimer?: ActiveTimer;
	clientId: string;
	clientSecretHash?: string;
	lastSeenAt?: string;
	lastNotifiedSessionId?: string;
	pushSubscription?: StoredPushSubscription;
}

interface ActiveTimer {
	ackToken: string;
	apiOrigin: string;
	durationSeconds: number;
	expiresAt: string;
	lastNotificationAttemptAt?: string;
	retryCount: number;
	retryUntil: string;
	startedAt: string;
	startedAtLabel: string;
	sessionId: string;
}

interface StoredPushSubscription {
	endpoint: string;
	expirationTime?: number | null;
	keys: {
		auth: string;
		p256dh: string;
	};
}

interface SetTimerRequest {
	clientSecret: string;
	subscription: StoredPushSubscription;
	timer: {
		durationSeconds: number;
		expiresAt: string;
		startedAt: string;
		startedAtLabel: string;
		sessionId: string;
	};
}

interface ClientSecretRequest {
	clientSecret: string;
}

interface AckTimerRequest {
	ackToken: string;
}

interface PushPayload {
	ackToken: string;
	ackUrl: string;
	body: string;
	clientId: string;
	sessionId: string;
	startedAtLabel: string;
	title: string;
	url: string;
}

interface EncryptedPayload {
	body: Uint8Array;
}
