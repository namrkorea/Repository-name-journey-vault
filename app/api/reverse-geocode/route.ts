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
