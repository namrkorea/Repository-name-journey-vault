import { createTravelPlan, listPublicPlans } from "@/lib/server/planStore";
import { hashPlanPassword } from "@/lib/server/password";
import type { TravelPlanCreateInput } from "@/types/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function validateInput(value: unknown): TravelPlanCreateInput {
  if (!value || typeof value !== "object") {
    throw new Error("여행계획 입력값이 올바르지 않습니다.");
  }

  const body = value as Record<string, unknown>;
  const title = cleanText(body.title, 100);
  const destination = cleanText(body.destination, 120);
  const startDate = cleanText(body.startDate, 10);
  const endDate = cleanText(body.endDate, 10);
  const travelStyle = cleanText(body.travelStyle, 60);
  const summary = cleanText(body.summary, 2000);
  const password = cleanText(body.password, 64);
  const travelers = Number(body.travelers);
  const budget =
    body.budget === null || body.budget === ""
      ? null
      : Number(body.budget);
  const days = Array.isArray(body.days) ? body.days.slice(0, 31) : [];

  if (!title || !destination || !startDate || !endDate) {
    throw new Error("제목, 여행지, 출발일과 도착일을 모두 입력해 주세요.");
  }
  if (endDate < startDate) {
    throw new Error("도착일은 출발일보다 빠를 수 없습니다.");
  }
  if (!Number.isInteger(travelers) || travelers < 1 || travelers > 100) {
    throw new Error("여행 인원은 1명 이상 100명 이하로 입력해 주세요.");
  }
  if (budget !== null && (!Number.isFinite(budget) || budget < 0)) {
    throw new Error("예산을 올바른 숫자로 입력해 주세요.");
  }
  if (password.length < 4) {
    throw new Error("열람 비밀번호는 4자 이상 입력해 주세요.");
  }

  const normalizedDays = days.map((day, dayIndex) => {
    const rawDay =
      day && typeof day === "object"
        ? (day as Record<string, unknown>)
        : {};
    const items = Array.isArray(rawDay.items)
      ? rawDay.items.slice(0, 30)
      : [];

    return {
      id: cleanText(rawDay.id, 80) || `day-${dayIndex + 1}`,
      date: cleanText(rawDay.date, 10),
      title: cleanText(rawDay.title, 100),
      items: items.map((item, itemIndex) => {
        const rawItem =
          item && typeof item === "object"
            ? (item as Record<string, unknown>)
            : {};
        const allowedCategories = [
          "이동",
          "관광",
          "식사",
          "숙소",
          "쇼핑",
          "휴식",
          "기타",
        ];
        const category = cleanText(rawItem.category, 10);

        return {
          id:
            cleanText(rawItem.id, 80) ||
            `item-${dayIndex + 1}-${itemIndex + 1}`,
          time: cleanText(rawItem.time, 10),
          category: allowedCategories.includes(category)
            ? (category as "이동" | "관광" | "식사" | "숙소" | "쇼핑" | "휴식" | "기타")
            : "기타",
          place: cleanText(rawItem.place, 160),
          notes: cleanText(rawItem.notes, 500),
        };
      }),
    };
  });

  return {
    title,
    destination,
    startDate,
    endDate,
    travelers,
    budget,
    travelStyle,
    summary,
    days: normalizedDays,
    password,
  };
}

export async function GET() {
  try {
    const plans = await listPublicPlans();
    return Response.json(
      { plans },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "저장된 여행계획을 불러오지 못했습니다.",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const input = validateInput(await request.json());
    const passwordHash = await hashPlanPassword(input.password);
    const { password: _password, ...planInput } = input;
    const plan = await createTravelPlan(planInput, passwordHash);

    return Response.json({ plan }, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "여행계획을 저장하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
