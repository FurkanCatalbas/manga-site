import type { Metadata, Viewport } from "next";
import { Dela_Gothic_One, Onest } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { SearchIcon } from "@/components/icons";
import { DesktopNav, DesktopNavLinks, MobileTabBar, MobileTabBarView } from "@/components/SiteNav";
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
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0a0b10",
  // Çentikli ekranlarda içerik kenarlara kadar uzanır; boşluklar env(safe-area-inset-*) ile verilir
  viewportFit: "cover",
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
        <header className="site-header glass sticky top-0 z-30 border-b border-white/[0.06] pt-[env(safe-area-inset-top)]">
          <nav className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:gap-8">
            <Logo />
            <Suspense fallback={<DesktopNavLinks pathname={null} />}>
              <DesktopNav />
            </Suspense>
            <form action="/ara" className="ml-auto hidden w-full max-w-xs md:block">
              <label htmlFor="site-search" className="sr-only">Seri ara</label>
              <div className="relative">
                <SearchIcon size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
                <input
                  id="site-search"
                  name="q"
                  type="search"
                  placeholder="Seri ara…"
                  className="w-full rounded-full border border-white/[0.08] bg-white/[0.04] py-2 pr-4 pl-10 text-sm placeholder:text-muted focus:border-accent/60 focus:bg-white/[0.06] focus:outline-none"
                />
              </div>
            </form>
            <Link
              href="/ara"
              aria-label="Seri ara"
              className="ml-auto grid h-10 w-10 place-items-center rounded-full bg-white/[0.06] text-fg md:hidden"
            >
              <SearchIcon size={19} />
            </Link>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="mt-20 border-t border-white/[0.06]">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Logo />
              <p className="mt-2 max-w-xs text-sm text-muted">{SITE_DESCRIPTION}</p>
            </div>
            <div className="flex flex-col gap-3 text-sm text-muted sm:items-end">
              <div className="flex gap-5">
                <Link href="/ara" className="hover:text-fg">Seriler</Link>
                <Link href="/kutuphane" className="hover:text-fg">Kütüphane</Link>
              </div>
              <p className="text-xs">© {SITE_NAME}</p>
            </div>
          </div>
        </footer>
        <Suspense fallback={<MobileTabBarView pathname={null} />}>
          <MobileTabBar />
        </Suspense>
      </body>
    </html>
  );
}
