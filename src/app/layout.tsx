import type { Metadata } from "next";
import { Dela_Gothic_One, Onest } from "next/font/google";
import Link from "next/link";
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
  title: { default: "MangaOku", template: "%s | MangaOku" },
  description: "Manga ve webtoon okuma sitesi",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${dela.variable} ${onest.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b-[3px] border-ink bg-paper">
          <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
            <Link href="/" className="font-display text-2xl leading-none tracking-tight">
              manga<span className="ml-0.5 inline-block -rotate-3 bg-ink px-1.5 pb-1 text-paper">oku</span>
            </Link>
            <Link
              href="/ara"
              className="border-2 border-ink bg-white px-4 py-1.5 text-sm font-semibold hover:bg-ink hover:text-paper"
            >
              Seri ara
            </Link>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t-[3px] border-ink">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-sm">
            <span className="font-display">mangaoku</span>
            <span className="text-ink/60">Her hafta yeni bölümler</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
