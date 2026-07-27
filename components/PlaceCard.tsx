import { formatNumber, getPhotoUrl, openingText } from "@/lib/format";
import type { PlaceSummary } from "@/types/travel";

type PlaceCardProps = {
  place: PlaceSummary;
  onSelect: (place: PlaceSummary) => void;
};

export default function PlaceCard({ place, onSelect }: PlaceCardProps) {
  const photo = place.photos[0];
  return (
    <button
      type="button"
      onClick={() => onSelect(place)}
      className="group grid w-full grid-cols-[92px_1fr] gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-2 text-left transition hover:-translate-y-0.5 hover:border-sky-400/60"
    >
      <div className="h-[86px] overflow-hidden rounded-xl bg-slate-900">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getPhotoUrl(photo.name, 360)}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl">⌖</div>
        )}
      </div>
      <div className="min-w-0 py-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="truncate font-bold text-[var(--text)]">{place.name}</h4>
          <span className={`shrink-0 text-[11px] ${place.openNow ? "text-emerald-400" : "text-[var(--muted)]"}`}>
            {openingText(place.openNow)}
          </span>
        </div>
        <p className="mt-1 line-clamp-1 text-xs text-[var(--muted)]">{place.primaryType}</p>
        <p className="mt-2 line-clamp-1 text-xs text-[var(--muted)]">{place.address}</p>
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-amber-400">★ {place.rating ?? "-"}</span>
          <span className="text-[var(--muted)]">리뷰 {formatNumber(place.userRatingCount)}</span>
        </div>
      </div>
    </button>
  );
}
