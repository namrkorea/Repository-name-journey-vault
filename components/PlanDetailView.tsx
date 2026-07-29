import { MapPin } from "lucide-react";
import type { TravelPlanFull } from "@/types/plan";

function formatDate(value: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatBudget(value: number | null) {
  if (value === null) return "미입력";
  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

function googleMapsSearchUrl(place: string, destination: string) {
  const query = [place, destination].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export default function PlanDetailView({
  plan,
  compact = false,
}: {
  plan: TravelPlanFull;
  compact?: boolean;
}) {
  return (
    <article className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/[0.055] p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.24em] text-sky-300">
              PRIVATE JOURNEY
            </p>
            <h1
              className={`${compact ? "text-2xl" : "text-3xl md:text-4xl"} mt-2 font-black text-white`}
            >
              {plan.title}
            </h1>
            <p className="mt-2 text-sm text-white/60">{plan.destination}</p>
          </div>
          <span className="rounded-full border border-sky-300/25 bg-sky-400/10 px-3 py-2 text-xs text-sky-100">
            {plan.travelStyle || "자유여행"}
          </span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["여행 기간", `${formatDate(plan.startDate)} ~ ${formatDate(plan.endDate)}`],
            ["여행 인원", `${plan.travelers}명`],
            ["예산", formatBudget(plan.budget)],
            ["작성일", formatDate(plan.createdAt.slice(0, 10))],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <p className="text-[11px] text-white/45">{label}</p>
              <p className="mt-1 text-sm font-semibold text-white/90">{value}</p>
            </div>
          ))}
        </div>

        {plan.summary && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-4">
            <p className="text-[11px] font-bold tracking-wider text-sky-300">
              여행 메모
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-white/75">
              {plan.summary}
            </p>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-bold tracking-[0.24em] text-sky-300">
            ITINERARY
          </p>
          <h2 className="mt-1 text-2xl font-black text-white">일자별 일정</h2>
        </div>

        {plan.days.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/15 p-8 text-center text-sm text-white/50">
            작성된 세부 일정이 없습니다.
          </div>
        ) : (
          plan.days.map((day, dayIndex) => (
            <div
              key={day.id}
              className="rounded-3xl border border-white/10 bg-white/[0.045] p-5"
            >
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-sky-300">
                    DAY {dayIndex + 1}
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-white">
                    {day.title || `${dayIndex + 1}일차`}
                  </h3>
                </div>
                <p className="text-sm text-white/50">
                  {day.date ? formatDate(day.date) : ""}
                </p>
              </div>

              <div className="mt-4 space-y-3">
                {day.items.length === 0 ? (
                  <p className="text-sm text-white/40">등록된 일정이 없습니다.</p>
                ) : (
                  day.items.map((item) => (
                    <div
                      key={item.id}
                      className="grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-[70px_70px_1fr_auto] md:items-center"
                    >
                      <p className="font-mono text-sm text-sky-200">
                        {item.time || "--:--"}
                      </p>
                      <p className="text-xs font-semibold text-white/55">
                        {item.category}
                      </p>
                      <div>
                        <p className="font-semibold text-white">
                          {item.place || "장소 미정"}
                        </p>
                        {item.notes && (
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white/55">
                            {item.notes}
                          </p>
                        )}
                      </div>
                      {item.place ? (
                        <a
                          href={googleMapsSearchUrl(item.place, plan.destination)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${item.place} 지도 보기`}
                          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-sky-300/25 bg-sky-400/10 px-3 text-xs font-bold text-sky-100 transition hover:border-sky-300/50 hover:bg-sky-400/20"
                        >
                          <MapPin size={15} />
                          지도
                        </a>
                      ) : (
                        <span className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/5 px-3 text-xs text-white/20">
                          지도
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </section>
    </article>
  );
}
