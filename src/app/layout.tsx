import type { Metadata, Viewport } from "next";
import { Dela_Gothic_One, Onest } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/Brand";
import { GenreMenu } from "@/components/GenreMenu";
import { SearchIcon } from "@/components/icons";
import { DesktopNav, DesktopNavLinks, MobileTabBar, MobileTabBarView } from "@/components/SiteNav";
import { getGenres } from "@/lib/data";
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

// Altbilgideki Keşfet bağlantıları (Keşfet sayfasının sıralama ve filtreleri)
const EXPLORE_LINKS = [
  { href: "/ara?sira=populer", label: "Popüler" },
  { href: "/ara", label: "Son güncellenenler" },
  { href: "/ara?sira=yeni", label: "Yeni eklenenler" },
  { href: "/ara?durum=tamam", label: "Tamamlanan seriler" },
  { href: "/tur", label: "Tüm türler" },
  { href: "/kutuphane", label: "Kütüphanem" },
];

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const genres = await getGenres();
  return (
    <html lang="tr" className={`${dela.variable} ${onest.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="site-header glass sticky top-0 z-30 border-b border-white/[0.06] pt-[env(safe-area-inset-top)]">
          <nav className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:gap-8">
            <Logo />
            <div className="hidden items-center gap-1 md:flex">
              <Suspense fallback={<DesktopNavLinks pathname={null} />}>
                <DesktopNav />
              </Suspense>
              <GenreMenu genres={genres} />
            </div>
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
          <div className="mx-auto max-w-7xl px-4 py-10">
            <div className="grid gap-10 lg:grid-cols-[18rem_minmax(0,1fr)]">
              <div>
                <Logo id="logo-footer" />
                <p className="mt-2 max-w-xs text-sm text-muted">{SITE_DESCRIPTION}</p>
              </div>
              <div className="grid gap-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-12">
                {genres.length > 0 && (
                  <nav aria-label="Türler">
                    <h2 className="mb-3 text-sm font-bold">Türler</h2>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-muted sm:grid-cols-3 md:grid-cols-4">
                      {genres.map((g) => (
                        <li key={g.slug} className="min-w-0">
                          <Link href={`/tur/${g.slug}`} className="block truncate hover:text-fg">
                            {g.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}
                <nav aria-label="Keşfet">
                  <h2 className="mb-3 text-sm font-bold">Keşfet</h2>
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-muted sm:grid-cols-1">
                    {EXPLORE_LINKS.map((l) => (
                      <li key={l.href}>
                        <Link href={l.href} className="hover:text-fg">
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            </div>
            <p className="mt-10 border-t border-white/[0.06] pt-6 text-xs text-muted">© {SITE_NAME}</p>
          </div>
        </footer>
        <Suspense fallback={<MobileTabBarView pathname={null} />}>
          <MobileTabBar />
        </Suspense>
      </body>
    </html>
  );
}
