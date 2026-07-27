export function formatNumber(value: number | null): string {
  if (value === null) return "정보 없음";
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function formatLocalTime(
  utcOffsetMinutes: number | null,
): string {
  if (utcOffsetMinutes === null) return "정보 없음";
  const utcNow = Date.now() + new Date().getTimezoneOffset() * 60_000;
  const local = new Date(utcNow + utcOffsetMinutes * 60_000);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(local);
}

export function getPhotoUrl(photoName: string, width = 1200): string {
  return `/api/photo?name=${encodeURIComponent(photoName)}&width=${width}`;
}

export function openingText(openNow: boolean | null): string {
  if (openNow === true) return "영업 중";
  if (openNow === false) return "영업 종료";
  return "영업 정보 없음";
}
