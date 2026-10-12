// Better Auth uç noktaları: giriş, kayıt, Google dönüşü, oturum, şifre sıfırlama… (/api/auth/*)
import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/hesap";

const closed = () => Response.json({ message: "Hesaplar henüz açık değil." }, { status: 404 });

export async function GET(request: Request) {
  const auth = getAuth();
  return auth ? toNextJsHandler(auth).GET(request) : closed();
}

export async function POST(request: Request) {
  const auth = getAuth();
  return auth ? toNextJsHandler(auth).POST(request) : closed();
}
