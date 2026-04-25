import { loadjson, savejson } from "./ts_component/json.ts";

export async function gene_user() {

const userlist = await loadjson("./info/userlist.json");
const leaderboardsDir = "./leaderboard/";
const counter = await loadjson("./info/toptimes.json");
const racelist = await loadjson("./info/racelist.json");

// racedata を全件読み込み
const allRaceData = new Map();
for (const race of racelist.races) {
    try {
        const content = await loadjson(`./racedata/${race.id}.json`);
        allRaceData.set(race.id, content);
    } catch {
        console.error(`レースデータ読み込み失敗: ${race.id}`);
    }
}

const allLeaderboards = new Map();
for (const item of counter) {
    const cat = item.category;
    try {
        const content = await loadjson(`${leaderboardsDir}${cat}.json`);
        allLeaderboards.set(cat, content);
    } catch (e) {
        console.error(`読み込み失敗: ${cat}`);
    }
}

for (let i = 0; i < userlist.length; i++) {
    const userid = userlist[i].id;
    const username = userlist[i].name;
    const banned = userlist[i].banned;
    const racetime_id = userlist[i].racetime_id;
    const therun_id = userlist[i].therun_id;
    const eachtime = [];

    Deno.stdout.writeSync(
        new TextEncoder().encode(`\r工事中...: (${i+1}/${userlist.length})`)
    );

    // 参加レースIDを収集
    const participatedRaces: string[] = [];
    for (const [raceId, raceData] of allRaceData.entries()) {
        const entrants = raceData.entrants ?? [];
        const participated = entrants.some((e: { id: string }) => {
            if (raceData.source === "RACETIME") {
                return racetime_id && e.id === racetime_id;
            } else if (raceData.source === "THERUN") {
                return therun_id && e.id === therun_id;
            }
            return false;
        });
        if (participated) {
            participatedRaces.push(raceId);
        }
    }

    for (let j = 0; j < counter.length; j++) {
        const cat = counter[j].category;
        const toptime = counter[j].time;

        if (toptime === null) {
            eachtime.push({
                category: cat,
                time: null,
                irate: 0
            });
            continue;
        }

        const loadfile = allLeaderboards.get(cat);

        if (!loadfile || !Array.isArray(loadfile) || loadfile.length === 0) {
            eachtime.push({ category: cat, time: null });
            continue;
        }

        const first = loadfile[0];
        if (!first || !first.runs) {
            eachtime.push({ category: cat, time: null });
            continue;
        }

        const exist = first.runs.find(run => String(run.id) === String(userid));
        if (exist) {
            const existtime = exist.time ?? null;
            eachtime.push({
                "category": cat,
                "time": existtime,
            });
        } else {
            eachtime.push({
                "category": cat,
                "time": null,
            });
        }
    }

    await savejson("./userdata", userid, {
        id: userid,
        name: username,
        banned: banned,
        races: participatedRaces, // 参加レースID一覧
        times: eachtime
    });
}
console.log("\n工事完了です...");
}