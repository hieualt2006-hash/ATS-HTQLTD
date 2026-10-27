import type { Metadata } from "next";
import "./globals.css";
import ChatBotWidget from "@/components/chatbot/ChatBotWidget";

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
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#F2F1ED] text-[#0C0C0C] antialiased selection:bg-[#16a34a] selection:text-white font-sans">
        {children}
        <ChatBotWidget />
      </body>
    </html>
  );
}
