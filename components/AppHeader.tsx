import Link from "next/link";

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#030914]/85 px-4 py-3 backdrop-blur-2xl md:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <Link href="/" className="shrink-0" aria-label="Journey Vault 홈">
          <p className="text-base font-black tracking-wide text-white md:text-lg">
            JOURNEY VAULT AI
          </p>
          <p className="text-[8px] font-semibold tracking-[0.35em] text-sky-300 md:text-[9px]">
            PRIVATE TRAVEL DESIGNER
          </p>
        </Link>

        <div className="text-right text-[9px] tracking-[0.12em] text-white/45">
          <p>v2.0</p>
          <p>by Changho Park</p>
        </div>
      </div>
    </header>
  );
}
