import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "한자 꼬리 (Hanja Tail)",
  description: "아이들을 위한 한자 꼬리잡기 퀴즈 앱",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen bg-duo-snow flex flex-col items-center">
        <main className="w-full max-w-md bg-white min-h-screen shadow-sm flex flex-col relative overflow-x-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
