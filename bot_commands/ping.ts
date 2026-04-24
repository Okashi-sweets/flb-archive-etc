import { SlashCommandBuilder, ChatInputCommandInteraction } from "npm:discord.js";

// コマンドの定義（見た目）
export const data = new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Botの応答速度を確認します");

// コマンドの実行処理（中身）
export async function execute(interaction: ChatInputCommandInteraction) {
    // 1. まず現在の時刻を取得
    const sent = await interaction.reply({ content: "Pinging...", fetchReply: true });
    
    // 2. 応答にかかった時間を計算して編集
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    
    await interaction.editReply(
        `🏓 Pong!\n通信にかかった時間: ${latency}ms\nAPIの応答速度: ${interaction.client.ws.ping}ms`
    );
}