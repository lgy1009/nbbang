import type { Metadata, Viewport } from "next";
import { Gowun_Dodum, Jua } from "next/font/google";
import "./globals.css";

// 글꼴은 빌드할 때 사이트 안에 포함된다 (사용 중 외부로 요청하지 않음)
const jua = Jua({
  variable: "--font-jua",
  weight: "400",
  subsets: ["latin"],
  preload: false,
});

const gowun = Gowun_Dodum({
  variable: "--font-gowun",
  weight: "400",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "N빵 계산기",
  description: "여행비를 나누고, 누가 누구에게 얼마 보내면 끝나는지 한 번에 계산해요.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FBF6EC",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${jua.variable} ${gowun.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
