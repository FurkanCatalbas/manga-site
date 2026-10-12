"use client";

// Vercel Web Analytics: sayfa görüntülemeleri (hangi seri/bölüm çok okunuyor, ziyaretçi nereden geliyor).
// Çerez kullanmaz. Yönetim paneli sayılmaz. Vercel → proje → Analytics'ten açılmalı.
import { Analytics } from "@vercel/analytics/next";

export function SiteAnalytics() {
  return <Analytics beforeSend={(e) => (new URL(e.url).pathname.startsWith("/admin") ? null : e)} />;
}
