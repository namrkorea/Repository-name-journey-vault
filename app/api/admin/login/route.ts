import {
  adminSessionCookie,
  createAdminSessionToken,
  verifyAdminPassword,
} from "@/lib/server/adminAuth";

export const runtime = "nodejs";

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: unknown };
    const password =
      typeof body.password === "string" ? body.password.slice(0, 128) : "";

    if (!verifyAdminPassword(password)) {
      await delay(550);
      return Response.json(
        { error: "관리자 비밀번호가 일치하지 않습니다." },
        { status: 401 },
      );
    }

    const token = createAdminSessionToken();
    return Response.json(
      { ok: true },
      { headers: { "Set-Cookie": adminSessionCookie(token) } },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "관리자 로그인을 처리하지 못했습니다.",
      },
      { status: 500 },
    );
  }
}
