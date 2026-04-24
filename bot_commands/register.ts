import { SlashCommandBuilder, ChatInputCommandInteraction } from "npm:discord.js";
// 判定ロジックだけを別ファイルから読み込む
import { checkraceurl } from "../ts_component/racecheck.ts";

// Discordに表示されるコマンドの設定
export const data = new SlashCommandBuilder()
    .setName("register")
    .setDescription("register race data. url is only accepted racetime.gg and therun.gg")
    .addStringOption(opt => 
        opt.setName("url").setDescription("URL").setRequired(true)
    );

// コマンドが実行された時の具体的な処理
export async function execute(interaction: ChatInputCommandInteraction) {
    const url = interaction.options.getString("url")!;
    
    // racecheck.ts の関数を使って判定
    const report = checkraceurl(url);

    if (report === "INVALID") {
        return await interaction.reply({ content: "Invalid url.", ephemeral: true });
    }else if(report === "REJECT"){
        return await interaction.reply({ content: "not deltarune race.", ephemeral: true })
    }
    // 成功時のみ次の処理（fetchなど）へ
    await interaction.reply(`accepted. `);
}