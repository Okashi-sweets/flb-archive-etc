import { SlashCommandBuilder, ChatInputCommandInteraction } from "npm:discord.js";
import { checkraceurl } from "../ts_component/racecheck.ts";
import { saveRaceData } from "../ts_component/saverace.ts";

export const data = new SlashCommandBuilder()
    .setName("register")
    .setDescription("register race data. url is only accepted racetime.gg and therun.gg")
    .addStringOption(opt =>
        opt.setName("url").setDescription("URL").setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const url = interaction.options.getString("url")!;

    const report = checkraceurl(url);

    if (report === "INVALID") {
        return await interaction.reply({ content: "不正なURLです。", ephemeral: true });
    } else if (report === "REJECT") {
        return await interaction.reply({ content: "Deltaruneのレースではありません。", ephemeral: true });
    }

    await interaction.reply(`${report}として受け付けました。登録処理を開始します...`);

    try {
        const result = await saveRaceData(url, report);

        if (result === "DUPLICATE") {
            await interaction.editReply("既に登録済みのレースです。");
        } else if (result === "NOT_FINISHED") {
            await interaction.editReply("レースがまだ終了していません。");
        } else {
            await interaction.editReply(`登録完了！レースID: \`${result.raceId}\``);
        }
    } catch (e) {
        console.error(e);
        await interaction.editReply("データの保存中にエラーが発生しました。");
    }
}