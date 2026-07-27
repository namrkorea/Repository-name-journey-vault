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
