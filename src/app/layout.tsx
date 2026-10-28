import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import ChatBotWidget from "@/components/chatbot/ChatBotWidget";

const beVietnamPro = Be_Vietnam_Pro({
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-be-vietnam-pro",
});

export const metadata: Metadata = {
  title: "ATS Enterprise | Hệ Thống Quản Trị Tuyển Dụng B2B SaaS",
  description: "Phần mềm Quản trị Tuyển dụng toàn diện cho Doanh nghiệp & HR. Chuẩn hóa quy trình, sàng lọc hồ sơ và quản lý lịch phỏng vấn thông minh.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={beVietnamPro.variable}>
      <body className="bg-[#F2F1ED] text-[#0C0C0C] antialiased selection:bg-[#16a34a] selection:text-white font-sans">
        {children}
        <ChatBotWidget />
      </body>
    </html>
  );
}
