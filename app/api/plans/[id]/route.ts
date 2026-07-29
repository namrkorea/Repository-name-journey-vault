import { validateTravelPlanInput } from "@/lib/server/planInput";
import { getStoredPlan, updateTravelPlan } from "@/lib/server/planStore";
import { verifyPlanPassword } from "@/lib/server/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const input = validateTravelPlanInput(await request.json());
    const stored = await getStoredPlan(id);

    if (!stored) {
      return Response.json(
        { error: "수정할 여행계획을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const valid = await verifyPlanPassword(input.password, stored.password_hash);
    if (!valid) {
      await delay(450);
      return Response.json(
        { error: "현재 열람 비밀번호가 일치하지 않습니다." },
        { status: 401 },
      );
    }

    const { password: _password, ...planInput } = input;
    const plan = await updateTravelPlan(id, planInput);

    return Response.json({ plan });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "여행계획을 수정하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
