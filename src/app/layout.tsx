import type { Metadata } from "next";
import { Nanum_Myeongjo, Nunito } from "next/font/google";
import "./globals.css";

const myeongjo = Nanum_Myeongjo({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  variable: "--font-myeongjo",
});

// Nori 디자인 시스템의 라벨·숫자용 글꼴 (한글은 Pretendard로 대체됨)
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["600", "800", "900"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "노리 · 한자 단어 탐험",
  description: "노리와 함께 궁금한 단어 속 한자를 찾고, 써 보고, 익히는 어린이 학습 앱",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${myeongjo.variable} ${nunito.variable} antialiased min-h-screen bg-duo-snow flex flex-col items-center`}>
        <main className="w-full max-w-md bg-white min-h-screen shadow-sm flex flex-col relative overflow-x-clip">
          {children}
        </main>
      </body>
    </html>
  );
}
