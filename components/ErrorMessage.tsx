type ErrorMessageProps = {
  message: string;
  onClose: () => void;
};

export default function ErrorMessage({ message, onClose }: ErrorMessageProps) {
  if (!message) return null;
  return (
    <div className="glass fixed bottom-5 left-1/2 z-[80] flex w-[min(92vw,560px)] -translate-x-1/2 items-start gap-3 rounded-2xl px-4 py-3 text-sm fade-in">
      <span aria-hidden="true" className="mt-0.5 text-amber-300">!</span>
      <p className="min-w-0 flex-1 leading-6 text-[var(--text)]">{message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="오류 메시지 닫기"
        className="rounded-lg px-2 py-1 text-[var(--muted)] hover:bg-white/10"
      >
        닫기
      </button>
    </div>
  );
}
