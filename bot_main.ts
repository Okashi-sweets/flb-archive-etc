console.log("--- Denoプログラムを開始します ---");

import { Client, GatewayIntentBits, REST, Routes } from "npm:discord.js";
import * as register from "./bot_commands/register.ts";
import * as linkuser from "./bot_commands/link.ts"

const TOKEN = Deno.env.get("DISCORD_TOKEN");
const CLIENT_ID = Deno.env.get("DISCORD_CLIENT_ID");
const GUILD_ID = Deno.env.get("DISCORD_GUILD_ID");

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error("エラー: .env の設定が足りません。");
    console.log(`TOKEN: ${TOKEN ? "OK" : "MISSING"}`);
    console.log(`CLIENT_ID: ${CLIENT_ID ? "OK" : "MISSING"}`);
    console.log(`GUILD_ID: ${GUILD_ID ? "OK" : "MISSING"}`);
    Deno.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commandsList = [register, linkuser];

client.once("ready", async () => {
    console.log(`✅ Ready! ${client.user?.tag} としてログインしました。`);

    const rest = new REST({ version: "10" }).setToken(TOKEN);

    try {
        console.log("⏳ 既存コマンドを削除中...");
        // 一度空にして強制リセット
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: [] }
        );
        console.log("🗑️ 削除完了");

        console.log("⏳ スラッシュコマンドを登録中...");
        const body = commandsList.map(cmd => cmd.data.toJSON());
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body }
        );
        console.log("✨ 登録完了！");
    } catch (error) {
        console.error("❌ エラー:", error);
    }
});

client.on("interactionCreate", async (interaction) => {
    console.log("インタラクションを受信しました:", interaction.type);
    if (interaction.isAutocomplete()) {
    const command = commandsList.find(cmd => cmd.data.name === interaction.commandName);
    if (command && "autocomplete" in command) {
        try {
            await (command as { autocomplete: (i: typeof interaction) => Promise<void> }).autocomplete(interaction);
        } catch (error) {
            console.error("❌ オートコンプリートエラー:", error);
        }
    }
    return;
}

    if (!interaction.isChatInputCommand()) return;

    console.log("実行されたコマンド名:", interaction.commandName);

    const command = commandsList.find(cmd => cmd.data.name === interaction.commandName);

    if (command) {
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: "実行中にエラーが発生しました。", ephemeral: true });
        }
    }
});

client.login(TOKEN);