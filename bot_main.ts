// bot_main.ts (修正版の例)
import nacl from "https://cdn.skypack.dev/tweetnacl@v1.0.3?dts";

const PUBLIC_KEY = Deno.env.get("DISCORD_PUBLIC_KEY");

// 起動時に環境変数チェック（これがないとWarm upで落ちる原因がわかりにくい）
if (!PUBLIC_KEY) {
  throw new Error("DISCORD_PUBLIC_KEY is not set!");
}

async function verifySignature(request: Request) {
  const signature = request.headers.get("X-Signature-Ed25519");
  const timestamp = request.headers.get("X-Signature-Timestamp");
  const body = await request.text();

  if (!signature || !timestamp) return { isVerified: false, body: null };

  try {
    const isVerified = nacl.sign.detached.verify(
      new TextEncoder().encode(timestamp + body),
      new Uint8Array(signature.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))),
      new Uint8Array(PUBLIC_KEY!.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)))
    );
    return { isVerified, body: JSON.parse(body) };
  } catch {
    return { isVerified: false, body: null };
  }
}

// Deno.serve を使用（import不要）
Deno.serve(async (req) => {
  try {
    const { isVerified, body } = await verifySignature(req);
    
    if (!isVerified || !body) {
      return new Response("invalid request signature", { status: 401 });
    }

    if (body.type === 1) {
      return Response.json({ type: 1 });
    }

    return Response.json({ type: 4, data: { content: "Ready!" } });
  } catch (e) {
    console.error("Internal Error:", e);
    return new Response("Internal Error", { status: 500 });
  }
});