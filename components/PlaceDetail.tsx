import { formatNumber, openingText } from "@/lib/format";
import type { PlaceSummary, WikiSummary } from "@/types/travel";
import PhotoGallery from "./PhotoGallery";

type PlaceDetailProps = {
  place: PlaceSummary | null;
  wiki: WikiSummary | null;
  onClose: () => void;
};

export default function PlaceDetail({ place, wiki, onClose }: PlaceDetailProps) {
  if (!place) return null;
  const naver = `https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(`${place.name} 여행 후기`)}`;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm md:items-center md:p-6 fade-in">
      <article className="glass safe-bottom max-h-[92vh] w-full overflow-hidden rounded-t-[28px] md:w-[min(880px,94vw)] md:rounded-[28px]">
        <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-5 md:px-7">
          <div>
            <p className="text-xs font-semibold tracking-widest text-sky-400">PLACE DETAIL</p>
            <h2 className="mt-1 text-2xl font-bold text-[var(--text)] md:text-3xl">{place.name}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{place.address}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="상세 정보 닫기" className="rounded-xl border border-[var(--line)] px-3 py-2 text-[var(--muted)] hover:bg-white/10">×</button>
        </div>

        <div className="scrollbar-thin max-h-[calc(92vh-90px)] overflow-y-auto px-5 pb-6 md:px-7">
          <PhotoGallery photos={place.photos} fallback={wiki?.thumbnail} title={place.name} />
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-amber-400/12 px-3 py-2 text-amber-300">★ {place.rating ?? "평점 없음"}</span>
            <span className="rounded-full bg-[var(--surface-soft)] px-3 py-2 text-[var(--muted)]">리뷰 {formatNumber(place.userRatingCount)}</span>
            <span className="rounded-full bg-[var(--surface-soft)] px-3 py-2 text-[var(--muted)]">{openingText(place.openNow)}</span>
            <span className="rounded-full bg-[var(--surface-soft)] px-3 py-2 text-[var(--muted)]">{place.primaryType}</span>
          </div>
          <p className="mt-5 text-sm leading-7 text-[var(--muted)]">
            {wiki?.extract || place.editorialSummary || `${place.name}의 위치, 평점, 운영 여부와 주변 여행지를 확인할 수 있습니다.`}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {place.googleMapsUri && (
              <a href={place.googleMapsUri} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-sky-500 px-4 py-3 text-center font-bold text-white hover:bg-sky-400">구글 지도에서 보기</a>
            )}
            <a href={naver} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-center font-bold text-[var(--text)] hover:border-sky-400/60">네이버 블로그 후기 검색</a>
          </div>
          {wiki && (
            <a href={wiki.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-xs text-sky-400 hover:underline">Wikipedia 출처 보기</a>
          )}
        </div>
      </article>
    </div>
  );
}
