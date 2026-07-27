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
