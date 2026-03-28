const LOCALHOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const DEFAULT_PUBLIC_APP_URL = 'https://ateliecarol.vercel.app';

const trimTrailingSlashes = (value) => value.replace(/\/+$/, '');

export const getPublicAppBaseUrl = () => {
  const configuredUrl = String(import.meta.env.VITE_PUBLIC_APP_URL || '').trim();
  if (configuredUrl) return trimTrailingSlashes(configuredUrl);

  if (typeof window === 'undefined') return DEFAULT_PUBLIC_APP_URL;
  if (LOCALHOSTS.has(window.location.hostname)) return DEFAULT_PUBLIC_APP_URL;

  const normalizedPath = window.location.pathname === '/' ? '' : trimTrailingSlashes(window.location.pathname);
  return `${window.location.origin}${normalizedPath}`;
};

export const getPublicApiUrl = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const configuredApiUrl = String(import.meta.env.VITE_PUBLIC_API_URL || '').trim();

  if (configuredApiUrl) {
    return `${trimTrailingSlashes(configuredApiUrl)}${normalizedPath}`;
  }

  if (typeof window !== 'undefined' && LOCALHOSTS.has(window.location.hostname)) {
    return `${getPublicAppBaseUrl()}${normalizedPath}`;
  }

  return normalizedPath;
};
