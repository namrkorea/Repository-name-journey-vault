"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/", label: "여행지 탐색" },
  { href: "/planner", label: "계획 만들기" },
  { href: "/plans", label: "저장된 일정" },
  { href: "/admin", label: "관리자" },
];

export default function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#030914]/85 px-4 py-3 backdrop-blur-2xl md:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <Link href="/" className="shrink-0" aria-label="Journey Vault 홈">
          <p className="text-base font-black tracking-wide text-white md:text-lg">
            JOURNEY VAULT
          </p>
          <p className="text-[8px] font-semibold tracking-[0.35em] text-sky-300 md:text-[9px]">
            PRIVATE TRAVEL PLANNER
          </p>
        </Link>

        <nav
          aria-label="주요 메뉴"
          className="order-3 flex w-full gap-2 overflow-x-auto pb-1 md:order-2 md:w-auto md:pb-0"
        >
          {navigation.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-full border px-3 py-2 text-xs transition md:text-sm ${
                  active
                    ? "border-sky-300/70 bg-sky-400/20 text-sky-100"
                    : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="order-2 text-right text-[9px] tracking-[0.12em] text-white/45 md:order-3">
          <p>v1.0</p>
          <p>by Changho Park</p>
        </div>
      </div>
    </header>
  );
}
