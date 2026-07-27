import type { ReactNode } from "react";

type MobileBottomSheetProps = {
  open: boolean;
  children: ReactNode;
};

export default function MobileBottomSheet({ open, children }: MobileBottomSheetProps) {
  if (!open) return null;
  return (
    <section className="glass safe-bottom fixed bottom-0 left-0 right-0 z-50 h-[64vh] overflow-hidden rounded-t-[26px] md:hidden slide-up">
      <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-white/25" />
      <div className="h-[calc(100%_-_12px)]">{children}</div>
    </section>
  );
}
