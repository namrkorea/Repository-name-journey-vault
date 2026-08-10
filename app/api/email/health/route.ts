import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = process.env.GMAIL_SMTP_USER?.trim() || "";
  const password = (process.env.GMAIL_SMTP_APP_PASSWORD || "").replace(/\s+/g, "");
  const configured = Boolean(user) && password.length === 16;

  return NextResponse.json(
    {
      ok: configured,
      backend: "gmail-smtp",
      configured: {
        user: Boolean(user),
        appPassword: password.length === 16,
      },
    },
    {
      status: configured ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
