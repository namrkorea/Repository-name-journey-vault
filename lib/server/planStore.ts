import type {
  TravelPlanCreateInput,
  TravelPlanFull,
  TravelPlanPublic,
} from "@/types/plan";

type StoredRow = {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  travelers: number;
  budget: number | null;
  travel_style: string | null;
  summary: string | null;
  itinerary: TravelPlanFull["days"];
  password_hash: string;
  created_at: string;
  updated_at: string;
};

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 설정해 주세요.");
  }
  return { url, key };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`여행계획 저장소 요청 실패: ${message}`);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

function toPublicPlan(row: StoredRow): TravelPlanPublic {
  return {
    id: row.id,
    title: row.title,
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    travelers: row.travelers,
    travelStyle: row.travel_style ?? "",
    createdAt: row.created_at,
    locked: true,
  };
}

export function toFullPlan(row: StoredRow): TravelPlanFull {
  return {
    id: row.id,
    title: row.title,
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    travelers: row.travelers,
    budget: row.budget,
    travelStyle: row.travel_style ?? "",
    summary: row.summary ?? "",
    days: row.itinerary ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listPublicPlans(): Promise<TravelPlanPublic[]> {
  const rows = await request<StoredRow[]>(
    "travel_plans?select=id,title,destination,start_date,end_date,travelers,travel_style,created_at&order=created_at.desc&limit=100",
  );
  return rows.map(toPublicPlan);
}

export async function getStoredPlan(id: string): Promise<StoredRow | null> {
  const rows = await request<StoredRow[]>(
    `travel_plans?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
  );
  return rows[0] ?? null;
}

export async function createTravelPlan(
  input: Omit<TravelPlanCreateInput, "password">,
  passwordHash: string,
): Promise<TravelPlanPublic> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const [row] = await request<StoredRow[]>("travel_plans", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      id,
      title: input.title,
      destination: input.destination,
      start_date: input.startDate,
      end_date: input.endDate,
      travelers: input.travelers,
      budget: input.budget,
      travel_style: input.travelStyle,
      summary: input.summary,
      itinerary: input.days,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
    }),
  });

  return toPublicPlan(row);
}

export async function listAdminPlans(): Promise<TravelPlanFull[]> {
  const rows = await request<StoredRow[]>(
    "travel_plans?select=*&order=created_at.desc&limit=200",
  );
  return rows.map(toFullPlan);
}

export async function deleteTravelPlan(id: string): Promise<void> {
  await request<null>(`travel_plans?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}
