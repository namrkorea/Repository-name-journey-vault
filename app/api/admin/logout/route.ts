import { clearAdminSessionCookie } from "@/lib/server/adminAuth";

export async function POST() {
  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": clearAdminSessionCookie() } },
  );
}
