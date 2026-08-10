import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} 환경변수를 설정해 주세요.`);
  }
  return value;
}

const supabaseUrl = requireEnv("SUPABASE_URL").replace(/\/$/, "");
const supabaseKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const projectId = requireEnv("FIREBASE_PROJECT_ID");
const clientEmail = requireEnv("FIREBASE_CLIENT_EMAIL");
const privateKey = requireEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");

const app = initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
  projectId,
});
const db = getFirestore(app);

async function readSupabasePlans() {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/travel_plans?select=*&order=created_at.asc`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Supabase 읽기 실패: ${await response.text()}`);
  }

  return response.json();
}

async function writeChunk(rows) {
  const batch = db.batch();
  for (const row of rows) {
    if (!row?.id) {
      console.warn("id가 없는 행을 건너뜁니다.", row);
      continue;
    }
    const ref = db.collection("travel_plans").doc(String(row.id));
    batch.set(ref, row, { merge: false });
  }
  await batch.commit();
}

async function main() {
  console.log("Supabase 여행계획을 읽는 중...");
  const rows = await readSupabasePlans();
  console.log(`총 ${rows.length}건을 찾았습니다.`);

  if (rows.length === 0) {
    console.log("이전할 데이터가 없습니다.");
    return;
  }

  const chunkSize = 400;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await writeChunk(chunk);
    console.log(`${Math.min(i + chunk.length, rows.length)} / ${rows.length}건 이전 완료`);
  }

  console.log("Firebase Firestore 이전이 완료되었습니다.");
  console.log("기존 문서 ID와 password_hash를 그대로 보존했습니다.");
}

main().catch((error) => {
  console.error("마이그레이션 실패:", error);
  process.exitCode = 1;
});
