import type { AutocompleteSuggestion } from "@/types/travel";

type SearchSuggestionsProps = {
  suggestions: AutocompleteSuggestion[];
  activeIndex: number;
  loading: boolean;
  onSelect: (suggestion: AutocompleteSuggestion) => void;
};

export default function SearchSuggestions({
  suggestions,
  activeIndex,
  loading,
  onSelect,
}: SearchSuggestionsProps) {
  if (!loading && suggestions.length === 0) return null;

  return (
    <div
      className="glass absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl text-left"
      role="listbox"
      aria-label="장소 검색 추천"
    >
      {loading && (
        <div className="flex items-center gap-3 px-4 py-4 text-sm text-[var(--muted)]">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
          검색어를 확인하고 있습니다.
        </div>
      )}

      {!loading && suggestions.map((suggestion, index) => (
        <button
          key={suggestion.placeId}
          type="button"
          role="option"
          aria-selected={activeIndex === index}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(suggestion)}
          className={`block w-full border-t border-[var(--line)] px-4 py-3 text-left transition first:border-t-0 ${
            activeIndex === index ? "bg-sky-500/15" : "hover:bg-white/8"
          }`}
        >
          <span className="block font-semibold text-[var(--text)]">
            {suggestion.mainText}
          </span>
          <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
            {suggestion.secondaryText}
          </span>
        </button>
      ))}

      <div className="border-t border-[var(--line)] px-4 py-2 text-right text-[10px] tracking-wide text-[var(--muted)]">
        Powered by Google
      </div>
    </div>
  );
}
