// R2 bağlantısını test eder: küçük bir dosya yükler, public adresten okur, siler.
// Çalıştırma: npx tsx scripts/r2-check.ts
import { config } from "dotenv";
import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

config({ path: ".env.local" });
const e = process.env;
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${e.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: e.R2_ACCESS_KEY_ID!, secretAccessKey: e.R2_SECRET_ACCESS_KEY! },
});

async function main() {
  const list = await s3.send(new ListObjectsV2Command({ Bucket: e.R2_BUCKET, MaxKeys: 5 }));
  console.log("Bucket erişimi tamam, nesne sayısı (ilk 5):", list.KeyCount);

  const Key = "_test/baglanti.txt";
  await s3.send(new PutObjectCommand({ Bucket: e.R2_BUCKET, Key, Body: "ok", ContentType: "text/plain" }));
  console.log("Yükleme tamam");

  try {
    const r = await fetch(`${e.R2_PUBLIC_URL}/${Key}`, { signal: AbortSignal.timeout(15000) });
    console.log("Public adres:", r.status, await r.text());
  } catch (err) {
    console.log("Public adres okunamadı:", (err as Error).message);
  }

  await s3.send(new DeleteObjectCommand({ Bucket: e.R2_BUCKET, Key }));
  console.log("Silme tamam");
}

main().catch((err) => {
  console.error("HATA:", err.name, err.message);
  process.exit(1);
});
