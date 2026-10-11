"use client";

// Masaüstünde başlıktaki bağlantılar, mobilde uygulama gibi alt sekme çubuğu.
// İleride Topluluk ve Profil sekmeleri buraya eklenecek.
//
// Etkin sekmeyi bulmak için adres (usePathname) okunur. cacheComponents açıkken bu ancak
// <Suspense> içinde yapılabilir; layout önce `pathname={null}` ile işaretsiz hâlini gösterir.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CompassIcon, HomeIcon, LibraryIcon } from "@/components/icons";

const TABS = [
  { href: "/", label: "Ana sayfa", Icon: HomeIcon },
  { href: "/ara", label: "Keşfet", Icon: CompassIcon },
  { href: "/kutuphane", label: "Kütüphane", Icon: LibraryIcon },
];

const isActive = (pathname: string | null, href: string) =>
  pathname !== null && (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

export function DesktopNavLinks({ pathname }: { pathname: string | null }) {
  return (
    <div className="hidden items-center gap-1 text-sm font-medium md:flex">
      {TABS.map(({ href, label }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 transition-colors ${active ? "bg-white/10 text-fg" : "text-muted hover:text-fg"}`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

export function DesktopNav() {
  return <DesktopNavLinks pathname={usePathname()} />;
}

/**
 * Okuyucu ve yönetim panelinde gösterilmez (okuyucu tam ekran kalır). Bu, adres okunmadan önce de
 * geçerli olsun diye CSS ile yapılır: o sayfalar köklerine `data-hide-tabbar` koyar (bkz. globals.css).
 */
export function MobileTabBarView({ pathname }: { pathname: string | null }) {
  return (
    <div className="mobile-tabbar md:hidden">
      {/* Sabit çubuğun altında içerik kalmasın diye yer tutucu */}
      <div aria-hidden className="h-[calc(4rem+env(safe-area-inset-bottom))]" />
      <nav
        aria-label="Ana menü"
        className="glass fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto flex h-16 max-w-md items-stretch justify-around">
          {TABS.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${active ? "text-fg" : "text-muted"}`}
                >
                  <span className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${active ? "bg-accent/15 text-accent" : ""}`}>
                    <Icon size={21} />
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function MobileTabBar() {
  return <MobileTabBarView pathname={usePathname()} />;
}
