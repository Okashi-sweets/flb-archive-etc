import { loadjson, savejson } from "./ts_component/json.ts";

export async function gene_lb() {

const order = await loadjson("./info/url.json");
const namelist = await loadjson("./info/userlist.json");
const usercheck = new Map(namelist.map((user) => [user.id, user.name]));
const bannedcheck = new Map(namelist.map((user) => [user.id, user.banned]));
const toptimes = [];


for (let i = 0; i < order.length; i++) {
    const ordername = order[i].name;
    const ordergroup = order[i].group;
    const ordercategory1 = order[i].displaycategory1;
    const ordercategory2 = order[i].displaycategory2;
    const ordercategory3 = order[i].displaycategory3;
    const newdata = [];

    newdata.push({
        "name_ideal" : ordername,
        "group" : ordergroup,
        "category1" : ordercategory1,
        "category2" : ordercategory2,
        "category3" : ordercategory3,
        "runs" : []
    });

    const orderboard = "./lawdata/" + ordername + ".json";
    const orderdata = await loadjson(orderboard);
    const orderruns = orderdata.data.runs;
    if (!orderruns || orderruns.length === 0) {
        toptimes.push({
            "category" : ordername,
            "time" : null
        });
        continue;
    }
    //　ここから各要素の取得
    for (let j = 0; j < orderruns.length; j++) {
        const video = orderruns[j].run.videos?.links?.[0]?.uri ?? null;
        const id = orderruns[j].run.players[0].id;
        const runner = usercheck.get(id) ?? "Unknown";
        const time = orderruns[j].run.times.primary_t;
        const date = orderruns[j].run.date;
        const banned = bannedcheck.get(id);

        if(j === 0){
            toptimes.push({
                "category" : ordername,
                "time" : time
            });
        }

        newdata[0].runs.push({
            "id" : id,
            "name" : runner,
            "time" : time,
            "date" : date,
            "video" : video,
            "banned" : banned
        });

    }
    await savejson("./leaderboard", ordername, newdata);
    console.log(ordername + " is done.");
}
await savejson("./info", "toptimes", toptimes);
console.log("All leaderboards are generated.");

}