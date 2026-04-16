import type { Metadata } from "next";
import { AdminShell } from "@/components/AdminShell";
import { AppProvider } from "@/lib/AppContext";
import { DemoAuthProvider } from "@/components/DemoAuthProvider";
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
        <DemoAuthProvider>
          <AppProvider>
            <AdminShell>{children}</AdminShell>
          </AppProvider>
        </DemoAuthProvider>
      </body>
    </html>
  );
}
