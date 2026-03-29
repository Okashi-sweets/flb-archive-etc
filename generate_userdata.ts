export async function gene_user() {

const userlist = JSON.parse(await Deno.readTextFile("userlist.json"));
const leaderboardsDir = "./leaderboard/";
const counter = JSON.parse(await Deno.readTextFile("./leaderboard/toptimes.json"));

const allLeaderboards = new Map();
for (const item of counter) {
    const cat = item.category;
    try {
        const content = JSON.parse(await Deno.readTextFile(`${leaderboardsDir}${cat}.json`));
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
    let totalscore = 0;
    let basescore = 0;
    let cescore = 0;
    let acscore = 0;
    let ch1score = 0;
    let ch2score = 0;
    let ch3score = 0;
    let ch4score = 0;
    let cedemoscore = 0;
    let ceacscore = 0;
    let cech1score = 0;
    let cech2score = 0;
    let cech3score = 0;
    let cech4score = 0;
    let score = 0;

    function addsscore(baseflag, type, score){
    totalscore += score;
    if (baseflag) {
        basescore += score;
        switch (type) {
            case "All Chapters" : acscore += score; break;
            case "Chapter 1": ch1score += score; break;
            case "Chapter 2": ch2score += score; break;
            case "Chapter 3": ch3score += score; break;
            case "Chapter 4": ch4score += score; break;
            case "All Shadow Crystals": acscore += score; break;
            default: break;
        }
}
    else {
        cescore += score;
        switch (type) {
            case "CH1+2 Demo": cedemoscore += score; break;
            case "All Chapters": ceacscore += score; break;
            case "Chapter 1": cech1score += score; break;
            case "Chapter 2": cech2score += score; break;
            case "Chapter 3": cech3score += score; break;
            case "Chapter 4": cech4score += score; break;
            default: break;
        }
    }
}

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
        if (!loadfile || toptime === null) {
            eachtime.push({ category: cat, time: null, irate: 0 });
            continue;
        }

        const baseflag = loadfile[0].group === "base";
        const type = loadfile[0].category1;

        const exist = loadfile[0].runs.find(run => run.id === userid);
        if (exist) {
            const existtime = exist.time
            if (existtime <= toptime * 1.15){
                    if (baseflag) {
                        const exscore = Math.floor((75 * (toptime / existtime)) * 100) / 100;
                        score = Math.floor((25 + exscore) * 100) / 100;
                    }else{
                        const exscore = Math.floor((25 * (toptime / existtime)) * 100) / 100;
                        score = Math.floor((10 + exscore) * 100) / 100;
                    }
                }else{
                    score = baseflag ? 25 : 10;
                }

            addsscore(baseflag, type, score);

            eachtime.push({
                "category" : cat,
                "time" : existtime,
                "irate" : score
            });
        }else{
            score = 0;
            eachtime.push({
                "category" : cat,
                "time" : null,
                "irate" : score
            });
        }
    }

    await Deno.writeTextFile("./userdata/" + userid + ".json", JSON.stringify({
    id: userid,
    name: username,
    banned: banned,
    pbscore: Math.floor(totalscore * 100) / 100,
    pbscoredatail: {
    basescore: Math.floor(basescore * 100) / 100,
    cescore: Math.floor(cescore * 100) / 100,
    acscore: Math.floor(acscore * 100) / 100,
    ch1score: Math.floor(ch1score * 100) / 100,
    ch2score: Math.floor(ch2score * 100) / 100,
    ch3score: Math.floor(ch3score * 100) / 100,
    ch4score: Math.floor(ch4score * 100) / 100,
    cedemoscore: Math.floor(cedemoscore * 100) / 100,
    ceacscore: Math.floor(ceacscore * 100) / 100,
    cech1score: Math.floor(cech1score * 100) / 100,
    cech2score: Math.floor(cech2score * 100) / 100,
    cech3score: Math.floor(cech3score * 100) / 100,
    cech4score: Math.floor(cech4score * 100) / 100,
    },
    times: eachtime
}, null, 2));
}
console.log("\n工事完了です...");
}
