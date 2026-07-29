"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, RefreshCw, Sparkles, WandSparkles } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import type {
  ItineraryCategory,
  ItineraryDay,
  ItineraryItem,
} from "@/types/plan";

const categories: ItineraryCategory[] = [
  "이동",
  "관광",
  "식사",
  "숙소",
  "쇼핑",
  "휴식",
  "기타",
];

type AiMode = "generate" | "revise";

type AiPlan = {
  title: string;
  summary: string;
  days: ItineraryDay[];
};

function newItem(): ItineraryItem {
  return {
    id: crypto.randomUUID(),
    time: "",
    category: "관광",
    place: "",
    notes: "",
  };
}

function dateRange(startDate: string, endDate: string): ItineraryDay[] {
  if (!startDate || !endDate || endDate < startDate) return [];

  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const difference = Math.floor(
    (end.getTime() - start.getTime()) / 86_400_000,
  );
  if (difference > 30) return [];

  return Array.from({ length: difference + 1 }, (_, index) => {
    const date = new Date(start.getTime() + index * 86_400_000)
      .toISOString()
      .slice(0, 10);
    return {
      id: crypto.randomUUID(),
      date,
      title: `${index + 1}일차`,
      items: [newItem()],
    };
  });
}

export default function PlannerPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    destination: "",
    startDate: "",
    endDate: "",
    travelers: "2",
    budget: "",
    travelStyle: "여유로운 자유여행",
    summary: "",
    password: "",
    passwordConfirm: "",
  });
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [aiRequirements, setAiRequirements] = useState("");
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiLoading, setAiLoading] = useState<AiMode | null>(null);
  const [aiError, setAiError] = useState("");
  const [aiNotice, setAiNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const inputClass =
    "w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-sky-300/60 focus:ring-2 focus:ring-sky-400/15";

  function generateDays() {
    setError("");
    const nextDays = dateRange(form.startDate, form.endDate);
    if (nextDays.length === 0) {
      setError(
        "출발일과 도착일을 확인해 주세요. 일정은 최대 31일까지 만들 수 있습니다.",
      );
      return;
    }
    if (
      days.length > 0 &&
      !window.confirm("현재 작성된 일정을 새 날짜 기준으로 다시 만들까요?")
    ) {
      return;
    }
    setDays(nextDays);
  }

  function updateDay(
    dayId: string,
    field: "date" | "title",
    value: string,
  ) {
    setDays((current) =>
      current.map((day) =>
        day.id === dayId ? { ...day, [field]: value } : day,
      ),
    );
  }

  function addItem(dayId: string) {
    setDays((current) =>
      current.map((day) =>
        day.id === dayId
          ? { ...day, items: [...day.items, newItem()] }
          : day,
      ),
    );
  }

  function updateItem(
    dayId: string,
    itemId: string,
    field: keyof Omit<ItineraryItem, "id">,
    value: string,
  ) {
    setDays((current) =>
      current.map((day) =>
        day.id === dayId
          ? {
              ...day,
              items: day.items.map((item) =>
                item.id === itemId ? { ...item, [field]: value } : item,
              ),
            }
          : day,
      ),
    );
  }

  function removeItem(dayId: string, itemId: string) {
    setDays((current) =>
      current.map((day) =>
        day.id === dayId
          ? {
              ...day,
              items: day.items.filter((item) => item.id !== itemId),
            }
          : day,
      ),
    );
  }

  async function runAi(mode: AiMode) {
    setAiError("");
    setAiNotice("");

    if (!form.destination || !form.startDate || !form.endDate) {
      setAiError("여행지, 출발일, 도착일을 먼저 입력해 주세요.");
      return;
    }

    if (mode === "revise" && days.length === 0) {
      setAiError("수정할 일정이 없습니다. 먼저 AI 초안을 만들어 주세요.");
      return;
    }

    if (mode === "revise" && !aiInstruction.trim()) {
      setAiError("AI에게 요청할 수정 내용을 입력해 주세요.");
      return;
    }

    if (
      mode === "generate" &&
      days.length > 0 &&
      !window.confirm("현재 작성한 일정을 AI가 만든 새 일정으로 교체할까요?")
    ) {
      return;
    }

    try {
      setAiLoading(mode);

      const response = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          destination: form.destination,
          startDate: form.startDate,
          endDate: form.endDate,
          travelers: Number(form.travelers),
          budget: form.budget ? Number(form.budget) : null,
          travelStyle: form.travelStyle,
          requirements: aiRequirements,
          existingNotes: form.summary,
          instruction: mode === "revise" ? aiInstruction : "",
          currentPlan:
            mode === "revise"
              ? {
                  title: form.title,
                  summary: form.summary,
                  days,
                }
              : null,
        }),
      });

      const data = (await response.json()) as {
        plan?: AiPlan;
        error?: string;
      };

      if (!response.ok || !data.plan) {
        throw new Error(data.error ?? "AI 여행계획을 만들지 못했습니다.");
      }

      const generatedPlan = data.plan;
      setForm((current) => ({
        ...current,
        title: generatedPlan.title || current.title,
        summary: generatedPlan.summary || current.summary,
      }));
      setDays(generatedPlan.days);
      setAiInstruction("");
      setAiNotice(
        mode === "generate"
          ? "AI 여행 초안이 만들어졌습니다. 아래에서 직접 수정한 뒤 저장하세요."
          : "요청한 내용으로 일정이 수정되었습니다. 변경 내용을 확인하세요.",
      );
    } catch (caught) {
      setAiError(
        caught instanceof Error
          ? caught.message
          : "AI 여행계획을 만들지 못했습니다.",
      );
    } finally {
      setAiLoading(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (form.password !== form.passwordConfirm) {
      setError("비밀번호 확인 값이 일치하지 않습니다.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          destination: form.destination,
          startDate: form.startDate,
          endDate: form.endDate,
          travelers: Number(form.travelers),
          budget: form.budget ? Number(form.budget) : null,
          travelStyle: form.travelStyle,
          summary: form.summary,
          days,
          password: form.password,
        }),
      });
      const data = (await response.json()) as {
        plan?: { id: string };
        error?: string;
      };

      if (!response.ok || !data.plan) {
        throw new Error(data.error ?? "여행계획을 저장하지 못했습니다.");
      }

      router.push(`/plans/${data.plan.id}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "여행계획을 저장하지 못했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#030914] text-white">
      <AppHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-bold tracking-[0.25em] text-sky-300">
            AI PRIVATE JOURNEY DESIGNER
          </p>
          <h1 className="mt-2 text-3xl font-black md:text-5xl">
            AI 여행계획 만들기
          </h1>
          <p className="mt-4 leading-7 text-white/55">
            기본정보와 원하는 조건을 입력하면 AI가 일자별 여행 초안을 만들고,
            추가 요청에 따라 다시 수정합니다.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-7">
          <section className="rounded-3xl border border-white/10 bg-white/[0.055] p-5 md:p-7">
            <div className="mb-6 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-sky-400/20 text-sm font-black text-sky-200">
                1
              </span>
              <div>
                <h2 className="text-xl font-bold">여행 기본정보</h2>
                <p className="text-xs text-white/45">여행지, 기간, 인원과 예산</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-white/70">여행 제목</span>
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                  className={inputClass}
                  placeholder="비워두면 AI가 제목을 제안합니다."
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-white/70">국가·도시 *</span>
                <input
                  required
                  value={form.destination}
                  onChange={(event) =>
                    setForm({ ...form, destination: event.target.value })
                  }
                  className={inputClass}
                  placeholder="예: 파리, 인터라켄, 루체른, 취리히"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-white/70">출발일 *</span>
                <input
                  required
                  type="date"
                  value={form.startDate}
                  onChange={(event) =>
                    setForm({ ...form, startDate: event.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-white/70">도착일 *</span>
                <input
                  required
                  type="date"
                  value={form.endDate}
                  onChange={(event) =>
                    setForm({ ...form, endDate: event.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-white/70">여행 인원 *</span>
                <input
                  required
                  type="number"
                  min="1"
                  max="100"
                  value={form.travelers}
                  onChange={(event) =>
                    setForm({ ...form, travelers: event.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-white/70">총예산(원)</span>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={form.budget}
                  onChange={(event) =>
                    setForm({ ...form, budget: event.target.value })
                  }
                  className={inputClass}
                  placeholder="예: 8000000"
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-white/70">여행 성향</span>
                <input
                  value={form.travelStyle}
                  onChange={(event) =>
                    setForm({ ...form, travelStyle: event.target.value })
                  }
                  className={inputClass}
                  placeholder="예: 검소하고 조용한 자유여행"
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-white/70">전체 메모</span>
                <textarea
                  rows={4}
                  value={form.summary}
                  onChange={(event) =>
                    setForm({ ...form, summary: event.target.value })
                  }
                  className={inputClass}
                  placeholder="이미 예약한 항공편, 숙소, 이동 원칙 등을 기록하세요."
                />
              </label>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-sky-300/20 bg-gradient-to-br from-sky-400/[0.1] via-blue-500/[0.055] to-violet-500/[0.08] p-5 md:p-7">
            <div className="mb-6 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-300 text-slate-950 shadow-lg shadow-sky-950/40">
                <Sparkles size={20} />
              </span>
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] text-sky-300">
                  AI TRAVEL DESIGNER
                </p>
                <h2 className="text-xl font-bold">AI 여행 설계</h2>
              </div>
            </div>

            <label className="block space-y-2">
              <span className="text-sm text-white/75">원하는 여행 조건</span>
              <textarea
                rows={6}
                value={aiRequirements}
                onChange={(event) => setAiRequirements(event.target.value)}
                className={inputClass}
                placeholder={`예:\n50대 부부 여행\n하루 도보 이동은 무리하지 않게\n오전 9시 이후 일정 시작\n현지 맛집과 조용한 카페 포함\n대중교통 중심, 숙소 이동 최소화\n쇼핑은 마지막 날 배치`}
              />
            </label>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={aiLoading !== null}
                onClick={() => runAi("generate")}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-500 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-sky-950/30 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-55"
              >
                {aiLoading === "generate" ? (
                  <LoaderCircle size={18} className="animate-spin" />
                ) : (
                  <WandSparkles size={18} />
                )}
                {aiLoading === "generate"
                  ? "AI가 여행 초안을 만드는 중..."
                  : "AI로 여행 초안 만들기"}
              </button>
              <p className="text-xs leading-5 text-white/45">
                생성된 일정은 아래에서 시간·장소·메모를 직접 고칠 수 있습니다.
              </p>
            </div>

            {days.length > 0 && (
              <div className="mt-7 border-t border-white/10 pt-6">
                <label className="block space-y-2">
                  <span className="text-sm text-white/75">
                    AI에게 일정 수정 요청
                  </span>
                  <textarea
                    rows={3}
                    value={aiInstruction}
                    onChange={(event) => setAiInstruction(event.target.value)}
                    className={inputClass}
                    placeholder="예: 2일차 오전을 여유롭게 바꾸고 미술관을 추가해 주세요."
                  />
                </label>
                <button
                  type="button"
                  disabled={aiLoading !== null}
                  onClick={() => runAi("revise")}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-sky-300/35 bg-sky-400/10 px-5 py-3 text-sm font-bold text-sky-100 transition hover:bg-sky-400/20 disabled:cursor-wait disabled:opacity-55"
                >
                  {aiLoading === "revise" ? (
                    <LoaderCircle size={18} className="animate-spin" />
                  ) : (
                    <RefreshCw size={17} />
                  )}
                  {aiLoading === "revise"
                    ? "AI가 일정을 수정하는 중..."
                    : "AI로 일정 수정하기"}
                </button>
              </div>
            )}

            {aiError && (
              <div
                role="alert"
                className="mt-5 rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm text-red-100"
              >
                {aiError}
              </div>
            )}
            {aiNotice && (
              <div
                aria-live="polite"
                className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
              >
                {aiNotice}
              </div>
            )}

            <p className="mt-5 text-xs leading-6 text-amber-100/55">
              AI가 제안한 영업시간·교통·요금은 변경될 수 있으므로 예약 전에
              공식 정보를 다시 확인하세요.
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.055] p-5 md:p-7">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-sky-400/20 text-sm font-black text-sky-200">
                  3
                </span>
                <div>
                  <h2 className="text-xl font-bold">일자별 일정 확인·편집</h2>
                  <p className="text-xs text-white/45">
                    AI 일정 또는 직접 만든 일정을 자유롭게 수정
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={generateDays}
                className="rounded-full border border-sky-300/30 bg-sky-400/15 px-4 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-400/25"
              >
                빈 일정 직접 만들기
              </button>
            </div>

            {days.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/45">
                위에서 AI 초안을 만들거나, 출발일과 도착일을 입력한 뒤 빈 일정
                직접 만들기를 누르세요.
              </div>
            ) : (
              <div className="space-y-5">
                {days.map((day, dayIndex) => (
                  <div
                    key={day.id}
                    className="rounded-3xl border border-white/10 bg-black/20 p-4 md:p-5"
                  >
                    <div className="grid gap-3 md:grid-cols-[90px_160px_1fr] md:items-center">
                      <p className="text-sm font-black text-sky-300">
                        DAY {dayIndex + 1}
                      </p>
                      <input
                        type="date"
                        value={day.date}
                        onChange={(event) =>
                          updateDay(day.id, "date", event.target.value)
                        }
                        className={inputClass}
                      />
                      <input
                        value={day.title}
                        onChange={(event) =>
                          updateDay(day.id, "title", event.target.value)
                        }
                        className={inputClass}
                        placeholder="예: 파리 핵심 관광"
                      />
                    </div>

                    <div className="mt-4 space-y-3">
                      {day.items.map((item) => (
                        <div
                          key={item.id}
                          className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 md:grid-cols-[110px_110px_1fr_1.4fr_auto]"
                        >
                          <input
                            type="time"
                            value={item.time}
                            onChange={(event) =>
                              updateItem(
                                day.id,
                                item.id,
                                "time",
                                event.target.value,
                              )
                            }
                            className={inputClass}
                          />
                          <select
                            value={item.category}
                            onChange={(event) =>
                              updateItem(
                                day.id,
                                item.id,
                                "category",
                                event.target.value,
                              )
                            }
                            className={inputClass}
                          >
                            {categories.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                          <input
                            value={item.place}
                            onChange={(event) =>
                              updateItem(
                                day.id,
                                item.id,
                                "place",
                                event.target.value,
                              )
                            }
                            className={inputClass}
                            placeholder="장소·식당·숙소"
                          />
                          <input
                            value={item.notes}
                            onChange={(event) =>
                              updateItem(
                                day.id,
                                item.id,
                                "notes",
                                event.target.value,
                              )
                            }
                            className={inputClass}
                            placeholder="이동방법, 소요시간, 예약 메모"
                          />
                          <button
                            type="button"
                            onClick={() => removeItem(day.id, item.id)}
                            aria-label="일정 항목 삭제"
                            className="rounded-xl border border-red-300/15 px-3 text-sm text-red-200/70 hover:bg-red-400/10"
                          >
                            삭제
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => addItem(day.id)}
                      className="mt-4 rounded-full border border-white/15 px-4 py-2 text-xs text-white/65 hover:bg-white/10"
                    >
                      + 일정 항목 추가
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.055] p-5 md:p-7">
            <div className="mb-6 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-sky-400/20 text-sm font-black text-sky-200">
                4
              </span>
              <div>
                <h2 className="text-xl font-bold">비밀번호 보호 및 저장</h2>
                <p className="text-xs text-white/45">
                  비밀번호를 아는 사람만 일정을 열람합니다.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-white/70">열람 비밀번호 *</span>
                <input
                  required
                  type="password"
                  minLength={4}
                  maxLength={64}
                  value={form.password}
                  onChange={(event) =>
                    setForm({ ...form, password: event.target.value })
                  }
                  className={inputClass}
                  autoComplete="new-password"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-white/70">비밀번호 확인 *</span>
                <input
                  required
                  type="password"
                  minLength={4}
                  maxLength={64}
                  value={form.passwordConfirm}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      passwordConfirm: event.target.value,
                    })
                  }
                  className={inputClass}
                  autoComplete="new-password"
                />
              </label>
            </div>

            <p className="mt-4 text-xs leading-6 text-amber-100/60">
              비밀번호는 복구할 수 없습니다. 작성자와 열람자가 반드시 별도로
              보관하세요.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-5 rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm text-red-100"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || days.length === 0}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-4 font-bold text-white shadow-lg shadow-sky-950/40 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? "안전하게 저장하는 중..." : "여행계획 저장"}
            </button>
          </section>
        </form>
      </div>
    </main>
  );
}
