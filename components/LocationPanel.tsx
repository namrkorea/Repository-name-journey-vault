import { formatLocalTime } from "@/lib/format";
import type {
  CountryFacts,
  NearbyCategory,
  PlaceDetailData,
  PlaceSummary,
  WikiSummary,
} from "@/types/travel";
import NearbyMarkers from "./NearbyMarkers";
import PhotoGallery from "./PhotoGallery";
import PlaceCard from "./PlaceCard";

type LocationPanelContentProps = {
  location: PlaceDetailData;
  wiki: WikiSummary | null;
  facts: CountryFacts | null;
  nearby: PlaceSummary[];
  category: NearbyCategory;
  nearbyLoading: boolean;
  onCategoryChange: (value: NearbyCategory) => void;
  onPlaceSelect: (place: PlaceSummary) => void;
  onClose: () => void;
};

export function LocationPanelContent({
  location,
  wiki,
  facts,
  nearby,
  category,
  nearbyLoading,
  onCategoryChange,
  onPlaceSelect,
  onClose,
}: LocationPanelContentProps) {
  const description =
    wiki?.extract ||
    location.editorialSummary ||
    `${location.name}의 주요 관광명소와 주변 여행 정보를 확인해 보세요.`;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.18em] text-sky-400">LOCATION GUIDE</p>
          <h2 className="mt-1 truncate text-2xl font-bold text-[var(--text)]">{location.name}</h2>
          <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{location.address}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="지역 소개 닫기"
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-[var(--muted)] hover:bg-white/10"
        >
          ×
        </button>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-5 pb-6">
        <PhotoGallery photos={location.photos} fallback={wiki?.thumbnail} title={location.name} compact />

        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{description}</p>
        {wiki && (
          <a
            href={wiki.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs text-sky-400 hover:underline"
          >
            Wikipedia 원문 및 출처 보기
          </a>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
          <Info label="국가" value={location.country || facts?.officialName || "정보 없음"} />
          <Info label="도시" value={location.city || location.name} />
          <Info label="현지 시간" value={formatLocalTime(location.utcOffsetMinutes)} />
          <Info label="주요 언어" value={facts?.languages.join(", ") || "정보 없음"} />
          <Info label="통화" value={facts?.currencies.join(", ") || "정보 없음"} />
          <Info label="추천 계절" value={facts?.bestSeason || "계절별 매력 확인"} />
          <Info label="대표 음식" value={facts?.representativeFood || "현지 대표 음식 탐색"} />
          <Info label="여행 주의" value={facts?.caution || "현지 공지와 안전정보 확인"} />
        </div>

        <div className="mt-6">
          <NearbyMarkers value={category} count={nearby.length} onChange={onCategoryChange} />
        </div>

        <div className="mt-3 space-y-2">
          {nearbyLoading && (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-[var(--line)] py-8 text-sm text-[var(--muted)]">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
              주변 장소를 찾고 있습니다.
            </div>
          )}
          {!nearbyLoading && nearby.length === 0 && (
            <p className="rounded-2xl border border-[var(--line)] p-5 text-center text-sm text-[var(--muted)]">
              주변 장소 검색 결과가 없습니다.
            </p>
          )}
          {!nearbyLoading && nearby.map((place) => (
            <PlaceCard key={place.id} place={place} onSelect={onPlaceSelect} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-3">
      <p className="text-[11px] text-[var(--muted)]">{label}</p>
      <p className="mt-1 line-clamp-2 font-semibold leading-5 text-[var(--text)]">{value}</p>
    </div>
  );
}

type LocationPanelProps = LocationPanelContentProps;

export default function LocationPanel(props: LocationPanelProps) {
  return (
    <aside className="glass fixed bottom-4 right-4 top-24 z-40 hidden w-[410px] overflow-hidden rounded-[26px] md:block xl:w-[440px]">
      <LocationPanelContent {...props} />
    </aside>
  );
}
