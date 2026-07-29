import { validateTravelPlanInput } from "@/lib/server/planInput";
import { createTravelPlan, listPublicPlans } from "@/lib/server/planStore";
import { hashPlanPassword } from "@/lib/server/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const input = validateTravelPlanInput(await request.json());
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
