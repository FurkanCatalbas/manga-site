import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Kullanım Koşulları", alternates: { canonical: "/kullanim-kosullari" } };

export default function TermsPage() {
  return (
    <LegalPage title="Kullanım koşulları" updated="Ekim 2026">
      <p>
        {SITE_NAME}&apos;yu kullanarak ve hesap açarak bu koşulları kabul etmiş olursun. Kişisel verilerinle ilgili ayrıntılar{" "}
        <Link href="/gizlilik" className="font-semibold underline">gizlilik ve KVKK metnindedir</Link>.
      </p>

      <h2>Hesap</h2>
      <ul>
        <li>Hesap açmak için en az 13 yaşında olmalısın; 18 yaşından küçüksen velinin iznini almalısın.</li>
        <li>Hesabının güvenliğinden ve hesabınla yapılan paylaşımlardan sen sorumlusun.</li>
        <li>Hesabını istediğin zaman profil sayfasından silebilirsin.</li>
      </ul>

      <h2>Paylaştığın içerik</h2>
      <ul>
        <li>
          Yorumların sana aittir; sitede gösterilmesi için bize ücretsiz ve süresiz bir kullanım izni vermiş olursun.
          Hesabını silince yorumların da silinir.
        </li>
        <li>
          <Link href="/topluluk-kurallari" className="font-semibold underline">Topluluk kurallarına</Link> aykırı içerikler
          uyarı yapılmadan kaldırılabilir; kuralları tekrar tekrar ihlal eden hesaplar engellenebilir.
        </li>
        <li>Hukuka aykırı içerik bildirimlerini 5651 sayılı Kanun kapsamında inceler, gerekirse içeriği kaldırırız.</li>
      </ul>

      <h2>Telif hakkı bildirimleri</h2>
      <p>
        Sitedeki bir içeriğin telif hakkını ihlal ettiğini düşünüyorsan, hak sahibi olduğunu gösteren bilgilerle ve ilgili
        sayfanın adresiyle <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold underline">{CONTACT_EMAIL}</a>{" "}
        adresine yaz. Bildirim incelenir ve haklı bulunursa içerik kaldırılır.
      </p>

      <h2>Sorumluluk</h2>
      <p>
        Site olduğu gibi sunulur; kesintisiz ya da hatasız çalışacağı garanti edilmez. Koşullar güncellenebilir; önemli
        değişiklikler sitede duyurulur.
      </p>
    </LegalPage>
  );
}
