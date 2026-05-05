import type { Metadata } from "next";
import { Nanum_Myeongjo } from "next/font/google";
import "./globals.css";

const myeongjo = Nanum_Myeongjo({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  variable: "--font-myeongjo",
});

export const metadata: Metadata = {
  title: "꼬리에 꼬리를 무는 漢字",
  description: "아이들을 위한 즐거운 한자 꼬리잡기 학습 앱",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${myeongjo.variable} antialiased min-h-screen bg-duo-snow flex flex-col items-center`}>
        <main className="w-full max-w-md bg-white min-h-screen shadow-sm flex flex-col relative overflow-x-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
