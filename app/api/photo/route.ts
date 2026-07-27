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
