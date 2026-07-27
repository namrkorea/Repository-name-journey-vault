# World Travel Explorer — 전체 소스

아래 순서는 프로젝트 구조와 동일합니다.

## `package.json`

```json
{
  "name": "world-travel-explorer",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint ."
  },
  "dependencies": {
    "next": "16.2.12",
    "react": "19.2.0",
    "react-dom": "19.2.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "16.2.12",
    "tailwindcss": "^4.1.0",
    "typescript": "^5.7.0"
  }
}
```

## `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    ".next/types/**/*.ts",
    "**/*.ts",
    "**/*.tsx",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

## `next.config.ts`

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
```

## `postcss.config.mjs`

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

## `eslint.config.mjs`

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
```

## `.gitignore`

```gitignore
# dependencies
/node_modules
/.pnp
.pnp.*

# next.js
/.next/
/out/

# production
/build

# local environment variables
.env*
!.env.example

# logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# misc
.DS_Store
*.pem

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
```

## `.env.example`

```env
# 브라우저에서 3D 지구본을 표시하는 키입니다.
# Google Cloud에서 HTTP 리퍼러 제한을 설정하세요.
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# 서버 Route Handler에서 Places / Geocoding API를 호출하는 비밀 키입니다.
GOOGLE_MAPS_SERVER_API_KEY=

# 기존에 GOOGLE_PLACES_API_KEY 이름으로 만들어 둔 경우에도 서버 코드가 읽습니다.
# GOOGLE_PLACES_API_KEY=
```

## `types/travel.ts`

```ts
export type LatLng = {
  lat: number;
  lng: number;
  altitude?: number;
};

export type PhotoAttribution = {
  displayName?: string;
  uri?: string;
  photoUri?: string;
};

export type PlacePhoto = {
  name: string;
  widthPx?: number;
  heightPx?: number;
  authorAttributions?: PhotoAttribution[];
};

export type AddressComponent = {
  longText: string;
  shortText: string;
  types: string[];
};

export type PlaceSummary = {
  id: string;
  name: string;
  address: string;
  location: LatLng;
  rating: number | null;
  userRatingCount: number | null;
  googleMapsUri: string | null;
  primaryType: string;
  types: string[];
  openNow: boolean | null;
  businessStatus: string | null;
  photos: PlacePhoto[];
  editorialSummary?: string | null;
};

export type PlaceDetailData = PlaceSummary & {
  addressComponents: AddressComponent[];
  country: string;
  countryCode: string;
  city: string;
  localName: string;
  utcOffsetMinutes: number | null;
  timeZoneId: string | null;
  websiteUri: string | null;
};

export type AutocompleteSuggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
};

export type WikiSummary = {
  title: string;
  extract: string;
  url: string;
  thumbnail: string | null;
  language: "ko" | "en";
};

export type CountryFacts = {
  countryCode: string;
  officialName: string;
  languages: string[];
  currencies: string[];
  flag: string | null;
  capital: string[];
  timeZones: string[];
  bestSeason: string;
  representativeFood: string;
  caution: string;
};

export type NearbyCategory =
  | "all"
  | "tourist"
  | "museum"
  | "park"
  | "restaurant"
  | "cafe"
  | "hotel";

export type SearchTarget = {
  id: string;
  name: string;
  location: LatLng;
  kind: "region" | "place";
};
```

## `lib/googleMapsLoader.ts`

```ts
let loaderPromise: Promise<void> | null = null;

/**
 * Google Maps JavaScript API를 한 번만 로드합니다.
 * 공개 키는 브라우저에 전달되므로 Google Cloud에서 HTTP 리퍼러 제한을 꼭 설정하세요.
 */
export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("브라우저에서만 지도를 불러올 수 있습니다."));
  }

  const mapsWindow = window as Window & {
    google?: {
      maps?: {
        importLibrary?: (library: string) => Promise<unknown>;
      };
    };
  };

  if (mapsWindow.google?.maps?.importLibrary) {
    return Promise.resolve();
  }

  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-world-travel-google-maps="true"]',
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Google 지도 스크립트를 불러오지 못했습니다.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: apiKey,
      loading: "async",
      libraries: "maps3d",
      language: "ko",
      region: "KR",
      v: "beta",
    });

    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.dataset.worldTravelGoogleMaps = "true";
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Google 지도 스크립트를 불러오지 못했습니다."));

    document.head.appendChild(script);
  });

  return loaderPromise;
}
```

## `lib/clientApi.ts`

```ts
import type {
  AutocompleteSuggestion,
  CountryFacts,
  LatLng,
  NearbyCategory,
  PlaceDetailData,
  PlaceSummary,
  WikiSummary,
} from "@/types/travel";

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "요청을 처리하지 못했습니다.");
  }
  return data;
}

export async function getAutocompleteSuggestions(
  input: string,
  sessionToken: string,
  signal?: AbortSignal,
): Promise<AutocompleteSuggestion[]> {
  const response = await fetch("/api/autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input, sessionToken }),
    signal,
  });
  const data = await readJson<{ suggestions: AutocompleteSuggestion[] }>(response);
  return data.suggestions;
}

export async function getPlaceDetail(
  placeId: string,
  sessionToken?: string,
): Promise<PlaceDetailData> {
  const params = new URLSearchParams({ placeId });
  if (sessionToken) params.set("sessionToken", sessionToken);
  const response = await fetch(`/api/place?${params.toString()}`);
  const data = await readJson<{ place: PlaceDetailData }>(response);
  return data.place;
}

export async function textSearch(query: string): Promise<PlaceSummary[]> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  const data = await readJson<{ places: PlaceSummary[] }>(response);
  return data.places;
}

export async function reverseGeocode(
  location: LatLng,
): Promise<{ placeId: string; name: string; address: string }> {
  const params = new URLSearchParams({
    lat: String(location.lat),
    lng: String(location.lng),
  });
  const response = await fetch(`/api/reverse-geocode?${params.toString()}`);
  return readJson(response);
}

export async function getNearbyPlaces(
  location: LatLng,
  category: NearbyCategory,
): Promise<PlaceSummary[]> {
  const response = await fetch("/api/nearby", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ location, category }),
  });
  const data = await readJson<{ places: PlaceSummary[] }>(response);
  return data.places;
}

export async function getWikiSummary(query: string): Promise<WikiSummary | null> {
  const response = await fetch(`/api/wiki?q=${encodeURIComponent(query)}`);
  if (response.status === 404) return null;
  const data = await readJson<{ summary: WikiSummary }>(response);
  return data.summary;
}

export async function getCountryFacts(countryCode: string): Promise<CountryFacts | null> {
  if (!countryCode) return null;
  const response = await fetch(
    `/api/country?code=${encodeURIComponent(countryCode)}`,
  );
  if (response.status === 404) return null;
  const data = await readJson<{ facts: CountryFacts }>(response);
  return data.facts;
}
```

## `lib/format.ts`

```ts
export function formatNumber(value: number | null): string {
  if (value === null) return "정보 없음";
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function formatLocalTime(
  utcOffsetMinutes: number | null,
): string {
  if (utcOffsetMinutes === null) return "정보 없음";
  const utcNow = Date.now() + new Date().getTimezoneOffset() * 60_000;
  const local = new Date(utcNow + utcOffsetMinutes * 60_000);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(local);
}

export function getPhotoUrl(photoName: string, width = 1200): string {
  return `/api/photo?name=${encodeURIComponent(photoName)}&width=${width}`;
}

export function openingText(openNow: boolean | null): string {
  if (openNow === true) return "영업 중";
  if (openNow === false) return "영업 종료";
  return "영업 정보 없음";
}
```

## `lib/server/google.ts`

```ts
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
```

## `lib/server/normalize.ts`

```ts
import type {
  AddressComponent,
  PlaceDetailData,
  PlacePhoto,
  PlaceSummary,
} from "@/types/travel";

type GoogleText = { text?: string; languageCode?: string };
type GoogleAddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};
type GooglePhoto = {
  name?: string;
  widthPx?: number;
  heightPx?: number;
  authorAttributions?: Array<{
    displayName?: string;
    uri?: string;
    photoUri?: string;
  }>;
};

export type GooglePlace = {
  id?: string;
  displayName?: GoogleText;
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  primaryTypeDisplayName?: GoogleText;
  types?: string[];
  businessStatus?: string;
  currentOpeningHours?: { openNow?: boolean };
  photos?: GooglePhoto[];
  editorialSummary?: GoogleText;
  addressComponents?: GoogleAddressComponent[];
  utcOffsetMinutes?: number;
  timeZone?: { id?: string };
  websiteUri?: string;
};

function normalizePhotos(photos?: GooglePhoto[]): PlacePhoto[] {
  return (photos ?? [])
    .filter((photo): photo is GooglePhoto & { name: string } => Boolean(photo.name))
    .slice(0, 10)
    .map((photo) => ({
      name: photo.name,
      widthPx: photo.widthPx,
      heightPx: photo.heightPx,
      authorAttributions: photo.authorAttributions ?? [],
    }));
}

function normalizeAddressComponents(
  components?: GoogleAddressComponent[],
): AddressComponent[] {
  return (components ?? []).map((component) => ({
    longText: component.longText ?? "",
    shortText: component.shortText ?? "",
    types: component.types ?? [],
  }));
}

function componentValue(
  components: AddressComponent[],
  type: string,
  short = false,
): string {
  const component = components.find((item) => item.types.includes(type));
  return short ? component?.shortText ?? "" : component?.longText ?? "";
}

export function normalizePlaceSummary(place: GooglePlace): PlaceSummary {
  return {
    id: place.id ?? crypto.randomUUID(),
    name: place.displayName?.text ?? "이름 정보 없음",
    address: place.formattedAddress ?? "주소 정보 없음",
    location: {
      lat: place.location?.latitude ?? 0,
      lng: place.location?.longitude ?? 0,
    },
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? null,
    googleMapsUri: place.googleMapsUri ?? null,
    primaryType: place.primaryTypeDisplayName?.text ?? "관광명소",
    types: place.types ?? [],
    openNow: place.currentOpeningHours?.openNow ?? null,
    businessStatus: place.businessStatus ?? null,
    photos: normalizePhotos(place.photos),
    editorialSummary: place.editorialSummary?.text ?? null,
  };
}

export function normalizePlaceDetail(place: GooglePlace): PlaceDetailData {
  const base = normalizePlaceSummary(place);
  const addressComponents = normalizeAddressComponents(place.addressComponents);
  const country = componentValue(addressComponents, "country");
  const countryCode = componentValue(addressComponents, "country", true).toUpperCase();
  const city =
    componentValue(addressComponents, "locality") ||
    componentValue(addressComponents, "administrative_area_level_1") ||
    componentValue(addressComponents, "administrative_area_level_2");

  return {
    ...base,
    addressComponents,
    country,
    countryCode,
    city,
    localName: place.displayName?.text ?? base.name,
    utcOffsetMinutes: place.utcOffsetMinutes ?? null,
    timeZoneId: place.timeZone?.id ?? null,
    websiteUri: place.websiteUri ?? null,
  };
}
```

## `app/layout.tsx`

```tsx
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "World Travel Explorer",
  description: "3D 지구본으로 전 세계 여행지를 검색하고 탐색하는 여행 가이드",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#04101f",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

## `app/globals.css`

```css
@import "tailwindcss";

:root {
  --bg: #030914;
  --surface: rgba(8, 19, 35, 0.78);
  --surface-strong: rgba(7, 17, 31, 0.93);
  --surface-soft: rgba(255, 255, 255, 0.07);
  --line: rgba(255, 255, 255, 0.13);
  --text: #f7fbff;
  --muted: #a8bad0;
  --accent: #68b7ff;
  --accent-strong: #2488ff;
  --shadow: 0 20px 70px rgba(0, 0, 0, 0.42);
}

[data-theme="light"] {
  --bg: #e9f3fc;
  --surface: rgba(247, 251, 255, 0.84);
  --surface-strong: rgba(250, 253, 255, 0.96);
  --surface-soft: rgba(16, 67, 105, 0.07);
  --line: rgba(15, 51, 79, 0.17);
  --text: #071625;
  --muted: #50667a;
  --accent: #0f71c9;
  --accent-strong: #0569cf;
  --shadow: 0 20px 70px rgba(28, 74, 109, 0.2);
}

* {
  box-sizing: border-box;
}

html,
body {
  width: 100%;
  min-height: 100%;
  margin: 0;
}

body {
  overflow: hidden;
  background: var(--bg);
  color: var(--text);
  font-family: Arial, "Noto Sans KR", sans-serif;
}

button,
input {
  font: inherit;
}

button,
a {
  -webkit-tap-highlight-color: transparent;
}

.glass {
  border: 1px solid var(--line);
  background: var(--surface);
  box-shadow: var(--shadow);
  backdrop-filter: blur(20px) saturate(130%);
  -webkit-backdrop-filter: blur(20px) saturate(130%);
}

.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: rgba(128, 171, 210, 0.45) transparent;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 7px;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(128, 171, 210, 0.42);
}

.fade-in {
  animation: fade-in 260ms ease-out both;
}

.slide-up {
  animation: slide-up 280ms ease-out both;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes globe-pulse {
  0%, 100% { transform: scale(0.98); filter: brightness(0.9); }
  50% { transform: scale(1.02); filter: brightness(1.08); }
}

.demo-globe {
  position: absolute;
  left: 50%;
  top: 52%;
  width: min(68vw, 760px);
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, rgba(126, 211, 255, .95), transparent 9%),
    radial-gradient(ellipse at 58% 42%, #57a86d 0 16%, transparent 17%),
    radial-gradient(ellipse at 42% 59%, #b9a16f 0 17%, transparent 18%),
    radial-gradient(ellipse at 66% 70%, #4e9d65 0 11%, transparent 12%),
    radial-gradient(circle at 40% 38%, #1673b7, #07385f 55%, #02101f 75%);
  box-shadow:
    0 0 70px rgba(44, 158, 255, .65),
    inset -60px -40px 90px rgba(0, 0, 0, .55);
  animation: globe-pulse 8s ease-in-out infinite;
}

.demo-globe::before {
  content: "";
  position: absolute;
  inset: -2%;
  border: 2px solid rgba(114, 205, 255, .45);
  border-radius: 50%;
  box-shadow: 0 0 30px rgba(102, 190, 255, .5);
}

.safe-bottom {
  padding-bottom: max(14px, env(safe-area-inset-bottom));
}

@media (max-width: 767px) {
  body { overflow: hidden; }
  .demo-globe { width: 116vw; top: 48%; }
}
```

## `components/LoadingOverlay.tsx`

```tsx
type LoadingOverlayProps = {
  visible: boolean;
  label?: string;
};

export default function LoadingOverlay({
  visible,
  label = "지도를 이동하는 중입니다",
}: LoadingOverlayProps) {
  if (!visible) return null;
  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-slate-950/20 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
    >
      <div className="glass flex items-center gap-3 rounded-full px-5 py-3 text-sm text-[var(--text)]">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-300 border-t-transparent" />
        {label}
      </div>
    </div>
  );
}
```

## `components/ErrorMessage.tsx`

```tsx
type ErrorMessageProps = {
  message: string;
  onClose: () => void;
};

export default function ErrorMessage({ message, onClose }: ErrorMessageProps) {
  if (!message) return null;
  return (
    <div className="glass fixed bottom-5 left-1/2 z-[80] flex w-[min(92vw,560px)] -translate-x-1/2 items-start gap-3 rounded-2xl px-4 py-3 text-sm fade-in">
      <span aria-hidden="true" className="mt-0.5 text-amber-300">!</span>
      <p className="min-w-0 flex-1 leading-6 text-[var(--text)]">{message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="오류 메시지 닫기"
        className="rounded-lg px-2 py-1 text-[var(--muted)] hover:bg-white/10"
      >
        닫기
      </button>
    </div>
  );
}
```

## `components/SearchSuggestions.tsx`

```tsx
import type { AutocompleteSuggestion } from "@/types/travel";

type SearchSuggestionsProps = {
  suggestions: AutocompleteSuggestion[];
  activeIndex: number;
  loading: boolean;
  onSelect: (suggestion: AutocompleteSuggestion) => void;
};

export default function SearchSuggestions({
  suggestions,
  activeIndex,
  loading,
  onSelect,
}: SearchSuggestionsProps) {
  if (!loading && suggestions.length === 0) return null;

  return (
    <div
      className="glass absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl text-left"
      role="listbox"
      aria-label="장소 검색 추천"
    >
      {loading && (
        <div className="flex items-center gap-3 px-4 py-4 text-sm text-[var(--muted)]">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
          검색어를 확인하고 있습니다.
        </div>
      )}

      {!loading && suggestions.map((suggestion, index) => (
        <button
          key={suggestion.placeId}
          type="button"
          role="option"
          aria-selected={activeIndex === index}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(suggestion)}
          className={`block w-full border-t border-[var(--line)] px-4 py-3 text-left transition first:border-t-0 ${
            activeIndex === index ? "bg-sky-500/15" : "hover:bg-white/8"
          }`}
        >
          <span className="block font-semibold text-[var(--text)]">
            {suggestion.mainText}
          </span>
          <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
            {suggestion.secondaryText}
          </span>
        </button>
      ))}

      <div className="border-t border-[var(--line)] px-4 py-2 text-right text-[10px] tracking-wide text-[var(--muted)]">
        Powered by Google
      </div>
    </div>
  );
}
```

## `components/RecentSearches.tsx`

```tsx
type RecentSearchesProps = {
  items: string[];
  onSelect: (value: string) => void;
  onClear: () => void;
};

export default function RecentSearches({
  items,
  onSelect,
  onClear,
}: RecentSearchesProps) {
  if (items.length === 0) return null;
  return (
    <div className="glass absolute left-0 right-0 top-[calc(100%+8px)] z-40 rounded-2xl p-3 text-left">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-[var(--muted)]">최근 검색</span>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClear}
          className="text-xs text-sky-400 hover:underline"
        >
          모두 삭제
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(item)}
            className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-xs text-[var(--text)] hover:border-sky-400/60"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
```

## `components/SearchBar.tsx`

```tsx
"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { getAutocompleteSuggestions } from "@/lib/clientApi";
import type { AutocompleteSuggestion } from "@/types/travel";
import RecentSearches from "./RecentSearches";
import SearchSuggestions from "./SearchSuggestions";

const RECENT_KEY = "world-travel-explorer-recent";

const POPULAR = [
  "파리 프랑스",
  "도쿄 일본",
  "로마 이탈리아",
  "뉴욕 미국",
  "런던 영국",
  "후쿠오카 일본",
  "스위스",
  "서울 대한민국",
];

type SearchBarProps = {
  onSelectPlace: (
    suggestion: AutocompleteSuggestion,
    sessionToken: string,
  ) => void;
  onFreeTextSearch: (query: string) => void;
};

function newSessionToken(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function SearchBar({
  onSelectPlace,
  onFreeTextSearch,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const sessionTokenRef = useRef(newSessionToken());

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[];
      setRecent(Array.isArray(saved) ? saved.slice(0, 10) : []);
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    const clean = query.trim();
    if (clean.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        const result = await getAutocompleteSuggestions(
          clean,
          sessionTokenRef.current,
          controller.signal,
        );
        setSuggestions(result.slice(0, 5));
        setActiveIndex(-1);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 360);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  function saveRecent(value: string) {
    const next = [value, ...recent.filter((item) => item !== value)].slice(0, 10);
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  }

  function selectSuggestion(suggestion: AutocompleteSuggestion) {
    const token = sessionTokenRef.current;
    setQuery(suggestion.fullText);
    saveRecent(suggestion.fullText);
    setSuggestions([]);
    setFocused(false);
    onSelectPlace(suggestion, token);
    sessionTokenRef.current = newSessionToken();
  }

  function submit(value: string) {
    const clean = value.trim();
    if (!clean) return;
    saveRecent(clean);
    setSuggestions([]);
    setFocused(false);
    onFreeTextSearch(clean);
    sessionTokenRef.current = newSessionToken();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      selectSuggestion(suggestions[activeIndex]);
      return;
    }
    submit(query);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp" && suggestions.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Escape") {
      setSuggestions([]);
      setFocused(false);
    }
  }

  return (
    <div className="pointer-events-auto w-full max-w-[760px]">
      <div className="relative">
        <form
          onSubmit={handleSubmit}
          className="glass flex h-14 items-center gap-2 rounded-2xl px-3 md:h-16"
          role="search"
        >
          <span aria-hidden="true" className="pl-1 text-xl text-sky-300">⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 120)}
            onKeyDown={handleKeyDown}
            aria-label="국가, 도시 또는 관광명소 검색"
            aria-autocomplete="list"
            placeholder="국가, 도시 또는 관광명소를 검색하세요"
            className="min-w-0 flex-1 bg-transparent px-2 text-[15px] text-[var(--text)] outline-none placeholder:text-[var(--muted)] md:text-base"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setSuggestions([]); }}
              aria-label="검색어 지우기"
              className="rounded-lg px-2 py-1 text-[var(--muted)] hover:bg-white/10"
            >
              ×
            </button>
          )}
          <button
            type="submit"
            className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-sky-400 md:px-6"
          >
            검색
          </button>
        </form>

        {focused && suggestions.length > 0 && (
          <SearchSuggestions
            suggestions={suggestions}
            activeIndex={activeIndex}
            loading={loading}
            onSelect={selectSuggestion}
          />
        )}
        {focused && loading && suggestions.length === 0 && (
          <SearchSuggestions
            suggestions={[]}
            activeIndex={-1}
            loading
            onSelect={selectSuggestion}
          />
        )}
        {focused && query.trim().length < 2 && (
          <RecentSearches
            items={recent}
            onSelect={(value) => { setQuery(value); submit(value); }}
            onClear={() => {
              setRecent([]);
              localStorage.removeItem(RECENT_KEY);
            }}
          />
        )}
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:justify-center">
        {POPULAR.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => { setQuery(item); submit(item); }}
            className="glass shrink-0 rounded-full px-3 py-2 text-xs text-[var(--text)] transition hover:border-sky-400/70 md:px-4"
          >
            {item.replace(/\s(프랑스|일본|이탈리아|미국|영국|대한민국)$/, "")}
          </button>
        ))}
      </div>
    </div>
  );
}
```

## `components/FallbackGlobe.tsx`

```tsx
type FallbackGlobeProps = {
  message: string;
};

export default function FallbackGlobe({ message }: FallbackGlobeProps) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_center,#0b3152_0%,#030914_58%,#01040a_100%)]">
      <div className="demo-globe" aria-hidden="true" />
      <div className="absolute bottom-24 left-1/2 w-[min(88vw,620px)] -translate-x-1/2 rounded-2xl bg-black/35 px-4 py-3 text-center text-sm text-slate-200 backdrop-blur-md">
        {message}
      </div>
    </div>
  );
}
```

## `components/GlobeMap.tsx`

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/googleMapsLoader";
import type { LatLng, PlaceSummary, SearchTarget } from "@/types/travel";
import FallbackGlobe from "./FallbackGlobe";
import LoadingOverlay from "./LoadingOverlay";

type MapElementLike = HTMLElement & {
  mode: string;
  center?: LatLng;
  range?: number;
  tilt?: number;
  heading?: number;
  flyCameraTo: (options: {
    endCamera: {
      center: LatLng;
      range: number;
      tilt: number;
      heading?: number;
    };
    durationMillis: number;
  }) => Promise<void> | void;
  flyCameraAround: (options: {
    camera: {
      center: LatLng;
      range: number;
      tilt: number;
      heading?: number;
    };
    durationMillis: number;
    repeatCount: number;
  }) => Promise<void> | void;
  stopCameraAnimation: () => Promise<void> | void;
};

type MarkerLike = HTMLElement;

type Maps3DLibraryLike = {
  Map3DElement: new (options: Record<string, unknown>) => MapElementLike;
  Marker3DInteractiveElement: new (
    options: Record<string, unknown>,
  ) => MarkerLike;
};

type GoogleWindow = Window & {
  google?: {
    maps: {
      importLibrary: (library: string) => Promise<unknown>;
    };
  };
};

type GlobeMapProps = {
  focusTarget: SearchTarget | null;
  markers: PlaceSummary[];
  selectedMarkerId?: string | null;
  onLocationClick: (location: LatLng, placeId?: string) => void;
  onMarkerClick: (place: PlaceSummary) => void;
};

function numberValue(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "function") {
    const result = (value as () => unknown)();
    return typeof result === "number" ? result : null;
  }
  return null;
}

export default function GlobeMap({
  focusTarget,
  markers,
  selectedMarkerId,
  onLocationClick,
  onMarkerClick,
}: GlobeMapProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapElementLike | null>(null);
  const libraryRef = useRef<Maps3DLibraryLike | null>(null);
  const markerRefs = useRef<MarkerLike[]>([]);
  const autoRotateStartedRef = useRef(false);
  const userInteractedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const publicKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;

    if (!publicKey) {
      setError("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY를 설정하면 실제 Google 3D 지구본이 표시됩니다.");
      setLoading(false);
      return;
    }

    async function initialize() {
      try {
        await loadGoogleMaps(publicKey);
        const googleWindow = window as GoogleWindow;
        if (!googleWindow.google?.maps.importLibrary) {
          throw new Error("Google Maps importLibrary를 사용할 수 없습니다.");
        }

        const library = (await googleWindow.google.maps.importLibrary(
          "maps3d",
        )) as Maps3DLibraryLike;
        if (cancelled) return;

        const map = new library.Map3DElement({
          center: { lat: 18, lng: 15, altitude: 0 },
          range: 22_000_000,
          tilt: 0,
          heading: 0,
          mode: "HYBRID",
          gestureHandling: "GREEDY",
          description: "전 세계 여행지를 탐색하는 3D 지구본",
        });
        map.mode = "HYBRID";
        map.style.width = "100%";
        map.style.height = "100%";
        map.style.display = "block";

        const stopAutoRotation = () => {
          if (userInteractedRef.current) return;
          userInteractedRef.current = true;
          void map.stopCameraAnimation();
        };

        const handleClick = (rawEvent: Event) => {
          const event = rawEvent as Event & {
            placeId?: string;
            position?: Record<string, unknown>;
          };
          if (event.placeId) event.preventDefault();
          const position = event.position;
          if (!position) return;
          const lat = numberValue(position.lat);
          const lng = numberValue(position.lng);
          const altitude = numberValue(position.altitude) ?? 0;
          if (lat === null || lng === null) return;
          stopAutoRotation();
          onLocationClick({ lat, lng, altitude }, event.placeId);
        };

        const handleSteady = (rawEvent: Event) => {
          const event = rawEvent as Event & { isSteady?: boolean };
          if (event.isSteady) {
            setLoading(false);
            if (!autoRotateStartedRef.current && !userInteractedRef.current) {
              autoRotateStartedRef.current = true;
              void map.flyCameraAround({
                camera: {
                  center: { lat: 18, lng: 15, altitude: 0 },
                  range: 22_000_000,
                  tilt: 0,
                  heading: 0,
                },
                durationMillis: 120_000,
                repeatCount: Number.POSITIVE_INFINITY,
              });
            }
          } else {
            setLoading(true);
          }
        };

        map.addEventListener("gmp-click", handleClick);
        map.addEventListener("gmp-steadychange", handleSteady);
        map.addEventListener("gmp-error", () =>
          setError("Google 3D 지도를 초기화하지 못했습니다. API 설정을 확인해 주세요."),
        );

        host.addEventListener("pointerdown", stopAutoRotation, true);
        host.addEventListener("wheel", stopAutoRotation, true);
        host.addEventListener("touchstart", stopAutoRotation, true);
        host.appendChild(map);

        mapRef.current = map;
        libraryRef.current = library;
        setReady(true);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "3D 지도를 불러오지 못했습니다.";
        setError(message);
        setLoading(false);
      }
    }

    void initialize();

    return () => {
      cancelled = true;
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      if (mapRef.current) mapRef.current.remove();
      mapRef.current = null;
      libraryRef.current = null;
    };
  }, [publicKey, onLocationClick]);

  useEffect(() => {
    if (!ready || !mapRef.current || !focusTarget) return;
    userInteractedRef.current = true;
    void mapRef.current.stopCameraAnimation();
    setLoading(true);
    void mapRef.current.flyCameraTo({
      endCamera: {
        center: { ...focusTarget.location, altitude: 0 },
        range: focusTarget.kind === "place" ? 2_200 : 90_000,
        tilt: focusTarget.kind === "place" ? 67 : 48,
        heading: focusTarget.kind === "place" ? 18 : 0,
      },
      durationMillis: focusTarget.kind === "place" ? 2_700 : 3_400,
    });
  }, [focusTarget, ready]);

  useEffect(() => {
    const map = mapRef.current;
    const library = libraryRef.current;
    if (!ready || !map || !library) return;

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];

    for (const place of markers.slice(0, 10)) {
      if (!Number.isFinite(place.location.lat) || !Number.isFinite(place.location.lng)) continue;
      const marker = new library.Marker3DInteractiveElement({
        position: {
          lat: place.location.lat,
          lng: place.location.lng,
          altitude: 30,
        },
        altitudeMode: "RELATIVE_TO_MESH",
        extruded: true,
        label: `${place.id === selectedMarkerId ? "★ " : ""}${place.name}`,
        title: place.name,
        sizePreserved: true,
      });
      marker.addEventListener("gmp-click", (event) => {
        event.stopPropagation();
        onMarkerClick(place);
      });
      map.appendChild(marker);
      markerRefs.current.push(marker);
    }
  }, [markers, onMarkerClick, ready, selectedMarkerId]);

  if (error) return <FallbackGlobe message={error} />;

  return (
    <div className="absolute inset-0 bg-[#020812]">
      <div ref={hostRef} className="h-full w-full" aria-label="3D 지구본 지도" />
      <LoadingOverlay visible={loading} />
    </div>
  );
}
```

## `components/PhotoGallery.tsx`

```tsx
import { getPhotoUrl } from "@/lib/format";
import type { PlacePhoto } from "@/types/travel";

type PhotoGalleryProps = {
  photos: PlacePhoto[];
  fallback?: string | null;
  title: string;
  compact?: boolean;
};

export default function PhotoGallery({
  photos,
  fallback,
  title,
  compact = false,
}: PhotoGalleryProps) {
  const primary = photos[0];
  const src = primary ? getPhotoUrl(primary.name, compact ? 780 : 1400) : fallback;
  const attribution = primary?.authorAttributions?.[0];

  return (
    <figure className="relative m-0 overflow-hidden rounded-2xl bg-slate-900/60">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`${title} 대표 사진`}
          className={`w-full object-cover ${compact ? "h-44" : "h-64 md:h-72"}`}
        />
      ) : (
        <div className={`flex w-full items-center justify-center bg-gradient-to-br from-sky-900 to-slate-950 text-4xl ${compact ? "h-44" : "h-64"}`}>
          ◇
        </div>
      )}
      {attribution?.displayName && (
        <figcaption className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 text-[10px] text-white">
          사진: {attribution.displayName}
        </figcaption>
      )}
    </figure>
  );
}
```

## `components/PlaceCard.tsx`

```tsx
import { formatNumber, getPhotoUrl, openingText } from "@/lib/format";
import type { PlaceSummary } from "@/types/travel";

type PlaceCardProps = {
  place: PlaceSummary;
  onSelect: (place: PlaceSummary) => void;
};

export default function PlaceCard({ place, onSelect }: PlaceCardProps) {
  const photo = place.photos[0];
  return (
    <button
      type="button"
      onClick={() => onSelect(place)}
      className="group grid w-full grid-cols-[92px_1fr] gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-2 text-left transition hover:-translate-y-0.5 hover:border-sky-400/60"
    >
      <div className="h-[86px] overflow-hidden rounded-xl bg-slate-900">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getPhotoUrl(photo.name, 360)}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl">⌖</div>
        )}
      </div>
      <div className="min-w-0 py-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="truncate font-bold text-[var(--text)]">{place.name}</h4>
          <span className={`shrink-0 text-[11px] ${place.openNow ? "text-emerald-400" : "text-[var(--muted)]"}`}>
            {openingText(place.openNow)}
          </span>
        </div>
        <p className="mt-1 line-clamp-1 text-xs text-[var(--muted)]">{place.primaryType}</p>
        <p className="mt-2 line-clamp-1 text-xs text-[var(--muted)]">{place.address}</p>
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-amber-400">★ {place.rating ?? "-"}</span>
          <span className="text-[var(--muted)]">리뷰 {formatNumber(place.userRatingCount)}</span>
        </div>
      </div>
    </button>
  );
}
```

## `components/NearbyMarkers.tsx`

```tsx
import type { NearbyCategory } from "@/types/travel";

const CATEGORIES: Array<{ id: NearbyCategory; label: string }> = [
  { id: "all", label: "전체" },
  { id: "tourist", label: "관광지" },
  { id: "museum", label: "박물관" },
  { id: "park", label: "공원" },
  { id: "restaurant", label: "식당" },
  { id: "cafe", label: "카페" },
  { id: "hotel", label: "호텔" },
];

type NearbyMarkersProps = {
  value: NearbyCategory;
  count: number;
  onChange: (category: NearbyCategory) => void;
};

export default function NearbyMarkers({ value, count, onChange }: NearbyMarkersProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-[var(--text)]">주변 추천 장소</h3>
        <span className="text-xs text-[var(--muted)]">지도 마커 {count}개</span>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onChange(category.id)}
            className={`shrink-0 rounded-full border px-3 py-2 text-xs transition ${
              value === category.id
                ? "border-sky-400 bg-sky-500/20 text-sky-200"
                : "border-[var(--line)] bg-[var(--surface-soft)] text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

## `components/LocationPanel.tsx`

```tsx
import { formatLocalTime } from "@/lib/format";
import type {
  CountryFacts,
  NearbyCategory,
  PlaceDetailData,
  PlaceSummary,
  WikiSummary,
} from "@/types/travel";
import NearbyMarkers from "./NearbyMarkers";
import PhotoGallery from "./PhotoGallery";
import PlaceCard from "./PlaceCard";

type LocationPanelContentProps = {
  location: PlaceDetailData;
  wiki: WikiSummary | null;
  facts: CountryFacts | null;
  nearby: PlaceSummary[];
  category: NearbyCategory;
  nearbyLoading: boolean;
  onCategoryChange: (value: NearbyCategory) => void;
  onPlaceSelect: (place: PlaceSummary) => void;
  onClose: () => void;
};

export function LocationPanelContent({
  location,
  wiki,
  facts,
  nearby,
  category,
  nearbyLoading,
  onCategoryChange,
  onPlaceSelect,
  onClose,
}: LocationPanelContentProps) {
  const description =
    wiki?.extract ||
    location.editorialSummary ||
    `${location.name}의 주요 관광명소와 주변 여행 정보를 확인해 보세요.`;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.18em] text-sky-400">LOCATION GUIDE</p>
          <h2 className="mt-1 truncate text-2xl font-bold text-[var(--text)]">{location.name}</h2>
          <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{location.address}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="지역 소개 닫기"
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-[var(--muted)] hover:bg-white/10"
        >
          ×
        </button>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-5 pb-6">
        <PhotoGallery photos={location.photos} fallback={wiki?.thumbnail} title={location.name} compact />

        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{description}</p>
        {wiki && (
          <a
            href={wiki.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs text-sky-400 hover:underline"
          >
            Wikipedia 원문 및 출처 보기
          </a>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
          <Info label="국가" value={location.country || facts?.officialName || "정보 없음"} />
          <Info label="도시" value={location.city || location.name} />
          <Info label="현지 시간" value={formatLocalTime(location.utcOffsetMinutes)} />
          <Info label="주요 언어" value={facts?.languages.join(", ") || "정보 없음"} />
          <Info label="통화" value={facts?.currencies.join(", ") || "정보 없음"} />
          <Info label="추천 계절" value={facts?.bestSeason || "계절별 매력 확인"} />
          <Info label="대표 음식" value={facts?.representativeFood || "현지 대표 음식 탐색"} />
          <Info label="여행 주의" value={facts?.caution || "현지 공지와 안전정보 확인"} />
        </div>

        <div className="mt-6">
          <NearbyMarkers value={category} count={nearby.length} onChange={onCategoryChange} />
        </div>

        <div className="mt-3 space-y-2">
          {nearbyLoading && (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-[var(--line)] py-8 text-sm text-[var(--muted)]">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
              주변 장소를 찾고 있습니다.
            </div>
          )}
          {!nearbyLoading && nearby.length === 0 && (
            <p className="rounded-2xl border border-[var(--line)] p-5 text-center text-sm text-[var(--muted)]">
              주변 장소 검색 결과가 없습니다.
            </p>
          )}
          {!nearbyLoading && nearby.map((place) => (
            <PlaceCard key={place.id} place={place} onSelect={onPlaceSelect} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-3">
      <p className="text-[11px] text-[var(--muted)]">{label}</p>
      <p className="mt-1 line-clamp-2 font-semibold leading-5 text-[var(--text)]">{value}</p>
    </div>
  );
}

type LocationPanelProps = LocationPanelContentProps;

export default function LocationPanel(props: LocationPanelProps) {
  return (
    <aside className="glass fixed bottom-4 right-4 top-24 z-40 hidden w-[410px] overflow-hidden rounded-[26px] md:block xl:w-[440px]">
      <LocationPanelContent {...props} />
    </aside>
  );
}
```

## `components/MobileBottomSheet.tsx`

```tsx
import type { ReactNode } from "react";

type MobileBottomSheetProps = {
  open: boolean;
  children: ReactNode;
};

export default function MobileBottomSheet({ open, children }: MobileBottomSheetProps) {
  if (!open) return null;
  return (
    <section className="glass safe-bottom fixed bottom-0 left-0 right-0 z-50 h-[64vh] overflow-hidden rounded-t-[26px] md:hidden slide-up">
      <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-white/25" />
      <div className="h-[calc(100%_-_12px)]">{children}</div>
    </section>
  );
}
```

## `components/PlaceDetail.tsx`

```tsx
import { formatNumber, openingText } from "@/lib/format";
import type { PlaceSummary, WikiSummary } from "@/types/travel";
import PhotoGallery from "./PhotoGallery";

type PlaceDetailProps = {
  place: PlaceSummary | null;
  wiki: WikiSummary | null;
  onClose: () => void;
};

export default function PlaceDetail({ place, wiki, onClose }: PlaceDetailProps) {
  if (!place) return null;
  const naver = `https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(`${place.name} 여행 후기`)}`;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm md:items-center md:p-6 fade-in">
      <article className="glass safe-bottom max-h-[92vh] w-full overflow-hidden rounded-t-[28px] md:w-[min(880px,94vw)] md:rounded-[28px]">
        <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-5 md:px-7">
          <div>
            <p className="text-xs font-semibold tracking-widest text-sky-400">PLACE DETAIL</p>
            <h2 className="mt-1 text-2xl font-bold text-[var(--text)] md:text-3xl">{place.name}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{place.address}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="상세 정보 닫기" className="rounded-xl border border-[var(--line)] px-3 py-2 text-[var(--muted)] hover:bg-white/10">×</button>
        </div>

        <div className="scrollbar-thin max-h-[calc(92vh-90px)] overflow-y-auto px-5 pb-6 md:px-7">
          <PhotoGallery photos={place.photos} fallback={wiki?.thumbnail} title={place.name} />
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-amber-400/12 px-3 py-2 text-amber-300">★ {place.rating ?? "평점 없음"}</span>
            <span className="rounded-full bg-[var(--surface-soft)] px-3 py-2 text-[var(--muted)]">리뷰 {formatNumber(place.userRatingCount)}</span>
            <span className="rounded-full bg-[var(--surface-soft)] px-3 py-2 text-[var(--muted)]">{openingText(place.openNow)}</span>
            <span className="rounded-full bg-[var(--surface-soft)] px-3 py-2 text-[var(--muted)]">{place.primaryType}</span>
          </div>
          <p className="mt-5 text-sm leading-7 text-[var(--muted)]">
            {wiki?.extract || place.editorialSummary || `${place.name}의 위치, 평점, 운영 여부와 주변 여행지를 확인할 수 있습니다.`}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {place.googleMapsUri && (
              <a href={place.googleMapsUri} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-sky-500 px-4 py-3 text-center font-bold text-white hover:bg-sky-400">구글 지도에서 보기</a>
            )}
            <a href={naver} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-center font-bold text-[var(--text)] hover:border-sky-400/60">네이버 블로그 후기 검색</a>
          </div>
          {wiki && (
            <a href={wiki.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-xs text-sky-400 hover:underline">Wikipedia 출처 보기</a>
          )}
        </div>
      </article>
    </div>
  );
}
```

## `app/page.tsx`

```tsx
"use client";

import { useCallback, useMemo, useState } from "react";
import GlobeMap from "@/components/GlobeMap";
import SearchBar from "@/components/SearchBar";
import LocationPanel, { LocationPanelContent } from "@/components/LocationPanel";
import MobileBottomSheet from "@/components/MobileBottomSheet";
import PlaceDetail from "@/components/PlaceDetail";
import ErrorMessage from "@/components/ErrorMessage";
import {
  getCountryFacts,
  getNearbyPlaces,
  getPlaceDetail,
  getWikiSummary,
  reverseGeocode,
  textSearch,
} from "@/lib/clientApi";
import type {
  AutocompleteSuggestion,
  CountryFacts,
  LatLng,
  NearbyCategory,
  PlaceDetailData,
  PlaceSummary,
  SearchTarget,
  WikiSummary,
} from "@/types/travel";

export default function Home() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [selectedLocation, setSelectedLocation] = useState<PlaceDetailData | null>(null);
  const [focusTarget, setFocusTarget] = useState<SearchTarget | null>(null);
  const [nearby, setNearby] = useState<PlaceSummary[]>([]);
  const [category, setCategory] = useState<NearbyCategory>("all");
  const [wiki, setWiki] = useState<WikiSummary | null>(null);
  const [facts, setFacts] = useState<CountryFacts | null>(null);
  const [activePlace, setActivePlace] = useState<PlaceSummary | null>(null);
  const [activePlaceWiki, setActivePlaceWiki] = useState<WikiSummary | null>(null);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [error, setError] = useState("");

  const loadNearby = useCallback(async (location: LatLng, nextCategory: NearbyCategory) => {
    try {
      setLoadingNearby(true);
      const result = await getNearbyPlaces(location, nextCategory);
      setNearby(result);
    } catch (caught) {
      setNearby([]);
      setError(caught instanceof Error ? caught.message : "주변 장소를 찾지 못했습니다.");
    } finally {
      setLoadingNearby(false);
    }
  }, []);

  const applyLocation = useCallback(async (place: PlaceDetailData) => {
    setSelectedLocation(place);
    setFocusTarget({ id: place.id, name: place.name, location: place.location, kind: place.types.some((type) => type.includes("country") || type.includes("locality")) ? "region" : "place" });
    setActivePlace(null);
    setCategory("all");
    setWiki(null);
    setFacts(null);

    void loadNearby(place.location, "all");
    void getWikiSummary(`${place.name} ${place.city || place.country}`).then(setWiki).catch(() => setWiki(null));
    if (place.countryCode) {
      void getCountryFacts(place.countryCode).then(setFacts).catch(() => setFacts(null));
    }
  }, [loadNearby]);

  const handleSuggestion = useCallback(async (
    suggestion: AutocompleteSuggestion,
    sessionToken: string,
  ) => {
    try {
      const place = await getPlaceDetail(suggestion.placeId, sessionToken);
      await applyLocation(place);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "선택한 장소를 불러오지 못했습니다.");
    }
  }, [applyLocation]);

  const handleFreeTextSearch = useCallback(async (query: string) => {
    try {
      const results = await textSearch(query);
      if (results.length === 0) throw new Error("검색 결과가 없습니다. 도시와 국가를 함께 입력해 보세요.");
      const place = await getPlaceDetail(results[0].id);
      await applyLocation(place);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "여행지를 검색하지 못했습니다.");
    }
  }, [applyLocation]);

  const handleMapClick = useCallback(async (location: LatLng, placeId?: string) => {
    try {
      if (placeId) {
        const place = await getPlaceDetail(placeId);
        await applyLocation(place);
        return;
      }
      const reverse = await reverseGeocode(location);
      if (!reverse.placeId) {
        throw new Error("도시 또는 관광명소가 있는 지역을 선택해 주세요.");
      }
      const place = await getPlaceDetail(reverse.placeId);
      await applyLocation(place);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "선택한 위치의 정보를 찾지 못했습니다.");
    }
  }, [applyLocation]);

  const handleCategoryChange = useCallback((next: NearbyCategory) => {
    setCategory(next);
    if (selectedLocation) void loadNearby(selectedLocation.location, next);
  }, [loadNearby, selectedLocation]);

  const handlePlaceSelect = useCallback((place: PlaceSummary) => {
    setActivePlace(place);
    setFocusTarget({ id: place.id, name: place.name, location: place.location, kind: "place" });
    setActivePlaceWiki(null);
    void getWikiSummary(place.name).then(setActivePlaceWiki).catch(() => setActivePlaceWiki(null));
  }, []);

  const panelProps = useMemo(() => selectedLocation ? {
    location: selectedLocation,
    wiki,
    facts,
    nearby,
    category,
    nearbyLoading: loadingNearby,
    onCategoryChange: handleCategoryChange,
    onPlaceSelect: handlePlaceSelect,
    onClose: () => setSelectedLocation(null),
  } : null, [selectedLocation, wiki, facts, nearby, category, loadingNearby, handleCategoryChange, handlePlaceSelect]);

  return (
    <main data-theme={theme} className="relative h-dvh w-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <GlobeMap
        focusTarget={focusTarget}
        markers={nearby}
        selectedMarkerId={activePlace?.id ?? null}
        onLocationClick={handleMapClick}
        onMarkerClick={handlePlaceSelect}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 bg-gradient-to-b from-black/70 via-black/20 to-transparent px-4 pb-14 pt-4 md:px-7 md:pt-5">
        <div className="pointer-events-auto flex items-center justify-between">
          <div>
            <p className="text-base font-black tracking-wide text-white md:text-xl">WORLD TRAVEL</p>
            <p className="text-[9px] font-semibold tracking-[0.45em] text-sky-300 md:text-[11px]">EXPLORER</p>
          </div>
          <button
            type="button"
            onClick={() => setTheme((value) => value === "dark" ? "light" : "dark")}
            aria-label="화면 테마 변경"
            className="glass rounded-full px-3 py-2 text-sm text-[var(--text)]"
          >
            {theme === "dark" ? "라이트" : "다크"}
          </button>
        </div>
        <div className="mt-4 flex justify-center md:-mt-9">
          <SearchBar onSelectPlace={handleSuggestion} onFreeTextSearch={handleFreeTextSearch} />
        </div>
      </div>

      {!selectedLocation && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-30 -translate-x-1/2 md:bottom-8">
          <div className="glass rounded-2xl px-4 py-3 text-center text-xs text-[var(--text)] md:px-6 md:text-sm">
            지구본을 돌리거나 원하는 위치를 선택해 보세요
            <span className="mt-1 block text-[10px] text-[var(--muted)] md:text-xs">드래그로 회전 · 휠 또는 손가락으로 확대/축소</span>
          </div>
        </div>
      )}

      {panelProps && <LocationPanel {...panelProps} />}
      <MobileBottomSheet open={Boolean(panelProps)}>
        {panelProps && <LocationPanelContent {...panelProps} />}
      </MobileBottomSheet>

      <PlaceDetail place={activePlace} wiki={activePlaceWiki} onClose={() => setActivePlace(null)} />
      <ErrorMessage message={error} onClose={() => setError("")} />
    </main>
  );
}
```

## `app/api/autocomplete/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { fetchJson, getGoogleServerKey } from "@/lib/server/google";

type GoogleAutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
    };
  }>;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { input?: string; sessionToken?: string };
    const input = body.input?.trim() ?? "";
    if (input.length < 2) return NextResponse.json({ suggestions: [] });

    const data = await fetchJson<GoogleAutocompleteResponse>(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": getGoogleServerKey(),
        },
        body: JSON.stringify({
          input,
          languageCode: "ko",
          includeQueryPredictions: false,
          sessionToken: body.sessionToken,
        }),
      },
    );

    const suggestions = (data.suggestions ?? [])
      .map((item) => item.placePrediction)
      .filter((item): item is NonNullable<typeof item> => Boolean(item?.placeId))
      .slice(0, 5)
      .map((item) => ({
        placeId: item.placeId!,
        mainText: item.structuredFormat?.mainText?.text ?? item.text?.text ?? "장소",
        secondaryText: item.structuredFormat?.secondaryText?.text ?? "",
        fullText: item.text?.text ?? item.structuredFormat?.mainText?.text ?? "",
      }));

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Autocomplete 오류:", error);
    return NextResponse.json({ error: "검색어 자동완성을 불러오지 못했습니다." }, { status: 500 });
  }
}
```

## `app/api/place/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { fetchJson, getGoogleServerKey } from "@/lib/server/google";
import { GooglePlace, normalizePlaceDetail } from "@/lib/server/normalize";

const FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "googleMapsUri",
  "primaryTypeDisplayName",
  "types",
  "businessStatus",
  "currentOpeningHours",
  "photos",
  "editorialSummary",
  "addressComponents",
  "utcOffsetMinutes",
  "timeZone",
  "websiteUri",
].join(",");

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("placeId")?.trim();
  const sessionToken = request.nextUrl.searchParams.get("sessionToken")?.trim();
  if (!placeId) return NextResponse.json({ error: "placeId가 필요합니다." }, { status: 400 });

  try {
    const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
    url.searchParams.set("languageCode", "ko");
    if (sessionToken) url.searchParams.set("sessionToken", sessionToken);

    const place = await fetchJson<GooglePlace>(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": getGoogleServerKey(),
        "X-Goog-FieldMask": FIELD_MASK,
      },
    });
    const normalized = normalizePlaceDetail(place);
    return NextResponse.json({ place: normalized });
  } catch (error) {
    console.error("Place Details 오류:", error);
    return NextResponse.json({ error: "장소 상세정보를 불러오지 못했습니다." }, { status: 500 });
  }
}
```

## `app/api/search/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { fetchJson, getGoogleServerKey } from "@/lib/server/google";
import { GooglePlace, normalizePlaceSummary } from "@/lib/server/normalize";

type SearchResponse = { places?: GooglePlace[] };

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) return NextResponse.json({ error: "검색어를 입력해 주세요." }, { status: 400 });

  try {
    const data = await fetchJson<SearchResponse>(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": getGoogleServerKey(),
          "X-Goog-FieldMask": [
            "places.id",
            "places.displayName",
            "places.formattedAddress",
            "places.location",
            "places.rating",
            "places.userRatingCount",
            "places.googleMapsUri",
            "places.primaryTypeDisplayName",
            "places.types",
            "places.businessStatus",
            "places.currentOpeningHours",
            "places.photos",
            "places.editorialSummary",
          ].join(","),
        },
        body: JSON.stringify({
          textQuery: query,
          languageCode: "ko",
          pageSize: 5,
        }),
      },
    );
    const places = (data.places ?? []).map(normalizePlaceSummary);
    return NextResponse.json({ places });
  } catch (error) {
    console.error("Text Search 오류:", error);
    return NextResponse.json({ error: "관광명소 검색에 실패했습니다." }, { status: 500 });
  }
}
```

## `app/api/nearby/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { fetchJson, getGoogleServerKey } from "@/lib/server/google";
import { GooglePlace, normalizePlaceSummary } from "@/lib/server/normalize";
import type { NearbyCategory } from "@/types/travel";

const CATEGORY_TYPES: Record<NearbyCategory, string[]> = {
  all: ["tourist_attraction", "museum", "park", "historical_landmark"],
  tourist: ["tourist_attraction", "historical_landmark"],
  museum: ["museum"],
  park: ["park", "national_park"],
  restaurant: ["restaurant"],
  cafe: ["cafe"],
  hotel: ["hotel"],
};

type NearbyResponse = { places?: GooglePlace[] };

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      location?: { lat?: number; lng?: number };
      category?: NearbyCategory;
    };
    const lat = body.location?.lat;
    const lng = body.location?.lng;
    const category = body.category && CATEGORY_TYPES[body.category] ? body.category : "all";
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: "올바른 위치 좌표가 필요합니다." }, { status: 400 });
    }

    const data = await fetchJson<NearbyResponse>(
      "https://places.googleapis.com/v1/places:searchNearby",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": getGoogleServerKey(),
          "X-Goog-FieldMask": [
            "places.id",
            "places.displayName",
            "places.formattedAddress",
            "places.location",
            "places.rating",
            "places.userRatingCount",
            "places.googleMapsUri",
            "places.primaryTypeDisplayName",
            "places.types",
            "places.businessStatus",
            "places.currentOpeningHours",
            "places.photos",
            "places.editorialSummary",
          ].join(","),
        },
        body: JSON.stringify({
          includedTypes: CATEGORY_TYPES[category],
          maxResultCount: 10,
          rankPreference: "POPULARITY",
          languageCode: "ko",
          locationRestriction: {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius: category === "hotel" ? 8_000 : 5_000,
            },
          },
        }),
      },
    );
    const places = (data.places ?? []).map(normalizePlaceSummary);
    return NextResponse.json({ places });
  } catch (error) {
    console.error("Nearby Search 오류:", error);
    return NextResponse.json({ error: "주변 장소를 검색하지 못했습니다." }, { status: 500 });
  }
}
```

## `app/api/reverse-geocode/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { fetchJson, getGoogleServerKey } from "@/lib/server/google";

type GeocodeResponse = {
  status?: string;
  results?: Array<{
    place_id?: string;
    formatted_address?: string;
    address_components?: Array<{
      long_name?: string;
      short_name?: string;
      types?: string[];
    }>;
  }>;
};

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "올바른 좌표가 필요합니다." }, { status: 400 });
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("latlng", `${lat},${lng}`);
    url.searchParams.set("language", "ko");
    url.searchParams.set("key", getGoogleServerKey());
    const data = await fetchJson<GeocodeResponse>(url.toString(), { method: "GET" });
    if (data.status === "ZERO_RESULTS" || !data.results?.length) {
      return NextResponse.json({ error: "도시 또는 관광명소가 있는 지역을 선택해 주세요." }, { status: 404 });
    }

    const preferred = data.results.find((result) =>
      result.address_components?.some((component) =>
        component.types?.some((type) => ["locality", "administrative_area_level_1", "country"].includes(type)),
      ),
    ) ?? data.results[0];
    const components = preferred.address_components ?? [];
    const name =
      components.find((component) => component.types?.includes("locality"))?.long_name ||
      components.find((component) => component.types?.includes("administrative_area_level_1"))?.long_name ||
      components.find((component) => component.types?.includes("country"))?.long_name ||
      preferred.formatted_address || "선택한 위치";

    const result = {
      placeId: preferred.place_id ?? "",
      name,
      address: preferred.formatted_address ?? name,
    };
    if (!result.placeId) {
      return NextResponse.json({ error: "선택한 위치의 장소 정보를 찾지 못했습니다." }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Reverse Geocoding 오류:", error);
    return NextResponse.json({ error: "선택한 위치를 확인하지 못했습니다." }, { status: 500 });
  }
}
```

## `app/api/photo/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { fetchJson, getGoogleServerKey } from "@/lib/server/google";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")?.trim();
  const requestedWidth = Number(request.nextUrl.searchParams.get("width") ?? "1200");
  const width = Math.min(2400, Math.max(200, Number.isFinite(requestedWidth) ? requestedWidth : 1200));

  if (!name || !name.startsWith("places/") || name.includes("..")) {
    return NextResponse.json({ error: "올바른 사진 이름이 필요합니다." }, { status: 400 });
  }

  try {
    const url = new URL(`https://places.googleapis.com/v1/${name}/media`);
    url.searchParams.set("maxWidthPx", String(width));
    url.searchParams.set("skipHttpRedirect", "true");
    url.searchParams.set("key", getGoogleServerKey());
    const data = await fetchJson<{ photoUri?: string }>(url.toString(), { method: "GET" });
    if (!data.photoUri) throw new Error("사진 URI가 없습니다.");
    return NextResponse.redirect(data.photoUri, 302);
  } catch (error) {
    console.error("Place Photo 오류:", error);
    return NextResponse.json({ error: "사진을 불러오지 못했습니다." }, { status: 404 });
  }
}
```

## `app/api/wiki/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { fetchJson, getCached, setCached } from "@/lib/server/google";
import type { WikiSummary } from "@/types/travel";

type SearchResult = {
  query?: { search?: Array<{ title?: string }> };
};
type SummaryResult = {
  title?: string;
  extract?: string;
  content_urls?: { desktop?: { page?: string } };
  thumbnail?: { source?: string };
  type?: string;
};

async function lookup(query: string, language: "ko" | "en"): Promise<WikiSummary | null> {
  const api = new URL(`https://${language}.wikipedia.org/w/api.php`);
  api.searchParams.set("action", "query");
  api.searchParams.set("list", "search");
  api.searchParams.set("srsearch", query);
  api.searchParams.set("srlimit", "1");
  api.searchParams.set("format", "json");
  api.searchParams.set("formatversion", "2");

  const headers = { "User-Agent": "WorldTravelExplorer/1.0 (educational travel app)" };
  const search = await fetchJson<SearchResult>(api.toString(), { method: "GET", headers });
  const title = search.query?.search?.[0]?.title;
  if (!title) return null;

  const summaryUrl = `https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const summary = await fetchJson<SummaryResult>(summaryUrl, { method: "GET", headers });
  if (!summary.extract || summary.type === "disambiguation") return null;
  return {
    title: summary.title ?? title,
    extract: summary.extract,
    url: summary.content_urls?.desktop?.page ?? `https://${language}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    thumbnail: summary.thumbnail?.source ?? null,
    language,
  };
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) return NextResponse.json({ error: "검색어가 필요합니다." }, { status: 400 });
  try {
    const cacheKey = `wiki:${query.toLowerCase()}`;
    const cached = getCached<WikiSummary | null>(cacheKey);
    if (cached) return NextResponse.json({ summary: cached });
    const summary = (await lookup(query, "ko")) ?? (await lookup(query, "en"));
    if (!summary) return NextResponse.json({ error: "Wikipedia 소개를 찾지 못했습니다." }, { status: 404 });
    setCached(cacheKey, summary, 24 * 60 * 60_000);
    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Wikipedia 오류:", error);
    return NextResponse.json({ error: "Wikipedia 소개를 불러오지 못했습니다." }, { status: 500 });
  }
}
```

## `app/api/country/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { fetchJson, getCached, setCached } from "@/lib/server/google";
import type { CountryFacts } from "@/types/travel";

const TRAVEL_FACTS: Record<string, Pick<CountryFacts, "bestSeason" | "representativeFood" | "caution">> = {
  KR: { bestSeason: "봄·가을", representativeFood: "한식, 길거리 음식", caution: "대중교통 막차와 성수기 혼잡 확인" },
  JP: { bestSeason: "봄·가을", representativeFood: "스시, 라멘, 지역 향토음식", caution: "현금 결제처와 교통 막차 확인" },
  FR: { bestSeason: "4~6월·9~10월", representativeFood: "바게트, 치즈, 디저트", caution: "혼잡 관광지의 소지품 관리" },
  IT: { bestSeason: "4~6월·9~10월", representativeFood: "파스타, 피자, 젤라토", caution: "관광지 예약과 소지품 관리" },
  GB: { bestSeason: "5~9월", representativeFood: "피시앤칩스, 애프터눈티", caution: "변덕스러운 날씨 대비" },
  US: { bestSeason: "지역별 상이", representativeFood: "지역별 다문화 음식", caution: "도시별 치안과 이동거리 확인" },
  CH: { bestSeason: "6~9월·12~3월", representativeFood: "치즈퐁뒤, 뢰스티", caution: "산악 날씨와 높은 물가 확인" },
  ES: { bestSeason: "4~6월·9~10월", representativeFood: "타파스, 빠에야", caution: "한낮 휴무와 소지품 관리" },
  DE: { bestSeason: "5~9월·12월", representativeFood: "소시지, 프레첼", caution: "일요일 상점 휴무 확인" },
  TH: { bestSeason: "11~2월", representativeFood: "팟타이, 똠얌", caution: "더위·위생·교통안전 주의" },
  CN: { bestSeason: "봄·가을", representativeFood: "지역별 중화요리", caution: "결제 앱과 인터넷 이용 환경 확인" },
  AU: { bestSeason: "지역별 상이", representativeFood: "브런치, 해산물", caution: "강한 자외선과 장거리 이동 주의" },
};

type RestCountry = {
  name?: { official?: string };
  languages?: Record<string, string>;
  currencies?: Record<string, { name?: string; symbol?: string }>;
  flags?: { svg?: string; png?: string };
  capital?: string[];
  timezones?: string[];
};

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim().toUpperCase();
  if (!code || !/^[A-Z]{2}$/.test(code)) {
    return NextResponse.json({ error: "올바른 국가 코드가 필요합니다." }, { status: 400 });
  }
  try {
    const cacheKey = `country:${code}`;
    const cached = getCached<CountryFacts>(cacheKey);
    if (cached) return NextResponse.json({ facts: cached });
    const url = `https://restcountries.com/v3.1/alpha/${code}?fields=name,languages,currencies,flags,capital,timezones`;
    const response = await fetchJson<RestCountry | RestCountry[]>(url, { method: "GET" });
    const country = Array.isArray(response) ? response[0] : response;
    if (!country) return NextResponse.json({ error: "국가 정보를 찾지 못했습니다." }, { status: 404 });
    const extras = TRAVEL_FACTS[code] ?? {
      bestSeason: "지역의 기후와 성수기 확인",
      representativeFood: "현지 대표 음식 탐색",
      caution: "외교부 여행안전정보와 현지 공지 확인",
    };
    const facts: CountryFacts = {
      countryCode: code,
      officialName: country.name?.official ?? code,
      languages: Object.values(country.languages ?? {}),
      currencies: (Object.values(country.currencies ?? {}) as Array<{ name?: string; symbol?: string }>).map((currency) =>
        currency.symbol ? `${currency.name ?? "통화"} (${currency.symbol})` : currency.name ?? "통화",
      ),
      flag: country.flags?.svg ?? country.flags?.png ?? null,
      capital: country.capital ?? [],
      timeZones: country.timezones ?? [],
      ...extras,
    };
    setCached(cacheKey, facts, 7 * 24 * 60 * 60_000);
    return NextResponse.json({ facts });
  } catch (error) {
    console.error("국가 정보 오류:", error);
    return NextResponse.json({ error: "국가 정보를 불러오지 못했습니다." }, { status: 500 });
  }
}
```

## `README.md`

```md
# World Travel Explorer

Google Maps Platform의 **3D Maps**, Places API (New), Geocoding API와 Wikipedia를 결합한 반응형 여행 탐색 홈페이지입니다.

## 주요 기능

- 전체 화면 HYBRID 모드 3D 지구본
- 마우스·손가락 회전, 휠·핀치 확대/축소
- 초기 자동 회전 및 사용자 조작 시 중지
- 장소 자동완성 최대 5개
- 지구본 클릭 좌표 역지오코딩
- 검색 위치로 자연스러운 카메라 비행
- 주변 관광지·박물관·공원·식당·카페·호텔 검색
- 3D 마커 및 상세 정보
- Google Places 사진과 사진 제공자 표기
- 한국어 Wikipedia 우선, 없으면 영어 Wikipedia
- 최근 검색 10개 localStorage 저장 및 삭제
- PC 우측 패널 / 모바일 바텀시트
- 다크·라이트 모드

---

## 1. 프로젝트 폴더 구조

```text
world-travel-explorer
├─ app
│  ├─ api
│  │  ├─ autocomplete/route.ts
│  │  ├─ country/route.ts
│  │  ├─ nearby/route.ts
│  │  ├─ photo/route.ts
│  │  ├─ place/route.ts
│  │  ├─ reverse-geocode/route.ts
│  │  ├─ search/route.ts
│  │  └─ wiki/route.ts
│  ├─ globals.css
│  ├─ layout.tsx
│  └─ page.tsx
├─ components
│  ├─ ErrorMessage.tsx
│  ├─ FallbackGlobe.tsx
│  ├─ GlobeMap.tsx
│  ├─ LoadingOverlay.tsx
│  ├─ LocationPanel.tsx
│  ├─ MobileBottomSheet.tsx
│  ├─ NearbyMarkers.tsx
│  ├─ PhotoGallery.tsx
│  ├─ PlaceCard.tsx
│  ├─ PlaceDetail.tsx
│  ├─ RecentSearches.tsx
│  ├─ SearchBar.tsx
│  └─ SearchSuggestions.tsx
├─ lib
│  ├─ server
│  │  ├─ google.ts
│  │  └─ normalize.ts
│  ├─ clientApi.ts
│  ├─ format.ts
│  └─ googleMapsLoader.ts
├─ types/travel.ts
├─ .env.example
├─ .gitignore
├─ eslint.config.mjs
├─ next.config.ts
├─ package.json
├─ postcss.config.mjs
├─ README.md
└─ tsconfig.json
```

---

## 2. Google Cloud에서 활성화할 API

프로젝트에서 다음 세 API를 활성화합니다.

1. **Maps JavaScript API** — 브라우저의 3D 지구본
2. **Places API (New)** — 자동완성, 장소 상세, 주변 검색, 사진
3. **Geocoding API** — 지구본 클릭 위치의 역지오코딩

결제 계정도 해당 Google Cloud 프로젝트에 연결해야 합니다.

---

## 3. API 키를 두 개로 분리

### A. 브라우저 지도용 키

- API 제한: `Maps JavaScript API`
- 애플리케이션 제한: `웹사이트`
- 허용 리퍼러 예시:

```text
http://localhost:3000/*
https://내-프로젝트.vercel.app/*
https://내도메인.com/*
```

### B. 서버용 비밀 키

- API 제한: `Places API (New)`, `Geocoding API`
- 이 키는 `.env.local`과 Vercel 환경변수에만 저장합니다.
- `NEXT_PUBLIC_`을 붙이면 안 됩니다.

---

## 4. 환경변수 만들기

프로젝트 최상위에 `.env.local`을 만듭니다.

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=브라우저_지도용_키
GOOGLE_MAPS_SERVER_API_KEY=서버용_비밀_키
```

기존에 아래 이름으로 만든 키도 서버 코드가 읽습니다.

```env
GOOGLE_PLACES_API_KEY=기존_서버용_키
```

API 키가 보이는 화면은 사진으로 공유하지 마세요. 노출된 키는 Google Cloud에서 즉시 삭제하고 새로 발급합니다.

---

## 5. 설치와 실행

PowerShell 보안 정책 때문에 `npm` 실행이 차단되는 컴퓨터에서는 `.cmd`를 붙입니다.

```powershell
cd C:\Users\USER\world-travel-explorer
npm.cmd install
npm.cmd run dev
```

브라우저에서 엽니다.

```text
http://localhost:3000
```

일반 명령 프롬프트에서는 다음도 가능합니다.

```cmd
npm install
npm run dev
```

---

## 6. 기존 프로젝트에 적용하는 방법

1. 실행 중인 서버를 `Ctrl + C`로 중지합니다.
2. 기존 폴더를 별도 위치에 백업합니다.
3. 이 패키지의 `app`, `components`, `lib`, `types` 폴더와 설정 파일을 기존 프로젝트로 복사합니다.
4. 기존 `.env.local`은 삭제하지 말고 필요한 두 환경변수를 추가합니다.
5. 아래 명령을 실행합니다.

```powershell
npm.cmd install
npm.cmd run dev
```

---

## 7. 기능 확인 순서

1. 초기화면에 3D 지구본이 표시되는지 확인
2. 파리, 도쿄 등 인기 여행지 버튼 클릭
3. 검색창에 두 글자 이상 입력해 추천 목록 확인
4. 추천 결과를 선택했을 때 카메라가 이동하는지 확인
5. 지구본의 육지 위치를 클릭해 지역 패널이 열리는지 확인
6. 관광지·카페·식당·호텔 필터 변경
7. 장소 카드를 눌러 3D 마커 이동 및 상세 패널 확인
8. 모바일 개발자 도구에서 바텀시트 확인

---

## 8. 자주 발생하는 오류

### 3D 지구본 대신 안내용 지구가 보임

`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`가 없거나 Maps JavaScript API가 비활성화된 상태입니다. 키를 넣은 뒤 서버를 다시 시작하세요.

```powershell
Ctrl + C
npm.cmd run dev
```

### 자동완성 또는 주변 검색 오류

- Places API (New) 활성화 여부
- 서버 키의 API 제한
- 결제 계정 연결 여부
- `.env.local`이 `package.json`과 같은 최상위에 있는지 확인

### 지구본 클릭 위치를 찾지 못함

바다나 매우 넓은 지역은 역지오코딩 결과가 없을 수 있습니다. 도시 또는 육지의 지명 근처를 클릭하세요.

### 사진이 보이지 않음

Place Photo 이름은 만료될 수 있으므로 사진 URL을 데이터베이스에 장기 저장하지 마세요. 이 프로젝트는 매 검색 응답에서 받은 최신 사진 이름을 사용합니다.

---

## 9. Vercel 배포

1. GitHub 저장소에 프로젝트를 업로드합니다. `.env.local`은 업로드하지 않습니다.
2. Vercel에서 `Add New Project` → GitHub 저장소 선택
3. Vercel `Settings` → `Environment Variables`에 아래 값을 추가

```text
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
GOOGLE_MAPS_SERVER_API_KEY
```

4. 배포 후 브라우저 키의 HTTP 리퍼러에 Vercel 주소를 추가합니다.
5. 다시 배포합니다.

---

## 10. 비용과 보안

- Google API는 요청한 필드에 따라 과금될 수 있습니다.
- Route Handler는 필요한 FieldMask만 요청합니다.
- 자동완성은 360ms 디바운스와 최소 2글자 조건을 사용합니다.
- 요청 중복은 자동완성 디바운스로 줄이며, Wikipedia와 국가 기본정보만 서버 메모리 TTL 캐시를 사용합니다. Google Places 사진 이름과 장소 응답은 정책과 만료 가능성을 고려해 영구 저장하지 않습니다.
- 운영 서비스에서는 Google Cloud의 할당량, 예산 알림, API별 사용량을 설정하세요.
```
