import {
    sendInteractionResponse,
    editInteractionResponse,
    ephemeral,
} from "../ts_component/interactions.ts";
import { readJson, writeJson } from "../ts_component/savetogithub.ts";
import { setScheduleSession, getScheduleSession, deleteScheduleSession } from "../ts_component/kv.ts";
import { generateRaceId } from "../ts_component/generate_id.ts";
import categories from "../info/url.json" with { type: "json" };

type CategoryEntry = {
    name: string;
    group: string;
    displaycategory1: string;
    displaycategory2: string;
    displaycategory3?: string;
};

const cats = categories as CategoryEntry[];

const GROUP_MAP: Record<string, string> = {
    "Base Game": "base",
    "Category Extensions": "ce",
};

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

function toDiscordTimestamp(isoString: string): string {
    const unix = Math.floor(new Date(isoString).getTime() / 1000);
    return `<t:${unix}:F>`;
}

export const data = {
    name: "schedule",
    description: "Add a schedule entry.",
    options: [
        {
            name: "timestamp",
            description: "Unix timestamp or Discord timestamp (e.g. 1234567890 or <t:1234567890>)",
            type: 3,
            required: true,
        },
    ],
};

export async function execute(interaction: Record<string, unknown>) {
    const options = (interaction.data as { options: { name: string; value: string }[] }).options;
    const input = options.find(o => o.name === "timestamp")?.value!;
    const interactionId = interaction.id as string;
    const token = interaction.token as string;
    const userId = (interaction.member as { user: { id: string } })?.user?.id
        ?? (interaction.user as { id: string })?.id;

    const match = input.match(/<t:(\d+)(?::[tTdDfFR])?>/) ?? input.match(/^(\d+)$/);
    if (!match) {
        return await sendInteractionResponse(interactionId, token,
            ephemeral("Invalid format. Please use a Unix timestamp or Discord timestamp like `<t:1234567890>`.\nYou can generate one at https://hammertime.cyou")
        );
    }

    const unixTimestamp = parseInt(match[1]);
    const datetime = new Date(unixTimestamp * 1000);

    if (isNaN(datetime.getTime())) {
        return await sendInteractionResponse(interactionId, token,
            ephemeral("Invalid timestamp.")
        );
    }

    if (datetime < new Date()) {
        return await sendInteractionResponse(interactionId, token,
            ephemeral("The datetime must be in the future.")
        );
    }

    await setScheduleSession(userId, {
        step: "type",
        datetime: datetime.toISOString(),
        token,
    });

    await sendInteractionResponse(interactionId, token, {
        type: 4,
        data: {
            content: `Datetime: <t:${unixTimestamp}:F>\nSelect type.`,
            flags: 64,
            components: [{
                type: 1,
                components: [
                    { type: 2, style: 1, label: "Race", custom_id: "schedule_type_race" },
                    { type: 2, style: 1, label: "Bingo", custom_id: "schedule_type_bingo" },
                    { type: 2, style: 1, label: "Event", custom_id: "schedule_type_event" },
                ],
            }],
        },
    });
}

export async function handleComponent(interaction: Record<string, unknown>) {
    const customId = (interaction.data as { custom_id: string }).custom_id;
    const interactionId = interaction.id as string;
    const token = interaction.token as string;
    const userId = (interaction.member as { user: { id: string } })?.user?.id
        ?? (interaction.user as { id: string })?.id;

    const session = await getScheduleSession(userId);
    if (!session) {
        return await sendInteractionResponse(interactionId, token, {
            type: 7,
            data: { content: "Session expired. Please run /schedule again.", components: [] },
        });
    }

    const discordTs = toDiscordTimestamp(session.datetime);

    if (customId === "schedule_type_bingo") {
        await deleteScheduleSession(userId);
        await saveSchedule({ type: "bingo", datetime: session.datetime });
        return await sendInteractionResponse(interactionId, token, {
            type: 7,
            data: { content: `Bingo scheduled for ${discordTs}!`, components: [] },
        });
    }

    if (customId === "schedule_type_event") {
        return await sendInteractionResponse(interactionId, token, {
            type: 9,
            data: {
                custom_id: "schedule_event_modal",
                title: "Event Details",
                components: [
                    {
                        type: 1,
                        components: [{
                            type: 4,
                            custom_id: "event_name",
                            label: "Event Name",
                            style: 1,
                            required: true,
                            max_length: 100,
                        }],
                    },
                    {
                        type: 1,
                        components: [{
                            type: 4,
                            custom_id: "event_url",
                            label: "Stream URL",
                            style: 1,
                            required: true,
                            max_length: 200,
                        }],
                    },
                ],
            },
        });
    }

    if (customId === "schedule_type_race") {
        await setScheduleSession(userId, { ...session, step: "group", type: "race" });
        return await sendInteractionResponse(interactionId, token, {
            type: 7,
            data: {
                content: `Datetime: ${discordTs}\nSelect game version.`,
                components: [makeSelectMenu("schedule_group", "Select game version.", Object.keys(GROUP_MAP))],
            },
        });
    }

    if (customId === "schedule_group") {
        const value = (interaction.data as { values: string[] }).values[0];
        const group = GROUP_MAP[value];
        const filtered = cats.filter(c => c.group === group);
        const category1Options = [...new Set(filtered.map(c => c.displaycategory1))];

        await setScheduleSession(userId, { ...session, step: "category1", group, groupDisplay: value });
        return await sendInteractionResponse(interactionId, token, {
            type: 7,
            data: {
                content: `Game version: **${value}**\nSelect chapter.`,
                components: [makeSelectMenu("schedule_category1", "Select chapter.", category1Options)],
            },
        });
    }

    if (customId === "schedule_category1") {
        const value = (interaction.data as { values: string[] }).values[0];
        const filtered = cats.filter(c => c.group === session.group);
        const category2Options = [...new Set(
            filtered.filter(c => c.displaycategory1 === value).map(c => c.displaycategory2)
        )];

        await setScheduleSession(userId, { ...session, step: "category2", category1: value });
        return await sendInteractionResponse(interactionId, token, {
            type: 7,
            data: {
                content: `Game version: **${session.groupDisplay}** / Chapter: **${value}**\nSelect subcategory.`,
                components: [makeSelectMenu("schedule_category2", "Select subcategory.", category2Options)],
            },
        });
    }

    if (customId === "schedule_category2") {
        const value = (interaction.data as { values: string[] }).values[0];
        const filtered = cats.filter(c => c.group === session.group);
        const category3Options = [...new Set(
            filtered
                .filter(c => c.displaycategory1 === session.category1 && c.displaycategory2 === value)
                .map(c => c.displaycategory3)
                .filter((c): c is string => !!c)
        )];

        await setScheduleSession(userId, { ...session, step: "category3", category2: value });

        if (category3Options.length > 0) {
            return await sendInteractionResponse(interactionId, token, {
                type: 7,
                data: {
                    content: `Game version: **${session.groupDisplay}** / Chapter: **${session.category1}** / Route: **${value}**\nSelect glitch type.`,
                    components: [makeSelectMenu("schedule_category3", "Select glitch type.", category3Options)],
                },
            });
        } else {
            const entry = cats.find(c =>
                c.group === session.group &&
                c.displaycategory1 === session.category1 &&
                c.displaycategory2 === value &&
                !c.displaycategory3
            );
            if (!entry) {
                await deleteScheduleSession(userId);
                return await sendInteractionResponse(interactionId, token, {
                    type: 7,
                    data: { content: "Category not found.", components: [] },
                });
            }
            await deleteScheduleSession(userId);
            await saveSchedule({
                type: "race",
                datetime: session.datetime,
                category: entry.name,
                displaycategory1: entry.displaycategory1,
                displaycategory2: entry.displaycategory2,
            });
            return await sendInteractionResponse(interactionId, token, {
                type: 7,
                data: {
                    content: `Race scheduled!\nGame version: **${session.groupDisplay}** / Chapter: **${session.category1}** / Route: **${value}**\nDatetime: ${discordTs}`,
                    components: [],
                },
            });
        }
    }

    if (customId === "schedule_category3") {
        const value = (interaction.data as { values: string[] }).values[0];
        const entry = cats.find(c =>
            c.group === session.group &&
            c.displaycategory1 === session.category1 &&
            c.displaycategory2 === session.category2 &&
            c.displaycategory3 === value
        );
        if (!entry) {
            await deleteScheduleSession(userId);
            return await sendInteractionResponse(interactionId, token, {
                type: 7,
                data: { content: "Category not found.", components: [] },
            });
        }
        await deleteScheduleSession(userId);
        await saveSchedule({
            type: "race",
            datetime: session.datetime,
            category: entry.name,
            displaycategory1: entry.displaycategory1,
            displaycategory2: entry.displaycategory2,
            displaycategory3: entry.displaycategory3,
        });
        return await sendInteractionResponse(interactionId, token, {
            type: 7,
            data: {
                content: `Race scheduled!\nGame version: **${session.groupDisplay}** / Chapter: **${session.category1}** / Route: **${session.category2}** / **${value}**\nDatetime: ${discordTs}`,
                components: [],
            },
        });
    }
}

export async function handleModal(interaction: Record<string, unknown>) {
    const interactionId = interaction.id as string;
    const token = interaction.token as string;
    const userId = (interaction.member as { user: { id: string } })?.user?.id
        ?? (interaction.user as { id: string })?.id;

    const components = (interaction.data as { components: { components: { custom_id: string; value: string }[] }[] }).components;
    const eventName = components[0].components.find(c => c.custom_id === "event_name")?.value!;
    const eventUrl = components[1].components.find(c => c.custom_id === "event_url")?.value!;

    const session = await getScheduleSession(userId);
    if (!session) {
        return await sendInteractionResponse(interactionId, token,
            ephemeral("Session expired. Please run /schedule again.")
        );
    }

    const discordTs = toDiscordTimestamp(session.datetime);

    await deleteScheduleSession(userId);
    await saveSchedule({
        type: "event",
        datetime: session.datetime,
        name: eventName,
        url: eventUrl,
    });

    await sendInteractionResponse(interactionId, token, {
        type: 4,
        data: {
            content: `Event **${eventName}** scheduled!\nStream: ${eventUrl}\nDatetime: ${discordTs}`,
            flags: 64,
        },
    });
}

async function saveSchedule(entry: Record<string, unknown>) {
    const { data: schedule, sha } = await readJson("info/schedule.json") as
        { data: { schedules: Record<string, unknown>[] }; sha: string };

    const id = generateRaceId();
    schedule.schedules.push({ id, ...entry });
    await writeJson("info/schedule.json", schedule, sha);
}