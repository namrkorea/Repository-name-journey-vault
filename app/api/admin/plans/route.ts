import { isAdminRequest } from "@/lib/server/adminAuth";
import { listAdminPlans } from "@/lib/server/planStore";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return Response.json(
      { error: "관리자 로그인이 필요합니다." },
      { status: 401 },
    );
  }

  try {
    const plans = await listAdminPlans();
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
            : "관리자 자료를 불러오지 못했습니다.",
      },
      { status: 500 },
    );
  }
}
