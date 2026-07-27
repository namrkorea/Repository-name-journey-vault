import "server-only";

const memoryCache = new Map<string, { expiresAt: number; value: unknown }>();

export function getGoogleServerKey(): string {
  const key =
    process.env.GOOGLE_MAPS_SERVER_API_KEY ??
    process.env.GOOGLE_PLACES_API_KEY;

  if (!key) {
    throw new Error(
      "GOOGLE_MAPS_SERVER_API_KEY 또는 GOOGLE_PLACES_API_KEY가 설정되지 않았습니다.",
    );
  }
  return key;
}

export function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs: number): void {
  memoryCache.set(key, { expiresAt: Date.now() + ttlMs, value });
}

export async function fetchJson<T>(
  url: string,
  init: RequestInit,
  timeoutMs = 12_000,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`외부 API 오류 ${response.status}: ${body}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}
