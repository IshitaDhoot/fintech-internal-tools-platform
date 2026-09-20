import type { Metadata } from "next";
import "./globals.css";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { getRole } from "@/lib/role";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "KYC Review Queue",
  description: "Internal KYC compliance review tool",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const role = getRole();
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-100 text-slate-900">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
            <Link href="/queue" className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              KYC Review Queue
            </Link>
            <RoleSwitcher role={role} />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
