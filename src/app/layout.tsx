import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "택배 구인 업무 자동화 용카",
  description: "용카 AI를 활용한 택배 구인 공고 정리, 배송 구역 지도 제작, 홍보 이미지 생성 등 업무 자동화 서비스",
  icons: {
    icon: "/logo512.png",
  },
  keywords: ["택배", "구인", "업무자동화", "용카", "AI", "배송지도", "구인공고"],
};

import { AuthProvider } from "@/context/auth-context";
import KakaoScript from "@/components/KakaoScript";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        <KakaoScript />
      </body>
    </html>
  );
}

