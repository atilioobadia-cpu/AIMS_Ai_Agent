import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIMS AI Agent | Tanzania Tax & Accounting Assistant",
  description:
    "AI-powered tax advisory and accounting assistant for Tanzania. Ask about VAT, PAYE, SDL, WHT, corporation tax, compliance, and ERPNext.",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f0f0f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
