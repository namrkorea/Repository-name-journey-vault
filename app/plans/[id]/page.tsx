"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import PlanDetailView from "@/components/PlanDetailView";
import type { TravelPlanFull } from "@/types/plan";

const EDIT_STORAGE_KEY = "journey-vault-edit-plan";

export default function PlanViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id ?? "");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState<TravelPlanFull | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      setLoading(true);
      const response = await fetch(`/api/plans/${encodeURIComponent(id)}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as {
        plan?: TravelPlanFull;
        error?: string;
      };

      if (!response.ok || !data.plan) {
        throw new Error(data.error ?? "여행계획을 열지 못했습니다.");
      }
      setPlan(data.plan);
      setPassword("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "여행계획을 열지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  function openAiEditor() {
    if (!plan) return;

    sessionStorage.setItem(
      EDIT_STORAGE_KEY,
      JSON.stringify({ plan, savedAt: Date.now() }),
    );
    router.push(`/plans/${encodeURIComponent(plan.id)}/edit`);
  }

  return (
    <main className="min-h-screen bg-[#030914] text-white">
      <AppHeader />
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
        <Link href="/plans" className="text-sm text-sky-300 hover:text-sky-200">
          ← 저장된 일정으로 돌아가기
        </Link>

        {!plan ? (
          <div className="mx-auto mt-10 max-w-lg rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-center shadow-2xl md:p-8">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-sky-300/25 bg-sky-400/10 text-2xl">
              🔒
            </div>
            <p className="mt-6 text-xs font-bold tracking-[0.25em] text-sky-300">
              PROTECTED JOURNEY
            </p>
            <h1 className="mt-2 text-2xl font-black">열람 비밀번호 입력</h1>
            <p className="mt-3 text-sm leading-6 text-white/50">
              이 여행계획은 작성자가 설정한 비밀번호로 보호됩니다.
            </p>

            <form onSubmit={unlock} className="mt-7 space-y-4">
              <input
                required
                type="password"
                minLength={4}
                maxLength={64}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="비밀번호"
                autoComplete="current-password"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-center text-lg tracking-widest text-white outline-none placeholder:text-sm placeholder:tracking-normal placeholder:text-white/30 focus:border-sky-300/55"
              />
              {error && (
                <p role="alert" className="text-sm text-red-200">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-sky-500 px-5 py-4 font-bold text-white hover:bg-sky-400 disabled:opacity-60"
              >
                {loading ? "확인 중..." : "여행계획 열기"}
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-violet-300/20 bg-gradient-to-r from-sky-400/10 to-violet-400/10 p-5">
              <div>
                <p className="text-xs font-bold tracking-[0.18em] text-sky-300">
                  AI EDIT MODE
                </p>
                <h2 className="mt-1 text-xl font-black">
                  저장된 일정을 AI로 다시 수정
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  현재 일정 전체를 AI 편집 화면으로 불러와 수정한 뒤 같은 일정에
                  덮어쓸 수 있습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={openAiEditor}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 to-violet-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-black/20 transition hover:brightness-110"
              >
                <Sparkles size={18} />
                AI로 일정 수정하기
              </button>
            </section>

            <PlanDetailView plan={plan} />
          </div>
        )}
      </div>
    </main>
  );
}
