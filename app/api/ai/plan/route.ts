import { randomUUID } from "node:crypto";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedCategories = [
  "이동",
  "관광",
  "식사",
  "숙소",
  "쇼핑",
  "휴식",
  "기타",
] as const;

type AllowedCategory = (typeof allowedCategories)[number];

type GeneratedPlan = {
  title: string;
  summary: string;
  days: Array<{
    date: string;
    title: string;
    items: Array<{
      time: string;
      category: AllowedCategory;
      place: string;
      notes: string;
    }>;
  }>;
};

const travelPlanSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    days: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          date: { type: "string" },
          title: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                time: { type: "string" },
                category: {
                  type: "string",
                  enum: allowedCategories,
                },
                place: { type: "string" },
                notes: { type: "string" },
              },
              required: ["time", "category", "place", "notes"],
            },
          },
        },
        required: ["date", "title", "items"],
      },
    },
  },
  required: ["title", "summary", "days"],
} as const;

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function makeDateRange(startDate: string, endDate: string): string[] {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end.getTime() < start.getTime()
  ) {
    return [];
  }

  const difference = Math.floor(
    (end.getTime() - start.getTime()) / 86_400_000,
  );

  if (difference > 30) return [];

  return Array.from({ length: difference + 1 }, (_, index) =>
    new Date(start.getTime() + index * 86_400_000)
      .toISOString()
      .slice(0, 10),
  );
}

function normalizeCategory(value: unknown): AllowedCategory {
  const category = cleanText(value, 10) as AllowedCategory;
  return allowedCategories.includes(category) ? category : "기타";
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "OPENAI_API_KEY가 설정되지 않았습니다." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const mode = body.mode === "revise" ? "revise" : "generate";
    const destination = cleanText(body.destination, 200);
    const startDate = cleanText(body.startDate, 10);
    const endDate = cleanText(body.endDate, 10);
    const travelStyle = cleanText(body.travelStyle, 200);
    const requirements = cleanText(body.requirements, 3000);
    const instruction = cleanText(body.instruction, 2000);
    const existingNotes = cleanText(body.existingNotes, 2000);
    const travelers = Number(body.travelers);
    const budget =
      body.budget === null || body.budget === "" || body.budget === undefined
        ? null
        : Number(body.budget);
    const dates = makeDateRange(startDate, endDate);

    if (!destination || !startDate || !endDate) {
      return Response.json(
        { error: "여행지, 출발일, 도착일을 입력해 주세요." },
        { status: 400 },
      );
    }

    if (dates.length === 0) {
      return Response.json(
        { error: "여행 기간을 확인해 주세요. 최대 31일까지 만들 수 있습니다." },
        { status: 400 },
      );
    }

    if (!Number.isInteger(travelers) || travelers < 1 || travelers > 100) {
      return Response.json(
        { error: "여행 인원을 올바르게 입력해 주세요." },
        { status: 400 },
      );
    }

    if (budget !== null && (!Number.isFinite(budget) || budget < 0)) {
      return Response.json(
        { error: "예산을 올바르게 입력해 주세요." },
        { status: 400 },
      );
    }

    if (mode === "revise" && !instruction) {
      return Response.json(
        { error: "수정 요청 내용을 입력해 주세요." },
        { status: 400 },
      );
    }

    const currentPlanText =
      mode === "revise" && body.currentPlan
        ? JSON.stringify(body.currentPlan).slice(0, 50_000)
        : "";

    const client = new OpenAI({ apiKey });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      store: false,
      max_output_tokens: 10_000,
      input: [
        {
          role: "developer",
          content: `당신은 한국인 여행자를 위한 전문 여행 일정 설계자입니다.

반드시 지킬 원칙:
1. ${startDate}부터 ${endDate}까지 총 ${dates.length}일의 일정을 날짜 순서대로 만듭니다.
2. 이동 거리와 소요시간을 고려해 같은 지역의 장소를 묶습니다.
3. 매일 이동, 관광, 식사, 휴식의 균형을 맞춥니다.
4. 여행 인원, 예산, 여행 성향, 필수 조건을 반영합니다.
5. 첫날과 마지막 날은 공항·항구·기차역 이동 시간을 고려합니다.
6. 실제 영업시간, 가격, 휴무일, 예약 가능 여부는 변할 수 있으므로 확정적으로 단정하지 않습니다.
7. 각 항목의 time은 HH:MM 형식으로 작성합니다.
8. category는 이동, 관광, 식사, 숙소, 쇼핑, 휴식, 기타 중 하나만 사용합니다.
9. 수정 작업에서는 사용자가 요청하지 않은 기존 일정은 최대한 유지합니다.
10. 결과는 지정된 JSON 형식으로만 출력합니다.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            task: mode === "revise" ? "기존 일정 수정" : "새 일정 생성",
            destination,
            startDate,
            endDate,
            dates,
            travelers,
            budgetWon: budget,
            travelStyle,
            requirements,
            existingNotes,
            revisionInstruction: instruction,
            currentPlan: currentPlanText,
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "journey_vault_travel_plan",
          strict: true,
          schema: travelPlanSchema,
        },
      },
    });

    if (!response.output_text) {
      throw new Error("AI가 여행계획을 생성하지 못했습니다.");
    }

    const generated = JSON.parse(response.output_text) as GeneratedPlan;
    if (!Array.isArray(generated.days) || generated.days.length === 0) {
      throw new Error("AI가 일자별 일정을 반환하지 않았습니다.");
    }

    const days = dates.map((date, dayIndex) => {
      const generatedDay = generated.days[dayIndex];
      const generatedItems = Array.isArray(generatedDay?.items)
        ? generatedDay.items
        : [];

      return {
        id: randomUUID(),
        date,
        title:
          cleanText(generatedDay?.title, 100) || `${dayIndex + 1}일차`,
        items: generatedItems.slice(0, 30).map((item) => ({
          id: randomUUID(),
          time: cleanText(item.time, 10),
          category: normalizeCategory(item.category),
          place: cleanText(item.place, 160),
          notes: cleanText(item.notes, 500),
        })),
      };
    });

    return Response.json({
      plan: {
        title:
          cleanText(generated.title, 100) || `${destination} 여행`,
        summary: cleanText(generated.summary, 2000),
        days,
      },
    });
  } catch (error) {
    console.error("AI travel plan error:", error);

    const status =
      error && typeof error === "object" && "status" in error
        ? Number((error as { status?: unknown }).status)
        : 500;

    let message =
      error instanceof Error
        ? error.message
        : "AI 여행계획을 생성하지 못했습니다.";

    if (status === 401) {
      message = "OpenAI API 키가 올바르지 않습니다. 새 키로 교체해 주세요.";
    } else if (status === 429) {
      message =
        "OpenAI API 사용 한도 또는 결제 설정을 확인해 주세요. 잠시 후 다시 시도할 수도 있습니다.";
    }

    return Response.json({ error: message }, { status: 500 });
  }
}
