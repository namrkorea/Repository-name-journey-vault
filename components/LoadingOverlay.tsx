type LoadingOverlayProps = {
  visible: boolean;
  label?: string;
};

export default function LoadingOverlay({
  visible,
  label = "지도를 이동하는 중입니다",
}: LoadingOverlayProps) {
  if (!visible) return null;
  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-slate-950/20 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
    >
      <div className="glass flex items-center gap-3 rounded-full px-5 py-3 text-sm text-[var(--text)]">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-300 border-t-transparent" />
        {label}
      </div>
    </div>
  );
}
