import { getPhotoUrl } from "@/lib/format";
import type { PlacePhoto } from "@/types/travel";

type PhotoGalleryProps = {
  photos: PlacePhoto[];
  fallback?: string | null;
  title: string;
  compact?: boolean;
};

export default function PhotoGallery({
  photos,
  fallback,
  title,
  compact = false,
}: PhotoGalleryProps) {
  const primary = photos[0];
  const src = primary ? getPhotoUrl(primary.name, compact ? 780 : 1400) : fallback;
  const attribution = primary?.authorAttributions?.[0];

  return (
    <figure className="relative m-0 overflow-hidden rounded-2xl bg-slate-900/60">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`${title} 대표 사진`}
          className={`w-full object-cover ${compact ? "h-44" : "h-64 md:h-72"}`}
        />
      ) : (
        <div className={`flex w-full items-center justify-center bg-gradient-to-br from-sky-900 to-slate-950 text-4xl ${compact ? "h-44" : "h-64"}`}>
          ◇
        </div>
      )}
      {attribution?.displayName && (
        <figcaption className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 text-[10px] text-white">
          사진: {attribution.displayName}
        </figcaption>
      )}
    </figure>
  );
}
