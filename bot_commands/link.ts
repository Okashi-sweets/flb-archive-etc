import { getUserlist } from "../ts_component/kv.ts";
import { readJson, writeJson } from "../ts_component/savetogithub.ts";
import {
    sendInteractionResponse,
    editInteractionResponse,
    ephemeral,
} from "../ts_component/interactions.ts";

interface User {
    id: string;
    name: string;
    banned: boolean;
    racetime_id?: string;
    therun_id?: string;
}

export const data = {
    name: "linkuser",
    description: "Link racetime and therun IDs to a user.",
    options: [
        { name: "user", description: "User name", type: 3, required: true, autocomplete: true },
        { name: "racetime_id", description: "Racetime user ID", type: 3, required: false },
        { name: "therun_id", description: "Therun username", type: 3, required: false },
    ],
};

export async function autocomplete(interaction: Record<string, unknown>) {
    const focused = (interaction.data as { options: { focused?: boolean; value: string }[] })
        .options.find(o => o.focused)?.value ?? "";
    const interactionId = interaction.id as string;
    const token = interaction.token as string;

    try {
        const userlist = await getUserlist();
        const choices = userlist
            .filter(u => !u.banned)
            .filter(u => u.name.toLowerCase().includes(focused.toLowerCase()))
            .slice(0, 25)
            .map(u => ({ name: `${u.name} [${u.id}]`, value: u.id }));

        await sendInteractionResponse(interactionId, token, {
            type: 8,
            data: { choices },
        });
    } catch {
        await sendInteractionResponse(interactionId, token, { type: 8, data: { choices: [] } });
    }
}

export async function execute(interaction: Record<string, unknown>) {
    const options = (interaction.data as { options: { name: string; value: string }[] }).options;
    const userId = options.find(o => o.name === "user")?.value!;
    const racetimeId = options.find(o => o.name === "racetime_id")?.value;
    const therunId = options.find(o => o.name === "therun_id")?.value;
    const interactionId = interaction.id as string;
    const token = interaction.token as string;

    if (!racetimeId && !therunId) {
        return await sendInteractionResponse(interactionId, token,
            ephemeral("Please provide at least one of racetime_id or therun_id.")
        );
    }

    await sendInteractionResponse(interactionId, token, ephemeral("Processing..."));

    try {
        const { data: userlist, sha } = await readJson("info/userlist.json") as
            { data: User[]; sha: string };

        const index = userlist.findIndex(u => u.id === userId);
        if (index === -1) {
            return await editInteractionResponse(token, { content: "User not found." });
        }

        if (racetimeId) userlist[index].racetime_id = racetimeId;
        if (therunId) userlist[index].therun_id = therunId;

        await writeJson("info/userlist.json", userlist, sha);

        const user = userlist[index];
        await editInteractionResponse(token, {
            content:
                `Updated **${user.name}** \`[${user.id}]\`:\n` +
                (racetimeId ? `- racetime_id: \`${racetimeId}\`\n` : "") +
                (therunId ? `- therun_id: \`${therunId}\`` : ""),
        });
    } catch (e) {
        console.error(e);
        await editInteractionResponse(token, { content: "An error occurred." });
    }
}