export type AppEnvironment = 'development' | 'production';

export const appEnvironment: AppEnvironment = import.meta.env.VITE_APP_ENV;
export const isDevelopmentMode = appEnvironment === 'development';
export const isProductionMode  = appEnvironment === 'production';
