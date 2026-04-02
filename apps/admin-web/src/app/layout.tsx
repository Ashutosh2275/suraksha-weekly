import type { Metadata } from "next";
import { AdminShell } from "@/components/AdminShell";
import { ReviewQueueProvider } from "@/lib/ReviewQueueContext";
import { ClaimsProvider } from "@/lib/ClaimsContext";
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
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="preconnect"
        />
      </head>
      <body className="font-body">
        <ClaimsProvider>
          <ReviewQueueProvider>
            <AdminShell>{children}</AdminShell>
          </ReviewQueueProvider>
        </ClaimsProvider>
      </body>
    </html>
  );
}
