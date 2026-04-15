import { loadjson, savejson } from "./ts_component/json.ts";

export async function gene_user() {

const userlist = await loadjson("./info/userlist.json");
const leaderboardsDir = "./leaderboard/";
const counter = await loadjson("./info/toptimes.json");

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
    const eachtime = [];

    Deno.stdout.writeSync(
        new TextEncoder().encode(`\r工事中...: (${i+1}/${userlist.length})`)
    );

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
                "category" : cat,
                "time" : existtime,
            });
        }else{
            eachtime.push({
                "category" : cat,
                "time" : null,
            });
        }
    }

    await savejson("./userdata", userid, {
    id: userid,
    name: username,
    banned: banned,
    times: eachtime
},);
}
console.log("\n工事完了です...");
}
