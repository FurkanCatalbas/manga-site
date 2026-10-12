import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Gizlilik Politikası ve KVKK Aydınlatma Metni",
  alternates: { canonical: "/gizlilik" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Gizlilik ve KVKK aydınlatma metni" updated="Ekim 2026">
      <p>
        Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında, {SITE_NAME} (&quot;site&quot;) olarak
        hangi kişisel verileri neden işlediğimizi ve haklarını anlatır. Veri sorumlusu site işletmecisidir; başvurular için
        adres: <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold underline">{CONTACT_EMAIL}</a>.
      </p>

      <h2>Hangi verileri işliyoruz?</h2>
      <ul>
        <li>
          <strong>Hesap bilgileri:</strong> adın, e-posta adresin, kullanıcı adın; Google ile girersen Google&apos;ın verdiği
          profil fotoğrafın. E-postayla kayıtta şifren yalnızca geri döndürülemez özet (hash) olarak saklanır.
        </li>
        <li><strong>Paylaştıkların:</strong> yorumların, beğenilerin, bölüm tepkilerin ve şikâyet bildirimlerin.</li>
        <li>
          <strong>Güvenlik bilgileri:</strong> oturum açtığında IP adresin ve tarayıcı bilgin oturum kaydında tutulur
          (hesabını korumak ve kötüye kullanımı önlemek için).
        </li>
        <li>
          <strong>Okunma sayacı:</strong> bir bölümün aynı gün iki kez sayılmaması için IP adresinin günlük, tuzlanmış ve geri
          döndürülemez özeti en fazla iki gün tutulur; IP adresinin kendisi saklanmaz.
        </li>
        <li>
          <strong>Ziyaret istatistikleri:</strong> hangi sayfaların okunduğu çerez kullanmayan, kişiyi tanımlamayan Vercel Web
          Analytics ile ölçülür.
        </li>
        <li>
          <strong>Cihazındaki veriler:</strong> okuma geçmişin ve kütüphanen tarayıcında (localStorage) durur, giriş yapınca
          oturum çerezi kullanılır. Reklam ya da takip çerezi kullanmıyoruz.
        </li>
      </ul>

      <h2>Neden işliyoruz? (hukuki sebepler)</h2>
      <ul>
        <li>Hesabını açmak, girişini sağlamak ve yorum/tepki özelliklerini sunmak (sözleşmenin kurulması ve ifası, KVKK m. 5/2-c).</li>
        <li>Siteyi ve kullanıcıları kötüye kullanıma karşı korumak, şikâyetleri incelemek (meşru menfaat, m. 5/2-f).</li>
        <li>Yasal yükümlülüklerimizi yerine getirmek ve yetkili makamların taleplerini karşılamak (m. 5/2-ç).</li>
      </ul>

      <h2>Kimlerle paylaşılıyor?</h2>
      <p>
        Verilerin satılmaz ve reklam için kullanılmaz. Site, hizmeti sunabilmek için şu altyapı sağlayıcılarını kullanır ve
        veriler bu kapsamda yurt dışındaki sunuculara aktarılabilir (KVKK m. 9): Vercel (barındırma ve istatistik), Neon
        (veritabanı), Cloudflare (görsel depolama), Google (Google ile giriş seçersen) ve Resend (doğrulama ve şifre e-postaları).
        Yasal zorunluluk hâlinde yetkili kurumlarla paylaşılabilir.
      </p>

      <h2>Ne kadar süre saklanıyor?</h2>
      <p>
        Hesap bilgilerin ve paylaştıkların hesabını silene kadar saklanır. Profil sayfasındaki &quot;Hesabımı sil&quot; ile
        hesabın, yorumların, beğenilerin ve tepkilerin kalıcı olarak silinir. Oturum kayıtları süresi dolunca silinir.
      </p>

      <h2>Hakların (KVKK m. 11)</h2>
      <p>
        Verilerinin işlenip işlenmediğini öğrenme, bilgi isteme, düzeltilmesini ya da silinmesini isteme, aktarıldığı
        üçüncü kişileri öğrenme, itiraz etme ve zararının giderilmesini isteme hakkın var. Taleplerini{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold underline">{CONTACT_EMAIL}</a> adresine
        yazabilirsin; en geç 30 gün içinde yanıtlanır.
      </p>
    </LegalPage>
  );
}
