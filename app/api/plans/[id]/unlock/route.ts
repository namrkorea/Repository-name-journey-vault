import { getStoredPlan, toFullPlan } from "@/lib/server/planStore";
import { verifyPlanPassword } from "@/lib/server/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { password?: unknown };
    const password =
      typeof body.password === "string" ? body.password.slice(0, 64) : "";

    if (!password) {
      return Response.json(
        { error: "비밀번호를 입력해 주세요." },
        { status: 400 },
      );
    }

    const stored = await getStoredPlan(id);
    if (!stored) {
      return Response.json(
        { error: "해당 여행계획을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const valid = await verifyPlanPassword(password, stored.password_hash);
    if (!valid) {
      await delay(450);
      return Response.json(
        { error: "비밀번호가 일치하지 않습니다." },
        { status: 401 },
      );
    }

    return Response.json(
      { plan: toFullPlan(stored) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "여행계획을 열지 못했습니다.",
      },
      { status: 500 },
    );
  }
}
