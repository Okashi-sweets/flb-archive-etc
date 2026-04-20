Deno.serve(async (req) => {
  const body = await req.json().catch(() => ({}));
  
  // Discordからの疎通確認（PING）に無条件で応答する
  if (body.type === 1) {
    return Response.json({ type: 1 });
  }

  return new Response("OK");
});