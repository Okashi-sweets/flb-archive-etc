import { src1, src2 } from "./ts_component/getsrc.ts";
import { loadjson, savejson } from "./ts_component/json.ts";

export async function checksrc() {
    const lawlist = await Deno.readTextFile("url.json")
    const list = JSON.parse(lawlist);
    let updatedlist: string[] = [];

    for (const item of list) {
        const testdata = item.type2 == null
            ? await fetch(src1(item.game, item.category, item.type1, item.var1))
            : await fetch(src2(item.game, item.category, item.type1, item.var1, item.type2, item.var2));

        const result = await testdata.json();
        const filename = item.name;

        const oldJson = await loadjson("./lawdata/" + filename + ".json");

        if (JSON.stringify(result) !== JSON.stringify(oldJson)) {
            await savejson("./lawdata",filename, result);
            updatedlist.push(filename);
        }
    }
    return updatedlist;
}



