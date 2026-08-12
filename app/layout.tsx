import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "연금한눈 | 연금저축·퇴직연금 비교",
  description: "금융감독원 공시 API로 연금저축 상품과 퇴직연금 사업자의 수익률·비용을 비교합니다.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
