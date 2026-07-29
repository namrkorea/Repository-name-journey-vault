import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import ScheduleMapLinks from "@/components/ScheduleMapLinks";
import SideNav from "@/components/SideNav";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Journey Vault AI",
    template: "%s | Journey Vault AI",
  },
  description:
    "AI로 맞춤 여행일정을 만들고 수정하며 비밀번호로 보호해 저장하는 개인 여행 플래너",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#04101f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <SideNav />
        <ScheduleMapLinks />
        {children}
      </body>
    </html>
  );
}
