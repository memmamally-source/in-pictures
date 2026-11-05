/**
 * Browser storage health. Local data can be cleared by the browser (Safari
 * removes data for sites not visited in 7 days unless the app is added to the
 * Home Screen), so we ask for persistent storage and say so plainly.
 */
export interface StorageHealth {
  usage: number;
  quota: number;
  persisted: boolean;
  supported: boolean;
}

export async function storageHealth(): Promise<StorageHealth> {
  const s = navigator.storage;
  if (!s?.estimate) return { usage: 0, quota: 0, persisted: false, supported: false };
  const [{ usage = 0, quota = 0 }, persisted] = await Promise.all([s.estimate(), s.persisted?.() ?? Promise.resolve(false)]);
  return { usage, quota, persisted, supported: true };
}

export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export type StorageLevel = 'ok' | 'warn' | 'full';

export function storageLevel(h: Pick<StorageHealth, 'usage' | 'quota'>): StorageLevel {
  if (!h.quota) return 'ok';
  const ratio = h.usage / h.quota;
  return ratio > 0.95 ? 'full' : ratio > 0.8 ? 'warn' : 'ok';
}

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(n < 10 * 1024 ** 2 ? 1 : 0)} MB`;
  return `${(n / 1024 ** 3).toFixed(1)} GB`;
}
