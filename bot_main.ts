import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import nacl from "https://cdn.skypack.dev/tweetnacl@v1.0.3?dts";

const PUBLIC_KEY = Deno.env.get("DISCORD_PUBLIC_KEY")!;

async function verifySignature(request: Request) {
  const signature = request.headers.get("X-Signature-Ed25519")!;
  const timestamp = request.headers.get("X-Signature-Timestamp")!;
  const body = await request.text();

  const isVerified = nacl.sign.detached.verify(
    new TextEncoder().encode(timestamp + body),
    new Uint8Array(signature.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))),
    new Uint8Array(PUBLIC_KEY.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)))
  );

  return { isVerified, body: JSON.parse(body) };
}

serve(async (req) => {
  try {
    const { isVerified, body } = await verifySignature(req);
    
    // 署名が正しくない場合は401を返す（これがDiscordには必須）
    if (!isVerified) {
      console.log("認証失敗");
      return new Response("invalid request signature", { status: 401 });
    }

    // PINGへの応答
    if (body.type === 1) {
      console.log("PINGを受信");
      return Response.json({ type: 1 });
    }

    return Response.json({ type: 4, data: { content: "Ready!" } });
  } catch (e) {
    console.log("エラー発生:", e);
    return new Response("Internal Error", { status: 500 });
  }
});