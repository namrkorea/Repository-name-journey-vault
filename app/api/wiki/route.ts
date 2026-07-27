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
