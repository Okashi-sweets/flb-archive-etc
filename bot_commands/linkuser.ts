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
    discord_id?: string;
}

export const data = {
    name: "linkuser",
    description: "Link racetime, therun, and discord IDs to a user.",
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
    const discordId = (interaction.member as { user: { id: string } })?.user?.id
        ?? (interaction.user as { id: string })?.id;
    const interactionId = interaction.id as string;
    const token = interaction.token as string;

    await sendInteractionResponse(interactionId, token, ephemeral("Processing..."));

    try {
        const { data: userlist, sha } = await readJson("info/userlist.json") as
            { data: User[]; sha: string };

        const index = userlist.findIndex(u => u.id === userId);
        if (index === -1) {
            return await editInteractionResponse(token, { content: "User not found." });
        }

        // 同じユーザーに同じDiscordIDが既に登録済み
        if (userlist[index].discord_id === discordId) {
            return await editInteractionResponse(token, {
                content: `**${userlist[index].name}** is already linked to this Discord account.`,
            });
        }

        // 別ユーザーに既に紐付いている場合はボタンで確認
        const conflict = userlist.find((u, i) => i !== index && u.discord_id === discordId);
        if (conflict) {
            return await editInteractionResponse(token, {
                content: `This Discord account is already linked to **${conflict.name}** \`[${conflict.id}]\`.\nDo you want to reassign it to **${userlist[index].name}**?`,
                components: [{
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 3,
                            label: "Yes, reassign",
                            custom_id: `linkuser_confirm_${userId}_${discordId}`,
                        },
                        {
                            type: 2,
                            style: 4,
                            label: "Cancel",
                            custom_id: "linkuser_cancel",
                        },
                    ],
                }],
            });
        }

        await applyLink(userlist, index, sha, { racetimeId, therunId, discordId });

        const user = userlist[index];
        await editInteractionResponse(token, {
            content:
                `Updated **${user.name}** \`[${user.id}]\`:\n` +
                (racetimeId ? `- racetime\\_id: \`${racetimeId}\`\n` : "") +
                (therunId ? `- therun\\_id: \`${therunId}\`\n` : "") +
                `- discord\\_id: \`${discordId}\``,
        });

    } catch (e) {
        console.error(e);
        await editInteractionResponse(token, { content: "An error occurred." });
    }
}

export async function handleComponent(interaction: Record<string, unknown>) {
    const customId = (interaction.data as { custom_id: string }).custom_id;
    const interactionId = interaction.id as string;
    const token = interaction.token as string;

    if (customId === "linkuser_cancel") {
        return await sendInteractionResponse(interactionId, token, {
            type: 7,
            data: { content: "Cancelled.", components: [] },
        });
    }

    if (customId.startsWith("linkuser_confirm_")) {
        const parts = customId.split("_");
        const userId = parts[2];
        const discordId = parts[3];

        try {
            const { data: userlist, sha } = await readJson("info/userlist.json") as
                { data: User[]; sha: string };

            const index = userlist.findIndex(u => u.id === userId);
            if (index === -1) {
                return await sendInteractionResponse(interactionId, token, {
                    type: 7,
                    data: { content: "User not found.", components: [] },
                });
            }

            // 既存の紐付けを解除
            const conflictIndex = userlist.findIndex((u, i) => i !== index && u.discord_id === discordId);
            if (conflictIndex !== -1) userlist[conflictIndex].discord_id = undefined;

            await applyLink(userlist, index, sha, { discordId });

            await sendInteractionResponse(interactionId, token, {
                type: 7,
                data: {
                    content: `Reassigned! discord\\_id: \`${discordId}\` → **${userlist[index].name}** \`[${userId}]\``,
                    components: [],
                },
            });
        } catch (e) {
            console.error(e);
            await sendInteractionResponse(interactionId, token, {
                type: 7,
                data: { content: "An error occurred.", components: [] },
            });
        }
    }
}

async function applyLink(
    userlist: User[],
    index: number,
    sha: string,
    ids: { racetimeId?: string; therunId?: string; discordId?: string }
) {
    if (ids.racetimeId) userlist[index].racetime_id = ids.racetimeId;
    if (ids.therunId) userlist[index].therun_id = ids.therunId;
    if (ids.discordId) userlist[index].discord_id = ids.discordId;
    await writeJson("info/userlist.json", userlist, sha);
}