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
