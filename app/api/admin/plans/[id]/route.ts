import { isAdminRequest } from "@/lib/server/adminAuth";
import { deleteTravelPlan } from "@/lib/server/planStore";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) {
    return Response.json(
      { error: "관리자 로그인이 필요합니다." },
      { status: 401 },
    );
  }

  try {
    const { id } = await context.params;
    await deleteTravelPlan(id);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "여행계획을 삭제하지 못했습니다.",
      },
      { status: 500 },
    );
  }
}
