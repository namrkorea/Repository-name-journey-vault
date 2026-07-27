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

// 비동기 지도 로딩이 끝난 시점에
// 지도 표시 영역이 아직 존재하는지 다시 확인합니다.
const mapHost = hostRef.current;

if (!mapHost) {
  throw new Error("3D 지도를 표시할 영역을 찾을 수 없습니다.");
}

mapHost.addEventListener(
  "pointerdown",
  stopAutoRotation,
  true,
);

mapHost.addEventListener(
  "wheel",
  stopAutoRotation,
  true,
);

mapHost.addEventListener(
  "touchstart",
  stopAutoRotation,
  true,
);

mapHost.appendChild(map);

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
