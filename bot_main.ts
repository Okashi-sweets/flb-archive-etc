console.log("--- Denoプログラムを開始します ---");

import { Client, GatewayIntentBits, REST, Routes } from "npm:discord.js";
// 各コマンドファイルをインポート
import * as register from "./bot_commands/register.ts";
import * as ping from "./bot_commands/ping.ts";

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

// 管理しやすいように配列にまとめる
const commandsList = [register, ping];

// --- コマンドの登録処理 ---
client.once("ready", async () => {
    console.log(`✅ Ready! ${client.user?.tag} としてログインしました。`);

    // rest はここで定義すると確実です
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    try {
        console.log("⏳ スラッシュコマンドを登録中...");
        const body = commandsList.map(cmd => cmd.data.toJSON());
        
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), 
            { body }
        );
        console.log("✨ テストサーバーへの登録が完了しました！");
    } catch (error) {
        console.error("❌ 登録中にエラーが発生しました:", error);
    }
});

// --- コマンドの受信・振り分け ---
client.on("interactionCreate", async (interaction) => {

  console.log("インタラクションを受信しました:", interaction.type);

    if (!interaction.isChatInputCommand()) return;

    console.log("実行されたコマンド名:", interaction.commandName);

    // 実行されたコマンド名と一致するファイルを配列から探す
    const command = commandsList.find(cmd => cmd.data.name === interaction.commandName);

    if (command) {
        try {
            // 見つかったファイルの 'execute' 関数を実行する
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: "実行中にエラーが発生しました。", ephemeral: true });
        }
    }
});

client.login(TOKEN);