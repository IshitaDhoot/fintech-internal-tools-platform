import type { Metadata } from "next";
import "./globals.css";
import { RoleSwitcher } from "@repo/ui";
import { getRole } from "@repo/rbac/server";
import { Flag } from "lucide-react";
import Link from "next/link";
import { FLAG_ROLE_COOKIE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Feature Flag Admin",
  description: "Internal feature-flag administration tool",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const role = getRole(FLAG_ROLE_COOKIE);
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-100 text-slate-900">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
            <Link href="/flags" className="flex items-center gap-2 font-semibold">
              <Flag className="h-5 w-5 text-indigo-600" />
              Feature Flag Admin
            </Link>
            <RoleSwitcher role={role} cookieName={FLAG_ROLE_COOKIE} />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
