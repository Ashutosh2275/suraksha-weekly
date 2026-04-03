import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { QueryProvider } from "@/lib/QueryProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Suraksha Weekly - Worker Portal",
  description: "AI Parametric Income Shield for Gig Delivery Partners",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
