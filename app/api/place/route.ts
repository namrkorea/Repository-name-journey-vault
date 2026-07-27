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
