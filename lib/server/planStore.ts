import { getFirestoreDb } from "@/lib/server/firebaseAdmin";
import type {
  TravelPlanCreateInput,
  TravelPlanFull,
  TravelPlanPublic,
} from "@/types/plan";

const COLLECTION = "travel_plans";

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

function fromFirestore(id: string, data: FirebaseFirestore.DocumentData): StoredRow {
  const row = data as Omit<StoredRow, "id"> & { id?: string };
  return {
    ...row,
    id: row.id ?? id,
  };
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
  const snapshot = await getFirestoreDb()
    .collection(COLLECTION)
    .orderBy("created_at", "desc")
    .limit(100)
    .get();

  return snapshot.docs.map((doc) => toPublicPlan(fromFirestore(doc.id, doc.data())));
}

export async function getStoredPlan(id: string): Promise<StoredRow | null> {
  const doc = await getFirestoreDb().collection(COLLECTION).doc(id).get();
  if (!doc.exists) {
    return null;
  }
  return fromFirestore(doc.id, doc.data() ?? {});
}

export async function createTravelPlan(
  input: Omit<TravelPlanCreateInput, "password">,
  passwordHash: string,
): Promise<TravelPlanPublic> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const row: StoredRow = {
    id,
    title: input.title,
    destination: input.destination,
    start_date: input.startDate,
    end_date: input.endDate,
    travelers: input.travelers,
    budget: input.budget ?? null,
    travel_style: input.travelStyle || null,
    summary: input.summary || null,
    itinerary: input.days ?? [],
    password_hash: passwordHash,
    created_at: now,
    updated_at: now,
  };

  await getFirestoreDb().collection(COLLECTION).doc(id).set(row);
  return toPublicPlan(row);
}

export async function updateTravelPlan(
  id: string,
  input: Omit<TravelPlanCreateInput, "password">,
): Promise<TravelPlanPublic> {
  const docRef = getFirestoreDb().collection(COLLECTION).doc(id);
  const current = await docRef.get();

  if (!current.exists) {
    throw new Error("수정할 여행계획을 찾을 수 없습니다.");
  }

  await docRef.update({
    title: input.title,
    destination: input.destination,
    start_date: input.startDate,
    end_date: input.endDate,
    travelers: input.travelers,
    budget: input.budget ?? null,
    travel_style: input.travelStyle || null,
    summary: input.summary || null,
    itinerary: input.days ?? [],
    updated_at: new Date().toISOString(),
  });

  const updated = await docRef.get();
  return toPublicPlan(fromFirestore(updated.id, updated.data() ?? {}));
}

export async function listAdminPlans(): Promise<TravelPlanFull[]> {
  const snapshot = await getFirestoreDb()
    .collection(COLLECTION)
    .orderBy("created_at", "desc")
    .limit(200)
    .get();

  return snapshot.docs.map((doc) => toFullPlan(fromFirestore(doc.id, doc.data())));
}

export async function deleteTravelPlan(id: string): Promise<void> {
  await getFirestoreDb().collection(COLLECTION).doc(id).delete();
}
