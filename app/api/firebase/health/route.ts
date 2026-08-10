import { NextResponse } from "next/server";

import { getFirestoreDb } from "@/lib/server/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getFirestoreDb().collection("travel_plans").limit(1).get();
    return NextResponse.json({
      ok: true,
      backend: "firebase-firestore",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Firebase 연결 확인에 실패했습니다.";
    return NextResponse.json(
      {
        ok: false,
        backend: "firebase-firestore",
        message,
      },
      { status: 500 },
    );
  }
}
