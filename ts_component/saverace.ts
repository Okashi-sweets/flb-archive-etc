import { readJson, writeJson } from "./savetogithub.ts";
import { generateRaceId } from "./generate_id.ts";

interface RaceEntry {
    id: string;
    url: string;
}

interface RaceList {
    races: RaceEntry[];
}

function parseFinishTime(duration: string): number {
    const match = duration.match(/P0DT(\d+)H(\d+)M([\d.]+)S/);
    if (!match) return 0;
    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const seconds = parseFloat(match[3]);
    return Math.floor(hours * 3600 + minutes * 60 + seconds);
}

export async function saveRaceData(url: string, source: string) {
    const { data: racelist, sha: racelistSha } = await readJson("info/racelist.json") as
        { data: RaceList; sha: string };

    // 1. 重複チェック
    if (racelist.races.some((r) => r.url === url)) {
        return "DUPLICATE";
    }

    // 2. fetch＆整形
    let raceData: unknown;
    if (source === "RACETIME") {
        const path = new URL(url).pathname;
        const res = await fetch("https://racetime.gg" + path + "/data");
        const raw = await res.json();

        if (raw.status.value !== "finished") {
            return "NOT_FINISHED";
        }

        const entrants = raw.entrants.map((e: {
            user: { id: string; name: string };
            status: { value: string };
            finish_time: string | null;
        }) => ({
            id: e.user.id,
            name: e.user.name,
            finish_time: e.status.value === "done" ? parseFinishTime(e.finish_time!) : null,
        }));

        raceData = { entrants };

    } else if (source === "THERUN") {
        const raceId = new URL(url).pathname.split("/").pop();
        const res = await fetch("https://races.therun.gg/" + raceId);
        const raw = await res.json();
        raceData = raw; // 整形処理をここに
    }

    // 3. ID生成（被り防止）
    let raceId: string;
    do {
        raceId = generateRaceId();
    } while (racelist.races.some((r) => r.id === raceId));

    // 4. racedata/{id}.json に保存
    await writeJson(`racedata/${raceId}.json`, {
        id: raceId,
        url,
        source,
        registeredAt: new Date().toISOString(),
        ...raceData,
    });

    // 5. racelist.json にidとurlのみ追加
    racelist.races.push({ id: raceId, url });
    await writeJson("info/racelist.json", racelist, racelistSha);

    return { status: "OK", raceId };
}