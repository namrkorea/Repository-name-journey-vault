"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Save,
  Sparkles,
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import type {
  ItineraryCategory,
  ItineraryDay,
  ItineraryItem,
  TravelPlanFull,
} from "@/types/plan";

const EDIT_STORAGE_KEY = "journey-vault-edit-plan";

const categories: ItineraryCategory[] = [
  "이동",
  "관광",
  "식사",
  "숙소",
  "쇼핑",
  "휴식",
  "기타",
];

type AiPlan = {
  title: string;
  summary: string;
  days: ItineraryDay[];
};

type EditPayload = {
  plan: TravelPlanFull;
  savedAt: number;
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

function googleMapsSearchUrl(place: string, destination: string) {
  const query = [place, destination].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export default function SavedPlanEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id ?? "");
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({
    title: "",
    destination: "",
    startDate: "",
    endDate: "",
    travelers: "2",
    budget: "",
    travelStyle: "",
    summary: "",
    password: "",
  });
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNotice, setAiNotice] = useState("");
  const [aiError, setAiError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const inputClass =
    "w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-sky-300/60 focus:ring-2 focus:ring-sky-400/15";

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(EDIT_STORAGE_KEY);
      if (!raw) {
        throw new Error(
          "수정할 일정 정보가 없습니다. 저장된 일정을 비밀번호로 연 뒤 다시 시작해 주세요.",
        );
      }

      const payload = JSON.parse(raw) as EditPayload;
      if (!payload.plan || payload.plan.id !== id) {
        throw new Error("수정할 일정 정보가 현재 주소와 일치하지 않습니다.");
      }

      const plan = payload.plan;
      setForm({
        title: plan.title,
        destination: plan.destination,
        startDate: plan.startDate,
        endDate: plan.endDate,
        travelers: String(plan.travelers),
        budget: plan.budget === null ? "" : String(plan.budget),
        travelStyle: plan.travelStyle,
        summary: plan.summary,
        password: "",
      });
      setDays(plan.days);
      setAiNotice(
        "저장된 일정을 불러왔습니다. AI 또는 직접 편집한 뒤 기존 비밀번호로 저장하세요.",
      );
      setLoaded(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "저장된 일정을 불러오지 못했습니다.",
      );
    }
  }, [id]);

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

  async function reviseWithAi() {
    setAiError("");
    setAiNotice("");

    if (!aiInstruction.trim()) {
      setAiError("AI에게 요청할 수정 내용을 입력해 주세요.");
      return;
    }
    if (days.length === 0) {
      setAiError("수정할 일정이 없습니다.");
      return;
    }

    try {
      setAiLoading(true);
      const response = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "revise",
          destination: form.destination,
          startDate: form.startDate,
          endDate: form.endDate,
          travelers: Number(form.travelers),
          budget: form.budget ? Number(form.budget) : null,
          travelStyle: form.travelStyle,
          requirements: "저장된 여행계획을 기존 구조를 유지하며 수정",
          existingNotes: form.summary,
          instruction: aiInstruction,
          currentPlan: {
            title: form.title,
            summary: form.summary,
            days,
          },
        }),
      });

      const data = (await response.json()) as {
        plan?: AiPlan;
        error?: string;
      };

      if (!response.ok || !data.plan) {
        throw new Error(data.error ?? "AI가 일정을 수정하지 못했습니다.");
      }

      setForm((current) => ({
        ...current,
        title: data.plan?.title || current.title,
        summary: data.plan?.summary || current.summary,
      }));
      setDays(data.plan.days);
      setAiInstruction("");
      setAiNotice(
        "요청한 내용으로 일정이 수정되었습니다. 아래 변경 내용을 확인한 뒤 저장하세요.",
      );
    } catch (caught) {
      setAiError(
        caught instanceof Error
          ? caught.message
          : "AI가 일정을 수정하지 못했습니다.",
      );
    } finally {
      setAiLoading(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (form.password.length < 4) {
      setError("현재 열람 비밀번호를 4자 이상 입력해 주세요.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/plans/${encodeURIComponent(id)}`, {
        method: "PUT",
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
        throw new Error(data.error ?? "수정된 여행계획을 저장하지 못했습니다.");
      }

      sessionStorage.removeItem(EDIT_STORAGE_KEY);
      router.push(`/plans/${data.plan.id}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "수정된 여행계획을 저장하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <main className="min-h-screen bg-[#030914] text-white">
        <AppHeader />
        <div className="mx-auto max-w-3xl px-4 py-12 md:px-8">
          <Link
            href={`/plans/${encodeURIComponent(id)}`}
            className="inline-flex items-center gap-2 text-sm text-sky-300"
          >
            <ArrowLeft size={16} /> 저장된 일정으로 돌아가기
          </Link>
          <div className="mt-8 rounded-3xl border border-red-300/20 bg-red-500/10 p-6 text-sm leading-7 text-red-100">
            {error || "저장된 일정을 불러오는 중입니다."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#030914] text-white">
      <AppHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <Link
          href={`/plans/${encodeURIComponent(id)}`}
          className="inline-flex items-center gap-2 text-sm text-sky-300 hover:text-sky-200"
        >
          <ArrowLeft size={16} /> 원래 일정으로 돌아가기
        </Link>

        <div className="mt-6 max-w-4xl">
          <p className="text-xs font-bold tracking-[0.24em] text-violet-300">
            SAVED JOURNEY AI EDITOR
          </p>
          <h1 className="mt-2 text-3xl font-black md:text-5xl">
            저장된 일정 AI 수정
          </h1>
          <p className="mt-4 leading-7 text-white/55">
            기존 일정을 불러와 AI로 재구성하거나 시간·장소·메모를 직접 수정한
            뒤 같은 일정에 덮어씁니다.
          </p>
        </div>

        <form onSubmit={save} className="mt-8 space-y-7">
          <section className="rounded-3xl border border-violet-300/20 bg-gradient-to-r from-sky-400/10 to-violet-400/10 p-5 md:p-7">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-300 text-slate-950">
                <Sparkles size={20} />
              </span>
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] text-violet-200">
                  AI REVISION
                </p>
                <h2 className="text-xl font-bold">AI에게 수정 요청</h2>
              </div>
            </div>

            <textarea
              rows={5}
              value={aiInstruction}
              onChange={(event) => setAiInstruction(event.target.value)}
              className={`${inputClass} mt-5`}
              placeholder={`예:
2일차 오전 일정을 여유롭게 변경
도보 이동을 줄이고 대중교통 중심으로 수정
현지 맛집과 조용한 카페 추가
기존 예약 숙소와 이동 일정은 유지`}
            />

            <button
              type="button"
              disabled={aiLoading}
              onClick={reviseWithAi}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 to-violet-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-55"
            >
              {aiLoading ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <RefreshCw size={18} />
              )}
              {aiLoading ? "AI가 일정을 수정하는 중..." : "AI로 일정 수정하기"}
            </button>

            {aiError && (
              <div className="mt-5 rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {aiError}
              </div>
            )}
            {aiNotice && (
              <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                {aiNotice}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.055] p-5 md:p-7">
            <h2 className="text-xl font-bold">여행 기본정보</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-white/70">여행 제목 *</span>
                <input
                  required
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                  className={inputClass}
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
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-white/70">전체 메모</span>
                <textarea
                  rows={5}
                  value={form.summary}
                  onChange={(event) =>
                    setForm({ ...form, summary: event.target.value })
                  }
                  className={inputClass}
                />
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.055] p-5 md:p-7">
            <h2 className="text-xl font-bold">일자별 일정 확인·편집</h2>
            <p className="mt-2 text-xs text-white/45">
              AI가 수정한 결과를 시간·분류·장소·메모별로 다시 확인하세요.
            </p>

            <div className="mt-6 space-y-5">
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
                    />
                  </div>

                  <div className="mt-4 space-y-3">
                    {day.items.map((item) => (
                      <div
                        key={item.id}
                        className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 md:grid-cols-[110px_110px_1fr_1.4fr_auto_auto]"
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
                        {item.place ? (
                          <a
                            href={googleMapsSearchUrl(
                              item.place,
                              form.destination,
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${item.place} 지도 보기`}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-sky-300/25 bg-sky-400/10 px-3 text-xs font-bold text-sky-100 transition hover:bg-sky-400/20"
                          >
                            <MapPin size={15} /> 지도
                          </a>
                        ) : (
                          <span className="inline-flex items-center justify-center rounded-xl border border-white/5 px-3 text-xs text-white/20">
                            지도
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeItem(day.id, item.id)}
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
          </section>

          <section className="rounded-3xl border border-emerald-300/20 bg-emerald-400/[0.06] p-5 md:p-7">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-300 text-slate-950">
                <Save size={20} />
              </span>
              <div>
                <h2 className="text-xl font-bold">기존 일정에 덮어쓰기</h2>
                <p className="text-xs text-white/50">
                  처음 일정을 열 때 사용한 현재 비밀번호로 수정 권한을 확인합니다.
                </p>
              </div>
            </div>

            <label className="mt-5 block max-w-md space-y-2">
              <span className="text-sm text-white/70">현재 열람 비밀번호 *</span>
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
                autoComplete="current-password"
              />
            </label>

            {error && (
              <div className="mt-5 rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || days.length === 0}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-sky-500 px-5 py-4 font-black text-slate-950 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-55"
            >
              {saving ? (
                <LoaderCircle size={19} className="animate-spin" />
              ) : (
                <Save size={19} />
              )}
              {saving ? "수정된 일정을 저장하는 중..." : "수정 내용 덮어쓰기"}
            </button>
          </section>
        </form>
      </div>
    </main>
  );
}
