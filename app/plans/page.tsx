"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import type { TravelPlanPublic } from "@/types/plan";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

export default function PlansPage() {
  const [plans, setPlans] = useState<TravelPlanPublic[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/plans", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as {
          plans?: TravelPlanPublic[];
          error?: string;
        };
        if (!response.ok) throw new Error(data.error);
        setPlans(data.plans ?? []);
      })
      .catch((caught) =>
        setError(
          caught instanceof Error
            ? caught.message
            : "저장된 일정을 불러오지 못했습니다.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return plans;
    return plans.filter(
      (plan) =>
        plan.title.toLowerCase().includes(keyword) ||
        plan.destination.toLowerCase().includes(keyword),
    );
  }, [plans, query]);

  return (
    <main className="min-h-screen bg-[#030914] text-white">
      <AppHeader />
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-bold tracking-[0.25em] text-sky-300">
              PRIVATE PLAN BOARD
            </p>
            <h1 className="mt-2 text-3xl font-black md:text-5xl">
              저장된 여행 일정
            </h1>
            <p className="mt-3 text-white/50">
              각 일정은 작성자가 설정한 비밀번호로 보호됩니다.
            </p>
          </div>
          <Link
            href="/planner"
            className="rounded-full bg-sky-500 px-5 py-3 text-sm font-bold text-white hover:bg-sky-400"
          >
            + 새 여행계획
          </Link>
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.05] p-4">
          <label className="sr-only" htmlFor="plan-search">
            일정 검색
          </label>
          <input
            id="plan-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="여행 제목 또는 여행지 검색"
            className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-sky-300/50"
          />
        </div>

        {loading && (
          <div className="mt-10 text-center text-sm text-white/45">
            저장된 일정을 불러오는 중입니다.
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-8 rounded-2xl border border-red-300/20 bg-red-500/10 p-4 text-sm text-red-100"
          >
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="mt-10 rounded-3xl border border-dashed border-white/15 p-12 text-center">
            <p className="text-white/55">표시할 여행 일정이 없습니다.</p>
            <Link
              href="/planner"
              className="mt-4 inline-block text-sm font-bold text-sky-300"
            >
              첫 여행계획 만들기
            </Link>
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((plan, index) => (
            <Link
              key={plan.id}
              href={`/plans/${plan.id}`}
              className="group rounded-3xl border border-white/10 bg-white/[0.055] p-5 transition hover:-translate-y-1 hover:border-sky-300/35 hover:bg-white/[0.085]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider text-sky-300">
                  NO. {plans.length - index}
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] text-white/55">
                  잠금
                </span>
              </div>
              <h2 className="mt-5 text-xl font-black text-white group-hover:text-sky-100">
                {plan.title}
              </h2>
              <p className="mt-2 text-sm text-white/55">{plan.destination}</p>
              <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl bg-black/20 p-3">
                  <p className="text-white/35">여행 기간</p>
                  <p className="mt-1 text-white/70">
                    {formatDate(plan.startDate)}
                    <br />
                    {formatDate(plan.endDate)}
                  </p>
                </div>
                <div className="rounded-2xl bg-black/20 p-3">
                  <p className="text-white/35">인원·성향</p>
                  <p className="mt-1 text-white/70">
                    {plan.travelers}명
                    <br />
                    {plan.travelStyle || "자유여행"}
                  </p>
                </div>
              </div>
              <p className="mt-5 text-right text-xs font-semibold text-sky-300">
                비밀번호로 열기 →
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
