import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "开心の成长记录",
  description: "宝宝成长记录、照护记录、家庭提醒和采购清单",
  icons: {
    icon: "/baby-bottle.png",
    apple: "/baby-bottle.png"
  }
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
