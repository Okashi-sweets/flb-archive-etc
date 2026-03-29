export async function discord(message: string) {
    
const url = Deno.env.get("DISCORD_WEBHOOK_URL");

const description = message

await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        embeds: [{
            title: "定例更新進捗",
            description,
        }],
    })
});
}