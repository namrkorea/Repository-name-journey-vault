export type LatLng = {
  lat: number;
  lng: number;
  altitude?: number;
};

export type PhotoAttribution = {
  displayName?: string;
  uri?: string;
  photoUri?: string;
};

export type PlacePhoto = {
  name: string;
  widthPx?: number;
  heightPx?: number;
  authorAttributions?: PhotoAttribution[];
};

export type AddressComponent = {
  longText: string;
  shortText: string;
  types: string[];
};

export type PlaceSummary = {
  id: string;
  name: string;
  address: string;
  location: LatLng;
  rating: number | null;
  userRatingCount: number | null;
  googleMapsUri: string | null;
  primaryType: string;
  types: string[];
  openNow: boolean | null;
  businessStatus: string | null;
  photos: PlacePhoto[];
  editorialSummary?: string | null;
};

export type PlaceDetailData = PlaceSummary & {
  addressComponents: AddressComponent[];
  country: string;
  countryCode: string;
  city: string;
  localName: string;
  utcOffsetMinutes: number | null;
  timeZoneId: string | null;
  websiteUri: string | null;
};

export type AutocompleteSuggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
};

export type WikiSummary = {
  title: string;
  extract: string;
  url: string;
  thumbnail: string | null;
  language: "ko" | "en";
};

export type CountryFacts = {
  countryCode: string;
  officialName: string;
  languages: string[];
  currencies: string[];
  flag: string | null;
  capital: string[];
  timeZones: string[];
  bestSeason: string;
  representativeFood: string;
  caution: string;
};

export type NearbyCategory =
  | "all"
  | "tourist"
  | "museum"
  | "park"
  | "restaurant"
  | "cafe"
  | "hotel";

export type SearchTarget = {
  id: string;
  name: string;
  location: LatLng;
  kind: "region" | "place";
};
