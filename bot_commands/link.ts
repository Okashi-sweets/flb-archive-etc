import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    AutocompleteInteraction,
} from "npm:discord.js";
import { readJson, writeJson } from "../ts_component/savetogithub.ts";

interface User {
    id: string;
    name: string;
    banned: boolean;
    racetime_id?: string;
    therun_id?: string;
}

export const data = new SlashCommandBuilder()
    .setName("linkuser")
    .setDescription("Link racetime and therun IDs to a user.")
    .addStringOption(opt =>
        opt.setName("user").setDescription("User name").setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(opt =>
        opt.setName("racetime_id").setDescription("Racetime user ID")
    )
    .addStringOption(opt =>
        opt.setName("therun_id").setDescription("Therun username")
    );

export async function autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused();

    try {
        const { data: userlist } = await readJson("info/userlist.json") as
            { data: User[]; sha: string };

        const choices = userlist
            .filter(u => u.name.toLowerCase().includes(focused.toLowerCase()))
            .filter(u => !u.banned)
            .slice(0, 25)
            .map(u => ({
                name: `${u.name} [${u.id}]`,
                value: u.id,
            }));

        await interaction.respond(choices);
    } catch {
        await interaction.respond([]);
    }
}

export async function execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.options.getString("user")!;
    const racetimeId = interaction.options.getString("racetime_id");
    const therunId = interaction.options.getString("therun_id");

    if (!racetimeId && !therunId) {
        return await interaction.reply({
            content: "Please provide at least one of racetime_id or therun_id.",
            ephemeral: true,
        });
    }

    await interaction.reply({ content: "Processing...", ephemeral: true });

    try {
        const { data: userlist, sha } = await readJson("info/userlist.json") as
            { data: User[]; sha: string };

        const index = userlist.findIndex(u => u.id === userId);
        if (index === -1) {
            return await interaction.editReply("User not found.");
        }

        if (racetimeId) userlist[index].racetime_id = racetimeId;
        if (therunId) userlist[index].therun_id = therunId;

        await writeJson("info/userlist.json", userlist, sha);

        const user = userlist[index];
        await interaction.editReply(
            `Updated **${user.name}** \`[${user.id}]\`:\n` +
            (racetimeId ? `- racetime_id: \`${racetimeId}\`\n` : "") +
            (therunId ? `- therun_id: \`${therunId}\`` : "")
        );

    } catch (e) {
        console.error(e);
        await interaction.editReply("An error occurred.");
    }
}