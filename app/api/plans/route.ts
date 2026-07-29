import {
  normalizeRecipientEmail,
  sendTravelPlanEmail,
} from "@/lib/server/planEmail";
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
    const body = await request.json();
    const recipientEmail = normalizeRecipientEmail(
      (body as Record<string, unknown>).recipientEmail,
    );
    const input = validateTravelPlanInput(body);
    const passwordHash = await hashPlanPassword(input.password);
    const { password: _password, ...planInput } = input;
    const plan = await createTravelPlan(planInput, passwordHash);

    let email: {
      requested: boolean;
      sent: boolean;
      id?: string;
      error?: string;
    } = {
      requested: Boolean(recipientEmail),
      sent: false,
    };

    if (recipientEmail) {
      try {
        const emailId = await sendTravelPlanEmail({
          to: recipientEmail,
          planId: plan.id,
          planUrl: new URL(`/plans/${encodeURIComponent(plan.id)}`, request.url)
            .toString(),
          plan: planInput,
        });
        email = { requested: true, sent: true, id: emailId };
      } catch (caught) {
        email = {
          requested: true,
          sent: false,
          error:
            caught instanceof Error
              ? caught.message
              : "메일을 전송하지 못했습니다.",
        };
      }
    }

    return Response.json({ plan, email }, { status: 201 });
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
