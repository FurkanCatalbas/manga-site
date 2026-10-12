// Cloudflare R2 (S3 uyumlu) görsel deposu.
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const env = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`${name} tanımlı değil.`);
  return v;
};

let client: S3Client | undefined;
function s3() {
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env("R2_ACCESS_KEY_ID"),
      secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

export function publicUrl(key: string) {
  const base = env("R2_PUBLIC_URL").trim().replace(/\/$/, "");
  // Değer tam adres değilse (ör. yanlışlıkla "R2_BUCKET" yazılmışsa) adres sitenin kendi alan adına
  // göre çözülür ve görsel açılmaz. Yanlış adresi veritabanına yazmaktansa yüklemeyi durdur.
  if (!/^https:\/\/[^/]+/.test(base)) {
    throw new Error(`R2_PUBLIC_URL tam bir adres olmalı (ör. https://cdn.webtooku.com.tr), şu an: "${base}"`);
  }
  return `${base}/${key}`;
}

export async function putObject(key: string, body: Uint8Array, contentType: string) {
  await s3().send(
    new PutObjectCommand({
      Bucket: env("R2_BUCKET"),
      Key: key,
      Body: body,
      ContentType: contentType,
      // Dosya adları rastgele ek içerdiği için içerik hiç değişmez, uzun süre önbelleklenebilir
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

/** Verilen önekle başlayan tüm nesneleri siler (ör. bir bölümün tüm sayfaları). */
export async function deletePrefix(prefix: string) {
  const Bucket = env("R2_BUCKET");
  let ContinuationToken: string | undefined;
  do {
    const list = await s3().send(new ListObjectsV2Command({ Bucket, Prefix: prefix, ContinuationToken }));
    const keys = (list.Contents ?? []).flatMap((o) => (o.Key ? [{ Key: o.Key }] : []));
    if (keys.length) {
      await s3().send(new DeleteObjectsCommand({ Bucket, Delete: { Objects: keys } }));
    }
    ContinuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (ContinuationToken);
}
