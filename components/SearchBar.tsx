"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { getAutocompleteSuggestions } from "@/lib/clientApi";
import type { AutocompleteSuggestion } from "@/types/travel";
import RecentSearches from "./RecentSearches";
import SearchSuggestions from "./SearchSuggestions";

const RECENT_KEY = "world-travel-explorer-recent";

const POPULAR = [
  "파리 프랑스",
  "도쿄 일본",
  "로마 이탈리아",
  "뉴욕 미국",
  "런던 영국",
  "후쿠오카 일본",
  "스위스",
  "서울 대한민국",
];

type SearchBarProps = {
  onSelectPlace: (
    suggestion: AutocompleteSuggestion,
    sessionToken: string,
  ) => void;
  onFreeTextSearch: (query: string) => void;
};

function newSessionToken(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function SearchBar({
  onSelectPlace,
  onFreeTextSearch,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const sessionTokenRef = useRef(newSessionToken());

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[];
      setRecent(Array.isArray(saved) ? saved.slice(0, 10) : []);
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    const clean = query.trim();
    if (clean.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        const result = await getAutocompleteSuggestions(
          clean,
          sessionTokenRef.current,
          controller.signal,
        );
        setSuggestions(result.slice(0, 5));
        setActiveIndex(-1);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 360);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  function saveRecent(value: string) {
    const next = [value, ...recent.filter((item) => item !== value)].slice(0, 10);
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  }

  function selectSuggestion(suggestion: AutocompleteSuggestion) {
    const token = sessionTokenRef.current;
    setQuery(suggestion.fullText);
    saveRecent(suggestion.fullText);
    setSuggestions([]);
    setFocused(false);
    onSelectPlace(suggestion, token);
    sessionTokenRef.current = newSessionToken();
  }

  function submit(value: string) {
    const clean = value.trim();
    if (!clean) return;
    saveRecent(clean);
    setSuggestions([]);
    setFocused(false);
    onFreeTextSearch(clean);
    sessionTokenRef.current = newSessionToken();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      selectSuggestion(suggestions[activeIndex]);
      return;
    }
    submit(query);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp" && suggestions.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Escape") {
      setSuggestions([]);
      setFocused(false);
    }
  }

  return (
    <div className="pointer-events-auto w-full max-w-[760px]">
      <div className="relative">
        <form
          onSubmit={handleSubmit}
          className="glass flex h-14 items-center gap-2 rounded-2xl px-3 md:h-16"
          role="search"
        >
          <span aria-hidden="true" className="pl-1 text-xl text-sky-300">⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 120)}
            onKeyDown={handleKeyDown}
            aria-label="국가, 도시 또는 관광명소 검색"
            aria-autocomplete="list"
            placeholder="국가, 도시 또는 관광명소를 검색하세요"
            className="min-w-0 flex-1 bg-transparent px-2 text-[15px] text-[var(--text)] outline-none placeholder:text-[var(--muted)] md:text-base"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setSuggestions([]); }}
              aria-label="검색어 지우기"
              className="rounded-lg px-2 py-1 text-[var(--muted)] hover:bg-white/10"
            >
              ×
            </button>
          )}
          <button
            type="submit"
            className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-sky-400 md:px-6"
          >
            검색
          </button>
        </form>

        {focused && suggestions.length > 0 && (
          <SearchSuggestions
            suggestions={suggestions}
            activeIndex={activeIndex}
            loading={loading}
            onSelect={selectSuggestion}
          />
        )}
        {focused && loading && suggestions.length === 0 && (
          <SearchSuggestions
            suggestions={[]}
            activeIndex={-1}
            loading
            onSelect={selectSuggestion}
          />
        )}
        {focused && query.trim().length < 2 && (
          <RecentSearches
            items={recent}
            onSelect={(value) => { setQuery(value); submit(value); }}
            onClear={() => {
              setRecent([]);
              localStorage.removeItem(RECENT_KEY);
            }}
          />
        )}
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:justify-center">
        {POPULAR.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => { setQuery(item); submit(item); }}
            className="glass shrink-0 rounded-full px-3 py-2 text-xs text-[var(--text)] transition hover:border-sky-400/70 md:px-4"
          >
            {item.replace(/\s(프랑스|일본|이탈리아|미국|영국|대한민국)$/, "")}
          </button>
        ))}
      </div>
    </div>
  );
}
