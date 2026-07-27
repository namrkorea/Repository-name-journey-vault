import type {
  AddressComponent,
  PlaceDetailData,
  PlacePhoto,
  PlaceSummary,
} from "@/types/travel";

type GoogleText = { text?: string; languageCode?: string };
type GoogleAddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};
type GooglePhoto = {
  name?: string;
  widthPx?: number;
  heightPx?: number;
  authorAttributions?: Array<{
    displayName?: string;
    uri?: string;
    photoUri?: string;
  }>;
};

export type GooglePlace = {
  id?: string;
  displayName?: GoogleText;
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  primaryTypeDisplayName?: GoogleText;
  types?: string[];
  businessStatus?: string;
  currentOpeningHours?: { openNow?: boolean };
  photos?: GooglePhoto[];
  editorialSummary?: GoogleText;
  addressComponents?: GoogleAddressComponent[];
  utcOffsetMinutes?: number;
  timeZone?: { id?: string };
  websiteUri?: string;
};

function normalizePhotos(photos?: GooglePhoto[]): PlacePhoto[] {
  return (photos ?? [])
    .filter((photo): photo is GooglePhoto & { name: string } => Boolean(photo.name))
    .slice(0, 10)
    .map((photo) => ({
      name: photo.name,
      widthPx: photo.widthPx,
      heightPx: photo.heightPx,
      authorAttributions: photo.authorAttributions ?? [],
    }));
}

function normalizeAddressComponents(
  components?: GoogleAddressComponent[],
): AddressComponent[] {
  return (components ?? []).map((component) => ({
    longText: component.longText ?? "",
    shortText: component.shortText ?? "",
    types: component.types ?? [],
  }));
}

function componentValue(
  components: AddressComponent[],
  type: string,
  short = false,
): string {
  const component = components.find((item) => item.types.includes(type));
  return short ? component?.shortText ?? "" : component?.longText ?? "";
}

export function normalizePlaceSummary(place: GooglePlace): PlaceSummary {
  return {
    id: place.id ?? crypto.randomUUID(),
    name: place.displayName?.text ?? "이름 정보 없음",
    address: place.formattedAddress ?? "주소 정보 없음",
    location: {
      lat: place.location?.latitude ?? 0,
      lng: place.location?.longitude ?? 0,
    },
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? null,
    googleMapsUri: place.googleMapsUri ?? null,
    primaryType: place.primaryTypeDisplayName?.text ?? "관광명소",
    types: place.types ?? [],
    openNow: place.currentOpeningHours?.openNow ?? null,
    businessStatus: place.businessStatus ?? null,
    photos: normalizePhotos(place.photos),
    editorialSummary: place.editorialSummary?.text ?? null,
  };
}

export function normalizePlaceDetail(place: GooglePlace): PlaceDetailData {
  const base = normalizePlaceSummary(place);
  const addressComponents = normalizeAddressComponents(place.addressComponents);
  const country = componentValue(addressComponents, "country");
  const countryCode = componentValue(addressComponents, "country", true).toUpperCase();
  const city =
    componentValue(addressComponents, "locality") ||
    componentValue(addressComponents, "administrative_area_level_1") ||
    componentValue(addressComponents, "administrative_area_level_2");

  return {
    ...base,
    addressComponents,
    country,
    countryCode,
    city,
    localName: place.displayName?.text ?? base.name,
    utcOffsetMinutes: place.utcOffsetMinutes ?? null,
    timeZoneId: place.timeZone?.id ?? null,
    websiteUri: place.websiteUri ?? null,
  };
}
