import type { NearbyCategory } from "@/types/travel";

const CATEGORIES: Array<{ id: NearbyCategory; label: string }> = [
  { id: "all", label: "전체" },
  { id: "tourist", label: "관광지" },
  { id: "museum", label: "박물관" },
  { id: "park", label: "공원" },
  { id: "restaurant", label: "식당" },
  { id: "cafe", label: "카페" },
  { id: "hotel", label: "호텔" },
];

type NearbyMarkersProps = {
  value: NearbyCategory;
  count: number;
  onChange: (category: NearbyCategory) => void;
};

export default function NearbyMarkers({ value, count, onChange }: NearbyMarkersProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-[var(--text)]">주변 추천 장소</h3>
        <span className="text-xs text-[var(--muted)]">지도 마커 {count}개</span>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onChange(category.id)}
            className={`shrink-0 rounded-full border px-3 py-2 text-xs transition ${
              value === category.id
                ? "border-sky-400 bg-sky-500/20 text-sky-200"
                : "border-[var(--line)] bg-[var(--surface-soft)] text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>
    </div>
  );
}
