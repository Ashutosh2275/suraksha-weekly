import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Suraksha Weekly - Admin Dashboard",
  description: "Admin dashboard for AI Parametric Income Shield",
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
