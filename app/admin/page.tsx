"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import PlanDetailView from "@/components/PlanDetailView";
import type { TravelPlanFull } from "@/types/plan";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [plans, setPlans] = useState<TravelPlanFull[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadPlans = useCallback(async () => {
    const response = await fetch("/api/admin/plans", { cache: "no-store" });
    const data = (await response.json()) as {
      plans?: TravelPlanFull[];
      error?: string;
    };

    if (response.status === 401) {
      setAuthenticated(false);
      setPlans([]);
      return;
    }
    if (!response.ok) {
      throw new Error(data.error ?? "관리자 자료를 불러오지 못했습니다.");
    }

    setAuthenticated(true);
    setPlans(data.plans ?? []);
  }, []);

  useEffect(() => {
    void loadPlans().catch((caught) => {
      setAuthenticated(false);
      setError(
        caught instanceof Error
          ? caught.message
          : "관리자 자료를 불러오지 못했습니다.",
      );
    });
  }, [loadPlans]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      setBusy(true);
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "관리자 로그인에 실패했습니다.");
      }

      setPassword("");
      await loadPlans();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "관리자 로그인에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
    setPlans([]);
    setExpandedId(null);
  }

  async function removePlan(id: string, title: string) {
    if (!window.confirm(`"${title}" 일정을 삭제할까요? 삭제 후 복구할 수 없습니다.`)) {
      return;
    }

    try {
      setBusy(true);
      const response = await fetch(
        `/api/admin/plans/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "삭제하지 못했습니다.");

      setPlans((current) => current.filter((plan) => plan.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "삭제하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#030914] text-white">
      <AppHeader />
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
        <p className="text-xs font-bold tracking-[0.25em] text-amber-300">
          ADMIN CONTROL
        </p>
        <h1 className="mt-2 text-3xl font-black md:text-5xl">
          관리자 페이지
        </h1>
        <p className="mt-3 text-white/50">
          관리자는 모든 여행계획을 열람하고 삭제할 수 있습니다.
        </p>

        {authenticated === null && (
          <p className="mt-10 text-sm text-white/45">
            관리자 세션을 확인하는 중입니다.
          </p>
        )}

        {authenticated === false && (
          <form
            onSubmit={login}
            className="mt-10 max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-6"
          >
            <h2 className="text-xl font-bold">관리자 로그인</h2>
            <p className="mt-2 text-sm leading-6 text-white/45">
              Vercel 환경변수의 ADMIN_PASSWORD와 일치하는 비밀번호를
              입력하세요.
            </p>
            <input
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-5 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-300/50"
              placeholder="관리자 비밀번호"
              autoComplete="current-password"
            />
            {error && (
              <p role="alert" className="mt-3 text-sm text-red-200">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="mt-5 w-full rounded-2xl bg-amber-400 px-4 py-3 font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-60"
            >
              {busy ? "확인 중..." : "로그인"}
            </button>
          </form>
        )}

        {authenticated && (
          <>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.05] p-5">
              <div>
                <p className="text-sm text-white/45">저장된 전체 일정</p>
                <p className="mt-1 text-3xl font-black">{plans.length}건</p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/65 hover:bg-white/10"
              >
                관리자 로그아웃
              </button>
            </div>

            {error && (
              <div className="mt-5 rounded-2xl border border-red-300/20 bg-red-500/10 p-4 text-sm text-red-100">
                {error}
              </div>
            )}

            <div className="mt-6 space-y-4">
              {plans.map((plan) => (
                <section
                  key={plan.id}
                  className="rounded-3xl border border-white/10 bg-white/[0.05] p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-sky-300">{plan.destination}</p>
                      <h2 className="mt-1 text-xl font-black">{plan.title}</h2>
                      <p className="mt-1 text-xs text-white/40">
                        {plan.startDate} ~ {plan.endDate} · {plan.travelers}명
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId((current) =>
                            current === plan.id ? null : plan.id,
                          )
                        }
                        className="rounded-full border border-sky-300/25 bg-sky-400/10 px-4 py-2 text-sm text-sky-100"
                      >
                        {expandedId === plan.id ? "접기" : "전체 열람"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => removePlan(plan.id, plan.title)}
                        className="rounded-full border border-red-300/20 bg-red-400/10 px-4 py-2 text-sm text-red-100"
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  {expandedId === plan.id && (
                    <div className="mt-6 border-t border-white/10 pt-6">
                      <PlanDetailView plan={plan} compact />
                    </div>
                  )}
                </section>
              ))}

              {plans.length === 0 && (
                <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-white/45">
                  저장된 여행계획이 없습니다.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
