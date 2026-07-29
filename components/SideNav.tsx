"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Globe2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const navigation = [
  {
    href: "/",
    label: "여행지 탐색",
    shortLabel: "탐색",
    icon: Globe2,
  },
  {
    href: "/planner",
    label: "AI 계획 만들기",
    shortLabel: "AI 계획",
    icon: Sparkles,
  },
  {
    href: "/plans",
    label: "저장된 일정",
    shortLabel: "일정",
    icon: CalendarDays,
  },
  {
    href: "/admin",
    label: "관리자",
    shortLabel: "관리",
    icon: ShieldCheck,
  },
];

export default function SideNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <>
      <aside
        aria-label="주요 메뉴"
        className="fixed left-4 top-1/2 z-[90] hidden -translate-y-1/2 flex-col gap-2 rounded-[24px] border border-white/10 bg-[#07101f]/82 p-2 shadow-2xl shadow-black/45 backdrop-blur-2xl md:flex"
      >
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              className={`group relative grid h-12 w-12 place-items-center rounded-2xl border transition-all duration-200 ${
                active
                  ? "border-sky-300/60 bg-sky-400/20 text-sky-100 shadow-lg shadow-sky-500/10"
                  : "border-transparent text-white/55 hover:border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={20} strokeWidth={1.8} />
              <span className="pointer-events-none absolute left-14 whitespace-nowrap rounded-xl border border-white/10 bg-[#07101f]/96 px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {item.label}
              </span>
            </Link>
          );
        })}
      </aside>

      <nav
        aria-label="모바일 주요 메뉴"
        className="safe-bottom fixed bottom-3 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-white/10 bg-[#07101f]/92 p-2 shadow-2xl shadow-black/40 backdrop-blur-2xl md:hidden"
      >
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={`flex min-w-[58px] flex-col items-center gap-1 rounded-xl px-2 py-2 text-[9px] transition ${
                active
                  ? "bg-sky-400/20 text-sky-100"
                  : "text-white/55 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{item.shortLabel}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
