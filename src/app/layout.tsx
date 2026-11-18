import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { shellNav } from "@/components/shell/nav";
import { PrimaryNav } from "@/components/shell/primary-nav";
import { SiteFooter } from "@/components/shell/site-footer";
import { SiteHeader } from "@/components/shell/site-header";
import { ToastProvider } from "@/components/ui/toast";
import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: {
    default: "Bond",
    template: "%s · Bond",
  },
  description:
    "Turn a group chat plan into a shared record of who will do what by when. Bond is not a contract and does not send messages.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await readSessionUser(getDb());

  return (
    <html lang="en" className={`${manrope.variable} ${fraunces.variable} h-full`}>
      <body className="flex min-h-full flex-col pb-24 font-sans text-ink antialiased md:pb-0">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-paper focus:px-4 focus:py-2 focus:text-ink"
        >
          Skip to content
        </a>
        <SiteHeader displayName={user?.displayName ?? null} items={shellNav} />
        <ToastProvider>
          <div className="flex-1">{children}</div>
        </ToastProvider>
        <SiteFooter />
        <PrimaryNav items={shellNav} variant="mobile" />
      </body>
    </html>
  );
}
