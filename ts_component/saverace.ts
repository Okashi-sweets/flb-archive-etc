import { readJson, writeJson } from "./savetogithub.ts";
import { generateRaceId } from "./generate_id.ts";
import categories from "../info/url.json" with { type: "json" };

interface RaceEntry {
    id: string;
    url: string;
}

interface RaceList {
    races: RaceEntry[];
}

interface CategoryEntry {
    name: string;
    group: string;
    displaycategory1: string;
    displaycategory2: string;
    displaycategory3?: string;
}

function parseFinishTime(duration: string): number {
    const match = duration.match(/P0DT(\d+)H(\d+)M([\d.]+)S/);
    if (!match) return 0;
    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const seconds = parseFloat(match[3]);
    return Math.floor(hours * 3600 + minutes * 60 + seconds);
}

export async function checkDuplicate(url: string) {
    const { data: racelist } = await readJson("info/racelist.json") as
        { data: RaceList; sha: string };
    return racelist.races.some((r) => r.url === url);
}

export async function fetchRaceData(url: string, source: string) {
    if (source === "RACETIME") {
        const path = new URL(url).pathname;
        const res = await fetch("https://racetime.gg" + path + "/data");
        const raw = await res.json();

        if (raw.status.value !== "finished") return "NOT_FINISHED";

        const entrants = raw.entrants.map((e: {
            user: { id: string; name: string };
            status: { value: string };
            finish_time: string | null;
        }) => ({
            id: e.user.id,
            name: e.user.name,
            finish_time: e.status.value === "done" ? parseFinishTime(e.finish_time!) : null,
        }));

        return {
            endedAt: new Date(raw.ended_at).toISOString(),
            entrants,
        };

    } else if (source === "THERUN") {
        const raceId = new URL(url).pathname.split("/").pop();
        const res = await fetch("https://races.therun.gg/" + raceId);
        const raw = await res.json();
        const data = raw.result;

        if (data.status !== "finished") return "NOT_FINISHED";

        const entrants = data.results.map((e: {
            name: string;
            status: string;
            finalTime: number | null;
        }) => ({
            id: e.name,
            name: e.name,
            finish_time: e.status === "confirmed" && e.finalTime ? Math.floor(e.finalTime / 1000) : null,
        }));

        return {
            endedAt: new Date(data.endTime).toISOString(),
            entrants,
        };
    }
}

export async function saveRaceData(
    url: string,
    source: string,
    categoryName: string,
    raceData: { endedAt: string; entrants: unknown[] }
) {
    const { data: racelist, sha: racelistSha } = await readJson("info/racelist.json") as
        { data: RaceList; sha: string };

    // 二重登録防止
    if (racelist.races.some((r) => r.url === url)) {
        return "DUPLICATE";
    }

    const entry = (categories as CategoryEntry[]).find(c => c.name === categoryName)!;
    const categoryInfo = {
        category: categoryName,
        displaycategory1: entry.displaycategory1,
        displaycategory2: entry.displaycategory2,
        ...(entry.displaycategory3 ? { displaycategory3: entry.displaycategory3 } : {}),
    };

    let raceId: string;
    do {
        raceId = generateRaceId();
    } while (racelist.races.some((r) => r.id === raceId));

    await writeJson(`racedata/${raceId}.json`, {
        id: raceId,
        url,
        source,
        ...categoryInfo,
        registeredAt: new Date().toISOString(),
        ...raceData,
    });

    racelist.races.push({ id: raceId, url });
    await writeJson("info/racelist.json", racelist, racelistSha);

    return { status: "OK", raceId };
}