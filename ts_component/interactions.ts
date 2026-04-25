const TOKEN = Deno.env.get("DISCORD_TOKEN")!;
const APPLICATION_ID = Deno.env.get("DISCORD_CLIENT_ID")!;

const BASE = "https://discord.com/api/v10";

function headers() {
    return {
        "Authorization": `Bot ${TOKEN}`,
        "Content-Type": "application/json",
    };
}

export async function sendInteractionResponse(
    interactionId: string,
    interactionToken: string,
    data: unknown
) {
    await fetch(`${BASE}/interactions/${interactionId}/${interactionToken}/callback`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(data),
    });
}

export async function editInteractionResponse(
    interactionToken: string,
    data: unknown
) {
    await fetch(`${BASE}/webhooks/${APPLICATION_ID}/${interactionToken}/messages/@original`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify(data),
    });
}

export function ephemeral(content: string) {
    return {
        type: 4,
        data: { content, flags: 64 },
    };
}

export function updateMessage(content: string, components: unknown[] = []) {
    return {
        type: 7,
        data: { content, components },
    };
}

export function makeSelectMenu(customId: string, placeholder: string, options: string[]) {
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

    return {
        type: 1,
        components: [{
            type: 3,
            custom_id: customId,
            placeholder,
            options: options.map(o => ({
                label: abbreviate(o),
                value: o,
            })),
        }],
    };
}

export function registerCommands(guildId: string, commands: unknown[]) {
    return fetch(`${BASE}/applications/${APPLICATION_ID}/guilds/${guildId}/commands`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify(commands),
    });
}