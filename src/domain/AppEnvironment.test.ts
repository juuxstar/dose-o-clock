import { afterEach, describe, expect, it, vi } from 'vitest';

describe('AppEnvironment', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	it('reports development mode', async () => {
		vi.stubEnv('VITE_APP_ENV', 'development');

		const environment = await import('@/domain/AppEnvironment');

		expect(environment.appEnvironment).toBe('development');
		expect(environment.isDevelopmentMode).toBe(true);
		expect(environment.isProductionMode).toBe(false);
	});

	it('reports production mode', async () => {
		vi.stubEnv('VITE_APP_ENV', 'production');

		const environment = await import('@/domain/AppEnvironment');

		expect(environment.appEnvironment).toBe('production');
		expect(environment.isDevelopmentMode).toBe(false);
		expect(environment.isProductionMode).toBe(true);
	});
});
