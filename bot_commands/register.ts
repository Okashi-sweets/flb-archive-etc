import { checkraceurl } from "../ts_component/racecheck.ts";
import { checkDuplicate, fetchRaceData, saveRaceData } from "../ts_component/saverace.ts";
import { setSession, getSession, deleteSession } from "../ts_component/kv.ts";
import {
    sendInteractionResponse,
    editInteractionResponse,
    ephemeral,
    updateMessage,
    makeSelectMenu,
} from "../ts_component/interactions.ts";
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

export const data = {
    name: "register",
    description: "register race data. url is only accepted racetime.gg and therun.gg",
    options: [
        {
            name: "url",
            description: "URL",
            type: 3,
            required: true,
        },
    ],
};

// /register コマンド実行時
export async function execute(interaction: Record<string, unknown>) {
    const url = (interaction.data as { options: { value: string }[] }).options[0].value;
    const userId = (interaction.member as { user: { id: string } })?.user?.id
        ?? (interaction.user as { id: string })?.id;
    const interactionId = interaction.id as string;
    const token = interaction.token as string;

    const report = checkraceurl(url);
    if (report === "INVALID") {
        return await sendInteractionResponse(interactionId, token, ephemeral("Invalid URL."));
    } else if (report === "REJECT") {
        return await sendInteractionResponse(interactionId, token, ephemeral("Not a Deltarune race."));
    }

    if (await checkDuplicate(url)) {
        return await sendInteractionResponse(interactionId, token, ephemeral("This race was already registered."));
    }

    const fetched = await fetchRaceData(url, report);
    if (fetched === "NOT_FINISHED") {
        return await sendInteractionResponse(interactionId, token, ephemeral("This race isn't finished."));
    }

    // セッションに保存
    await setSession(userId, {
        step: "group",
        url,
        report,
        fetched: fetched!,
        token,
    });

    await sendInteractionResponse(interactionId, token, {
        type: 4,
        data: {
            content: "Select game version.",
            flags: 64,
            components: [makeSelectMenu("register_group", "Select game version.", Object.keys(GROUP_MAP))],
        },
    });
}

// セレクトメニューの応答処理
export async function handleComponent(interaction: Record<string, unknown>) {
    const customId = (interaction.data as { custom_id: string }).custom_id;
    const value = (interaction.data as { values: string[] }).values[0];
    const userId = (interaction.member as { user: { id: string } })?.user?.id
        ?? (interaction.user as { id: string })?.id;
    const interactionId = interaction.id as string;
    const token = interaction.token as string;

    const session = await getSession(userId);
    if (!session) {
        return await sendInteractionResponse(interactionId, token, ephemeral("Session expired. Please run /register again."));
    }

    if (customId === "register_group") {
        const group = GROUP_MAP[value];
        const filtered = cats.filter(c => c.group === group);
        const category1Options = [...new Set(filtered.map(c => c.displaycategory1))];

        await setSession(userId, { ...session, step: "category1", group, groupDisplay: value });
        await sendInteractionResponse(interactionId, token,
            updateMessage(`Game version: **${value}**\nSelect chapter.`, [
                makeSelectMenu("register_category1", "Select chapter.", category1Options),
            ])
        );

    } else if (customId === "register_category1") {
        const filtered = cats.filter(c => c.group === session.group);
        const category2Options = [...new Set(
            filtered.filter(c => c.displaycategory1 === value).map(c => c.displaycategory2)
        )];

        await setSession(userId, { ...session, step: "category2", category1: value });
        await sendInteractionResponse(interactionId, token,
            updateMessage(
                `Game version: **${session.groupDisplay}** / Chapter: **${value}**\nSelect subcategory.`,
                [makeSelectMenu("register_category2", "Select subcategory.", category2Options)]
            )
        );

    } else if (customId === "register_category2") {
        const filtered = cats.filter(c => c.group === session.group);
        const category3Options = [...new Set(
            filtered
                .filter(c => c.displaycategory1 === session.category1 && c.displaycategory2 === value)
                .map(c => c.displaycategory3)
                .filter((c): c is string => !!c)
        )];

        await setSession(userId, { ...session, step: "category3", category2: value });

        if (category3Options.length > 0) {
            await sendInteractionResponse(interactionId, token,
                updateMessage(
                    `Game version: **${session.groupDisplay}** / Chapter: **${session.category1}** / Route: **${value}**\nSelect glitch type.`,
                    [makeSelectMenu("register_category3", "Select glitch type.", category3Options)]
                )
            );
        } else {
            // category3なし → 直接登録
            await sendInteractionResponse(interactionId, token,
                updateMessage(
                    `Game version: **${session.groupDisplay}** / Chapter: **${session.category1}** / Route: **${value}**\nStarting registration...`
                )
            );
            await finishRegistration(session, value, null, userId);
        }

    } else if (customId === "register_category3") {
        await sendInteractionResponse(interactionId, token,
            updateMessage(
                `Game version: **${session.groupDisplay}** / Chapter: **${session.category1}** / Route: **${session.category2}** / **${value}**\nStarting registration...`
            )
        );
        await finishRegistration(session, session.category2!, value, userId);
    }
}

async function finishRegistration(
    session: Awaited<ReturnType<typeof getSession>>,
    category2: string,
    category3: string | null,
    userId: string,
) {
    const entry = cats.find(c =>
        c.group === session!.group &&
        c.displaycategory1 === session!.category1 &&
        c.displaycategory2 === category2 &&
        (category3 ? c.displaycategory3 === category3 : !c.displaycategory3)
    );

    if (!entry) {
        await editInteractionResponse(session!.token, { content: "Category not found.", components: [] });
        await deleteSession(userId);
        return;
    }

    const result = await saveRaceData(session!.url, session!.report, entry.name, session!.fetched);
    await deleteSession(userId);

    if (result === "DUPLICATE") {
        await editInteractionResponse(session!.token, { content: "This race was already registered.", components: [] });
    } else {
        await editInteractionResponse(session!.token, { content: `Registered! ID: \`${result.raceId}\``, components: [] });
    }
}