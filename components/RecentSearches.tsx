type RecentSearchesProps = {
  items: string[];
  onSelect: (value: string) => void;
  onClear: () => void;
};

export default function RecentSearches({
  items,
  onSelect,
  onClear,
}: RecentSearchesProps) {
  if (items.length === 0) return null;
  return (
    <div className="glass absolute left-0 right-0 top-[calc(100%+8px)] z-40 rounded-2xl p-3 text-left">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-[var(--muted)]">최근 검색</span>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClear}
          className="text-xs text-sky-400 hover:underline"
        >
          모두 삭제
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(item)}
            className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-xs text-[var(--text)] hover:border-sky-400/60"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
