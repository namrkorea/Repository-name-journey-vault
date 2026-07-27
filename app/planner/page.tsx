"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const inputClass =
    "w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-sky-300/60 focus:ring-2 focus:ring-sky-400/15";

  function generateDays() {
    setError("");
    const nextDays = dateRange(form.startDate, form.endDate);
    if (nextDays.length === 0) {
      setError("출발일과 도착일을 확인해 주세요. 일정은 최대 31일까지 만들 수 있습니다.");
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
            CREATE A PRIVATE JOURNEY
          </p>
          <h1 className="mt-2 text-3xl font-black md:text-5xl">
            새로운 여행계획 만들기
          </h1>
          <p className="mt-4 leading-7 text-white/55">
            기본정보를 입력하고 일자별 일정을 만든 뒤, 열람 비밀번호로
            보호하여 저장합니다.
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
                <p className="text-xs text-white/45">제목, 여행지, 기간과 예산</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-white/70">여행 제목 *</span>
                <input
                  required
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                  className={inputClass}
                  placeholder="예: 프랑스·스위스 10일 부부 여행"
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
                  placeholder="항공편, 숙소, 이동 원칙, 꼭 지킬 조건 등을 기록하세요."
                />
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.055] p-5 md:p-7">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-sky-400/20 text-sm font-black text-sky-200">
                  2
                </span>
                <div>
                  <h2 className="text-xl font-bold">일자별 일정</h2>
                  <p className="text-xs text-white/45">
                    날짜별 관광·식사·이동·숙소 기록
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={generateDays}
                className="rounded-full border border-sky-300/30 bg-sky-400/15 px-4 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-400/25"
              >
                여행 날짜로 일정 생성
              </button>
            </div>

            {days.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/45">
                출발일과 도착일을 입력한 뒤 일정 생성 버튼을 누르세요.
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
                            placeholder="예약번호, 이동방법, 메모"
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
                3
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
                <span className="text-sm text-white/70">
                  열람 비밀번호 *
                </span>
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
                <span className="text-sm text-white/70">
                  비밀번호 확인 *
                </span>
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
              disabled={submitting}
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
