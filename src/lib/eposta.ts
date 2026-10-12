// E-posta gönderimi (yalnızca sunucuda): hesap doğrulama ve şifre sıfırlama.
// Resend HTTP API'si kullanılır (paket gerekmez). RESEND_API_KEY yoksa e-posta ile kayıt kapalıdır;
// yerel testte AUTH_DEV_EMAIL=1 ile açılır ve e-postalar sunucu günlüğüne yazılır.
import { SITE_NAME } from "@/lib/site";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Resend'de doğrulanmış alan adından gönderilmeli
const FROM = process.env.EMAIL_FROM ?? `${SITE_NAME} <bildirim@webtooku.com.tr>`;
const DEV = process.env.AUTH_DEV_EMAIL === "1";

/** E-posta ile kayıt ve şifre sıfırlama kullanılabilir mi? */
export const emailEnabled = !!RESEND_API_KEY || DEV;
/** Gerçekten e-posta gidiyor mu? (Gitmiyorsa doğrulama zorunlu tutulmaz) */
export const emailDelivers = !!RESEND_API_KEY;

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Tek düğmeli sade e-posta. */
export async function sendActionEmail(to: string, subject: string, intro: string, button: string, url: string) {
  const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px;color:#111">
<p style="font-size:20px;font-weight:800;margin:0 0 16px">${SITE_NAME}</p>
<p style="font-size:15px;line-height:1.6">${escape(intro)}</p>
<p style="margin:24px 0"><a href="${escape(url)}" style="background:#ff4f8b;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">${escape(button)}</a></p>
<p style="font-size:12px;color:#666;line-height:1.5">Düğme çalışmazsa bu adresi tarayıcına yapıştır:<br>${escape(url)}</p>
<p style="font-size:12px;color:#666">Bu isteği sen yapmadıysan e-postayı yok sayabilirsin.</p></div>`;
  const text = `${intro}\n\n${button}: ${url}\n\nBu isteği sen yapmadıysan e-postayı yok sayabilirsin.`;

  if (!RESEND_API_KEY) {
    console.info(`[e-posta: ${to}] ${subject}\n${text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html, text }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`E-posta gönderilemedi (${res.status}): ${await res.text()}`);
}
