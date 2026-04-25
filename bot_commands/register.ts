import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    ActionRowBuilder,
    ComponentType,
} from "npm:discord.js";
import { checkraceurl } from "../ts_component/racecheck.ts";
import { checkDuplicate, fetchRaceData, saveRaceData } from "../ts_component/saverace.ts";
import categories from "../info/url.json" with { type: "json" };

type CategoryEntry = {
    name: string;
    group: string;
    displaycategory1: string;
    displaycategory2: string;
    displaycategory3?: string;
};

const cats = categories as CategoryEntry[];

const ABBREVIATIONS: Record<string, string> = {
    "True Pacifist": "TP",
    "Snowgrave": "SG",
};

function abbreviate(label: string): string {
    let result = label;
    for (const [full, short] of Object.entries(ABBREVIATIONS)) {
        result = result.replace(full, short);
    }
    return result;
}

function makeSelectMenu(customId: string, placeholder: string, options: string[]) {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(placeholder)
            .addOptions(options.map(o => ({
                label: abbreviate(o),
                value: o,
            })))
    );
}

const GROUP_MAP: Record<string, string> = {
    "Base Game": "base",
    "Category Extensions": "ce",
};

export const data = new SlashCommandBuilder()
    .setName("register")
    .setDescription("register race data. url is only accepted racetime.gg and therun.gg")
    .addStringOption(opt =>
        opt.setName("url").setDescription("URL").setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const url = interaction.options.getString("url")!;

    // URLチェック
    const report = checkraceurl(url);
    if (report === "INVALID") {
        return await interaction.reply({ content: "Invalid URL.", ephemeral: true });
    } else if (report === "REJECT") {
        return await interaction.reply({ content: "Not a Deltarune race.", ephemeral: true });
    }

    // 重複チェック
    if (await checkDuplicate(url)) {
        return await interaction.reply({ content: "This race was already registered.", ephemeral: true });
    }

    // fetchと終了チェック
    const fetched = await fetchRaceData(url, report);
    if (fetched === "NOT_FINISHED") {
        return await interaction.reply({ content: "This race isn't finished.", ephemeral: true });
    }

    // --- Step 0: group選択 ---
    const row0 = makeSelectMenu("group", "Select game version.", Object.keys(GROUP_MAP));

    const msg = await interaction.reply({
        content: "Select game version.",
        components: [row0],
        ephemeral: true,
        fetchReply: true,
    });

    try {
        const i0 = await msg.awaitMessageComponent({
            componentType: ComponentType.StringSelect,
            filter: i => i.customId === "group" && i.user.id === interaction.user.id,
            time: 60000,
        }) as StringSelectMenuInteraction;
        const groupDisplay = i0.values[0];
        const group = GROUP_MAP[groupDisplay];

        const filtered = cats.filter(c => c.group === group);

        // --- Step 1: category1選択 ---
        const category1Options = [...new Set(filtered.map(c => c.displaycategory1))];
        const row1 = makeSelectMenu("category1", "Select chapter.", category1Options);

        await i0.update({
            content: `Game version: **${groupDisplay}**\nSelect chapter.`,
            components: [row1],
        });

        const i1 = await msg.awaitMessageComponent({
            componentType: ComponentType.StringSelect,
            filter: i => i.customId === "category1" && i.user.id === interaction.user.id,
            time: 60000,
        }) as StringSelectMenuInteraction;
        const category1 = i1.values[0];

        // --- Step 2: category2選択 ---
        const category2Options = [...new Set(
            filtered.filter(c => c.displaycategory1 === category1).map(c => c.displaycategory2)
        )];
        const row2 = makeSelectMenu("category2", "Select subcategory.", category2Options);

        await i1.update({
            content: `Game version: **${groupDisplay}** / Chapter: **${category1}**\nSelect subcategory.`,
            components: [row2],
        });

        const i2 = await msg.awaitMessageComponent({
            componentType: ComponentType.StringSelect,
            filter: i => i.customId === "category2" && i.user.id === interaction.user.id,
            time: 60000,
        }) as StringSelectMenuInteraction;
        const category2 = i2.values[0];

        // --- Step 3: category3選択（存在する場合のみ）---
        const category3Options = [...new Set(
            filtered
                .filter(c => c.displaycategory1 === category1 && c.displaycategory2 === category2)
                .map(c => c.displaycategory3)
                .filter((c): c is string => !!c)
        )];

        let categoryName: string;

        if (category3Options.length > 0) {
            const row3 = makeSelectMenu("category3", "Select glitch type.", category3Options);
            await i2.update({
                content: `Game version: **${groupDisplay}** / Chapter: **${category1}** / Route: **${category2}**\nSelect glitch type.`,
                components: [row3],
            });

            const i3 = await msg.awaitMessageComponent({
                componentType: ComponentType.StringSelect,
                filter: i => i.customId === "category3" && i.user.id === interaction.user.id,
                time: 60000,
            }) as StringSelectMenuInteraction;
            const category3 = i3.values[0];

            const entry = cats.find(c =>
                c.group === group &&
                c.displaycategory1 === category1 &&
                c.displaycategory2 === category2 &&
                c.displaycategory3 === category3
            );

            if (!entry) {
                await i3.update({ content: "Category not found.", components: [] });
                return;
            }
            categoryName = entry.name;
            await i3.update({
                content: `Game version: **${groupDisplay}** / Chapter: **${category1}** / Route: **${category2}** / **${category3}**\nStarting registration...`,
                components: [],
            });

        } else {
            const entry = cats.find(c =>
                c.group === group &&
                c.displaycategory1 === category1 &&
                c.displaycategory2 === category2 &&
                !c.displaycategory3
            );

            if (!entry) {
                await i2.update({ content: "Category not found.", components: [] });
                return;
            }
            categoryName = entry.name;
            await i2.update({
                content: `Game version: **${groupDisplay}** / Chapter: **${category1}** / Route: **${category2}**\nStarting registration...`,
                components: [],
            });
        }

        // --- 登録処理 ---
        const result = await saveRaceData(url, report, categoryName, fetched!);

        if (result === "DUPLICATE") {
            await interaction.editReply({ content: "This race was already registered.", components: [] });
        } else {
            await interaction.editReply({ content: `Registered! ID: \`${result.raceId}\``, components: [] });
        }

    } catch (e) {
        console.error(e);
        await interaction.editReply({ content: "Timed out or an error occurred.", components: [] });
    }
}