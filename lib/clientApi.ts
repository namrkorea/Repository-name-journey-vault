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
