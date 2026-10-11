import type { Metadata } from "next";
import { Dela_Gothic_One, Onest } from "next/font/google";
import Link from "next/link";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const dela = Dela_Gothic_One({
  variable: "--font-dela",
  weight: "400",
  subsets: ["latin", "latin-ext"],
});

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: Webtoon ve Manga Oku`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { type: "website", siteName: SITE_NAME, locale: "tr_TR", url: "/" },
  twitter: { card: "summary_large_image" },
};

function Logo() {
  return (
    <Link href="/" className="font-display text-xl leading-none tracking-tight">
      webtoo<span className="text-accent">ku</span>
    </Link>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${dela.variable} ${onest.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="site-header sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
          <nav className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
            <Logo />
            <div className="hidden gap-5 text-sm font-medium text-muted sm:flex">
              <Link href="/" className="hover:text-fg">Ana sayfa</Link>
              <Link href="/ara" className="hover:text-fg">Seriler</Link>
            </div>
            <form action="/ara" className="ml-auto w-full max-w-xs">
              <label htmlFor="site-search" className="sr-only">Seri ara</label>
              <input
                id="site-search"
                name="q"
                type="search"
                placeholder="Seri ara…"
                className="w-full rounded-full border border-line bg-surface px-4 py-2 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
              />
            </form>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="mt-16 border-t border-line bg-surface">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
            <Logo />
            <p>Her hafta yeni bölümler.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
