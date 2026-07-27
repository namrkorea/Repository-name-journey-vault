import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Journey Vault",
    template: "%s | Journey Vault",
  },
  description:
    "3D 지구본으로 여행지를 탐색하고 비밀번호로 보호된 맞춤 여행일정을 만드는 개인 여행 플래너",
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
      <body>{children}</body>
    </html>
  );
}
