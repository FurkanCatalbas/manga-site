import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Topluluk Kuralları", alternates: { canonical: "/topluluk-kurallari" } };

export default function CommunityRulesPage() {
  return (
    <LegalPage title="Topluluk kuralları" updated="Ekim 2026">
      <p>{SITE_NAME} herkesin keyifle okuyup konuşabileceği bir yer olsun diye birkaç basit kuralımız var.</p>
      <ul>
        <li><strong>Saygılı ol.</strong> Hakaret, küfür, aşağılama, nefret söylemi ve kişisel saldırı yok.</li>
        <li>
          <strong>Spoiler&apos;ı işaretle.</strong> Sonraki bölümlerden ya da kaynak eserden bilgi veriyorsan &quot;Spoiler
          içeriyor&quot; kutusunu işaretle.
        </li>
        <li><strong>Reklam ve spam yok.</strong> Başka sitelerin tanıtımı, tekrar eden mesajlar ve anlamsız yorumlar silinir.</li>
        <li><strong>Kişisel bilgi paylaşma.</strong> Kendinin ya da başkalarının telefon, adres gibi bilgilerini yazma.</li>
        <li><strong>Yasa dışı içerik yok.</strong> Müstehcenlik, şiddete çağrı, korsan bağlantı ve benzeri içerikler kaldırılır.</li>
        <li><strong>Konuyla ilgili kal.</strong> Bölüm yorumları o bölüm, seri yorumları o seri hakkında olsun.</li>
      </ul>
      <p>
        Kurallara uymayan bir yorum görürsen yorumun altındaki &quot;Şikâyet et&quot; ile bildir. Kuralları ihlal eden yorumlar
        silinir; tekrarlayan hesaplar yorum ve tepkiye kapatılır.
      </p>
    </LegalPage>
  );
}
