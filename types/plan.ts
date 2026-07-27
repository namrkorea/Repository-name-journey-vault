export type ItineraryCategory =
  | "이동"
  | "관광"
  | "식사"
  | "숙소"
  | "쇼핑"
  | "휴식"
  | "기타";

export type ItineraryItem = {
  id: string;
  time: string;
  category: ItineraryCategory;
  place: string;
  notes: string;
};

export type ItineraryDay = {
  id: string;
  date: string;
  title: string;
  items: ItineraryItem[];
};

export type TravelPlanCreateInput = {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budget: number | null;
  travelStyle: string;
  summary: string;
  days: ItineraryDay[];
  password: string;
};

export type TravelPlanPublic = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  travelStyle: string;
  createdAt: string;
  locked: true;
};

export type TravelPlanFull = Omit<TravelPlanPublic, "locked"> & {
  budget: number | null;
  summary: string;
  days: ItineraryDay[];
  updatedAt: string;
};
