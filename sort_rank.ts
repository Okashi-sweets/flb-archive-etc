import { loadjson, savejson } from "./ts_component/json.ts";

const SCORE_KEYS = [
"pbscore",
"basescore",
"cescore",
"acscore",
"ch1score",
"ch2score",
"ch3score",
"ch4score",
"cedemoscore",
"ceacscore",
"cech1score",
"cech2score",
"cech3score",
"cech4score",
];

export async function sort_rank() {
const userlist = await loadjson("./info/userlist.json");
const users = [];

  // userdata を全部ロード
for (const u of userlist) {
    const data = await loadjson("./userdata/" + u.id + ".json");
    users.push(data);
    }

  // ランキング結果を保存するオブジェクト
const validUsers = users.filter(u => u && u.id && u.pbscoredetail);
const rankings: Record<string, unknown> = {};

for (const key of SCORE_KEYS) {
const sorted = validUsers
    .map(u => ({
        id: u.id,
        name: u.name,
        score: key === "pbscore"
            ? u.pbscore
            : u.pbscoredetail[key] ?? 0,
    }))
    .sort((a, b) => b.score - a.score);

rankings[key] = sorted;
await savejson("./rankings", key, sorted);
}

console.log("ランキング生成完了！");
}