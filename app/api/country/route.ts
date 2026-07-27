import { NextRequest, NextResponse } from "next/server";
import { fetchJson, getCached, setCached } from "@/lib/server/google";
import type { CountryFacts } from "@/types/travel";

const TRAVEL_FACTS: Record<string, Pick<CountryFacts, "bestSeason" | "representativeFood" | "caution">> = {
  KR: { bestSeason: "봄·가을", representativeFood: "한식, 길거리 음식", caution: "대중교통 막차와 성수기 혼잡 확인" },
  JP: { bestSeason: "봄·가을", representativeFood: "스시, 라멘, 지역 향토음식", caution: "현금 결제처와 교통 막차 확인" },
  FR: { bestSeason: "4~6월·9~10월", representativeFood: "바게트, 치즈, 디저트", caution: "혼잡 관광지의 소지품 관리" },
  IT: { bestSeason: "4~6월·9~10월", representativeFood: "파스타, 피자, 젤라토", caution: "관광지 예약과 소지품 관리" },
  GB: { bestSeason: "5~9월", representativeFood: "피시앤칩스, 애프터눈티", caution: "변덕스러운 날씨 대비" },
  US: { bestSeason: "지역별 상이", representativeFood: "지역별 다문화 음식", caution: "도시별 치안과 이동거리 확인" },
  CH: { bestSeason: "6~9월·12~3월", representativeFood: "치즈퐁뒤, 뢰스티", caution: "산악 날씨와 높은 물가 확인" },
  ES: { bestSeason: "4~6월·9~10월", representativeFood: "타파스, 빠에야", caution: "한낮 휴무와 소지품 관리" },
  DE: { bestSeason: "5~9월·12월", representativeFood: "소시지, 프레첼", caution: "일요일 상점 휴무 확인" },
  TH: { bestSeason: "11~2월", representativeFood: "팟타이, 똠얌", caution: "더위·위생·교통안전 주의" },
  CN: { bestSeason: "봄·가을", representativeFood: "지역별 중화요리", caution: "결제 앱과 인터넷 이용 환경 확인" },
  AU: { bestSeason: "지역별 상이", representativeFood: "브런치, 해산물", caution: "강한 자외선과 장거리 이동 주의" },
};

type RestCountry = {
  name?: { official?: string };
  languages?: Record<string, string>;
  currencies?: Record<string, { name?: string; symbol?: string }>;
  flags?: { svg?: string; png?: string };
  capital?: string[];
  timezones?: string[];
};

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim().toUpperCase();
  if (!code || !/^[A-Z]{2}$/.test(code)) {
    return NextResponse.json({ error: "올바른 국가 코드가 필요합니다." }, { status: 400 });
  }
  try {
    const cacheKey = `country:${code}`;
    const cached = getCached<CountryFacts>(cacheKey);
    if (cached) return NextResponse.json({ facts: cached });
    const url = `https://restcountries.com/v3.1/alpha/${code}?fields=name,languages,currencies,flags,capital,timezones`;
    const response = await fetchJson<RestCountry | RestCountry[]>(url, { method: "GET" });
    const country = Array.isArray(response) ? response[0] : response;
    if (!country) return NextResponse.json({ error: "국가 정보를 찾지 못했습니다." }, { status: 404 });
    const extras = TRAVEL_FACTS[code] ?? {
      bestSeason: "지역의 기후와 성수기 확인",
      representativeFood: "현지 대표 음식 탐색",
      caution: "외교부 여행안전정보와 현지 공지 확인",
    };
    const facts: CountryFacts = {
      countryCode: code,
      officialName: country.name?.official ?? code,
      languages: Object.values(country.languages ?? {}),
      currencies: (Object.values(country.currencies ?? {}) as Array<{ name?: string; symbol?: string }>).map((currency) =>
        currency.symbol ? `${currency.name ?? "통화"} (${currency.symbol})` : currency.name ?? "통화",
      ),
      flag: country.flags?.svg ?? country.flags?.png ?? null,
      capital: country.capital ?? [],
      timeZones: country.timezones ?? [],
      ...extras,
    };
    setCached(cacheKey, facts, 7 * 24 * 60 * 60_000);
    return NextResponse.json({ facts });
  } catch (error) {
    console.error("국가 정보 오류:", error);
    return NextResponse.json({ error: "국가 정보를 불러오지 못했습니다." }, { status: 500 });
  }
}
