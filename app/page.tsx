"use client";

import Link from "next/link";
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

const serviceLinks = [
  { href: "/planner", label: "AI 계획 만들기" },
  { href: "/plans", label: "저장된 일정" },
  { href: "/admin", label: "관리자" },
];

export default function Home() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [selectedLocation, setSelectedLocation] =
    useState<PlaceDetailData | null>(null);
  const [focusTarget, setFocusTarget] = useState<SearchTarget | null>(null);
  const [nearby, setNearby] = useState<PlaceSummary[]>([]);
  const [category, setCategory] = useState<NearbyCategory>("all");
  const [wiki, setWiki] = useState<WikiSummary | null>(null);
  const [facts, setFacts] = useState<CountryFacts | null>(null);
  const [activePlace, setActivePlace] = useState<PlaceSummary | null>(null);
  const [activePlaceWiki, setActivePlaceWiki] =
    useState<WikiSummary | null>(null);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [error, setError] = useState("");

  const loadNearby = useCallback(
    async (location: LatLng, nextCategory: NearbyCategory) => {
      try {
        setLoadingNearby(true);
        const result = await getNearbyPlaces(location, nextCategory);
        setNearby(result);
      } catch (caught) {
        setNearby([]);
        setError(
          caught instanceof Error
            ? caught.message
            : "주변 장소를 찾지 못했습니다.",
        );
      } finally {
        setLoadingNearby(false);
      }
    },
    [],
  );

  const applyLocation = useCallback(
    async (place: PlaceDetailData) => {
      setSelectedLocation(place);
      setFocusTarget({
        id: place.id,
        name: place.name,
        location: place.location,
        kind: place.types.some(
          (type) => type.includes("country") || type.includes("locality"),
        )
          ? "region"
          : "place",
      });
      setActivePlace(null);
      setCategory("all");
      setWiki(null);
      setFacts(null);

      void loadNearby(place.location, "all");
      void getWikiSummary(`${place.name} ${place.city || place.country}`)
        .then(setWiki)
        .catch(() => setWiki(null));
      if (place.countryCode) {
        void getCountryFacts(place.countryCode)
          .then(setFacts)
          .catch(() => setFacts(null));
      }
    },
    [loadNearby],
  );

  const handleSuggestion = useCallback(
    async (
      suggestion: AutocompleteSuggestion,
      sessionToken: string,
    ) => {
      try {
        const place = await getPlaceDetail(
          suggestion.placeId,
          sessionToken,
        );
        await applyLocation(place);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "선택한 장소를 불러오지 못했습니다.",
        );
      }
    },
    [applyLocation],
  );

  const handleFreeTextSearch = useCallback(
    async (query: string) => {
      try {
        const results = await textSearch(query);
        if (results.length === 0) {
          throw new Error(
            "검색 결과가 없습니다. 도시와 국가를 함께 입력해 보세요.",
          );
        }
        const place = await getPlaceDetail(results[0].id);
        await applyLocation(place);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "여행지를 검색하지 못했습니다.",
        );
      }
    },
    [applyLocation],
  );

  const handleMapClick = useCallback(
    async (location: LatLng, placeId?: string) => {
      try {
        if (placeId) {
          const place = await getPlaceDetail(placeId);
          await applyLocation(place);
          return;
        }
        const reverse = await reverseGeocode(location);
        if (!reverse.placeId) {
          throw new Error(
            "도시 또는 관광명소가 있는 지역을 선택해 주세요.",
          );
        }
        const place = await getPlaceDetail(reverse.placeId);
        await applyLocation(place);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "선택한 위치의 정보를 찾지 못했습니다.",
        );
      }
    },
    [applyLocation],
  );

  const handleCategoryChange = useCallback(
    (next: NearbyCategory) => {
      setCategory(next);
      if (selectedLocation) {
        void loadNearby(selectedLocation.location, next);
      }
    },
    [loadNearby, selectedLocation],
  );

  const handlePlaceSelect = useCallback((place: PlaceSummary) => {
    setActivePlace(place);
    setFocusTarget({
      id: place.id,
      name: place.name,
      location: place.location,
      kind: "place",
    });
    setActivePlaceWiki(null);
    void getWikiSummary(place.name)
      .then(setActivePlaceWiki)
      .catch(() => setActivePlaceWiki(null));
  }, []);

  const panelProps = useMemo(
    () =>
      selectedLocation
        ? {
            location: selectedLocation,
            wiki,
            facts,
            nearby,
            category,
            nearbyLoading: loadingNearby,
            onCategoryChange: handleCategoryChange,
            onPlaceSelect: handlePlaceSelect,
            onClose: () => setSelectedLocation(null),
          }
        : null,
    [
      selectedLocation,
      wiki,
      facts,
      nearby,
      category,
      loadingNearby,
      handleCategoryChange,
      handlePlaceSelect,
    ],
  );

  return (
    <main
      data-theme={theme}
      className="relative h-dvh w-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]"
    >
      <GlobeMap
        focusTarget={focusTarget}
        markers={nearby}
        selectedMarkerId={activePlace?.id ?? null}
        onLocationClick={handleMapClick}
        onMarkerClick={handlePlaceSelect}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 bg-gradient-to-b from-black/75 via-black/25 to-transparent px-4 pb-14 pt-4 md:px-7 md:pt-5">
        <div className="pointer-events-auto flex items-start justify-between gap-3">
          <div className="shrink-0">
            <p className="text-base font-black tracking-wide text-white md:text-xl">
              JOURNEY VAULT AI
            </p>
            <p className="text-[8px] font-semibold tracking-[0.34em] text-sky-300 md:text-[10px]">
              PRIVATE TRAVEL DESIGNER
            </p>
            <div className="mt-2 flex items-center gap-2 text-[8px] font-medium tracking-[0.12em] text-white/55 md:text-[9px]">
              <span>v2.0</span>
              <span
                className="h-2.5 w-px bg-white/25"
                aria-hidden="true"
              />
              <span>by Changho Park</span>
            </div>
          </div>

          <nav className="hidden items-center gap-2 md:flex">
            {serviceLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="glass rounded-full px-4 py-2 text-xs font-semibold text-white/75 transition hover:bg-white/15 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            onClick={() =>
              setTheme((value) => (value === "dark" ? "light" : "dark"))
            }
            aria-label="화면 테마 변경"
            className="glass rounded-full px-3 py-2 text-sm text-[var(--text)]"
          >
            {theme === "dark" ? "라이트" : "다크"}
          </button>
        </div>

        <div className="pointer-events-auto mt-3 flex gap-2 overflow-x-auto pb-1 md:hidden">
          {serviceLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="glass whitespace-nowrap rounded-full px-3 py-2 text-xs text-white/80"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="mt-4 flex justify-center md:-mt-8">
          <SearchBar
            onSelectPlace={handleSuggestion}
            onFreeTextSearch={handleFreeTextSearch}
          />
        </div>
      </div>

      {!selectedLocation && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-30 -translate-x-1/2 md:bottom-8">
          <div className="glass rounded-2xl px-4 py-3 text-center text-xs text-[var(--text)] md:px-6 md:text-sm">
            지구본을 돌리거나 원하는 위치를 선택해 보세요
            <span className="mt-1 block text-[10px] text-[var(--muted)] md:text-xs">
              드래그로 회전 · 휠 또는 손가락으로 확대/축소
            </span>
          </div>
        </div>
      )}

      {panelProps && <LocationPanel {...panelProps} />}
      <MobileBottomSheet open={Boolean(panelProps)}>
        {panelProps && <LocationPanelContent {...panelProps} />}
      </MobileBottomSheet>

      <PlaceDetail
        place={activePlace}
        wiki={activePlaceWiki}
        onClose={() => setActivePlace(null)}
      />
      <ErrorMessage message={error} onClose={() => setError("")} />
    </main>
  );
}
