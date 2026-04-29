import { verify } from "npm:discord-verify/node";
import * as register from "./bot_commands/register.ts";
import * as ping from "./bot_commands/ping.ts";
import * as linkuser from "./bot_commands/linkuser.ts";
import { registerCommands } from "./ts_component/interactions.ts";

const PUBLIC_KEY = Deno.env.get("DISCORD_PUBLIC_KEY")!;
const CLIENT_ID = Deno.env.get("DISCORD_CLIENT_ID")!;
const GUILD_ID = Deno.env.get("DISCORD_GUILD_ID")!;

const commandsList = [register, ping, linkuser];

// コマンド登録
await registerCommands(GUILD_ID, commandsList.map(c => c.data));
console.log("✨ Commands registered!");

Deno.serve(async (req) => {
    if (req.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    const signature = req.headers.get("x-signature-ed25519");
    const timestamp = req.headers.get("x-signature-timestamp");
    const body = await req.text();

    if (!signature || !timestamp) {
        return new Response("Unauthorized", { status: 401 });
    }

    const isValid = await verify(body, signature, timestamp, PUBLIC_KEY, crypto.subtle);
    if (!isValid) {
        return new Response("Unauthorized", { status: 401 });
    }

    const interaction = JSON.parse(body);

    // PING
    if (interaction.type === 1) {
        return Response.json({ type: 1 });
    }

    // オートコンプリート
    if (interaction.type === 4) {
        const command = commandsList.find(c => c.data.name === interaction.data.name);
        if (command && "autocomplete" in command) {
            await (command as typeof linkuser).autocomplete(interaction);
        }
        return new Response(null, { status: 200 });
    }

    // スラッシュコマンド
    if (interaction.type === 2) {
        const command = commandsList.find(c => c.data.name === interaction.data.name);
        if (command) {
            await command.execute(interaction);
        }
        return new Response(null, { status: 200 });
    }

    // コンポーネント（セレクトメニュー・ボタン）
    if (interaction.type === 3) {
        const customId = interaction.data.custom_id as string;
        if (customId.startsWith("register_")) {
            await register.handleComponent(interaction);
        } else if (customId.startsWith("linkuser_")) {
            await linkuser.handleComponent(interaction);
        }
        return new Response(null, { status: 200 });
    }

    return new Response("Unknown interaction type", { status: 400 });
});