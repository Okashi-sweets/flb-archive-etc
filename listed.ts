import { loadjson, savejson, loadfolder } from "./ts_component/json.ts";

export async function listed() {

  // lawdata の全データを取得
  const uniqueIds = new Set<string>();

  for await (const entry of loadfolder("./lawdata")) {
    const jsonData = entry.value;

    jsonData.data.runs.forEach((item: any) => {
  const player = item.run.players[0];
  if (player && player.id) {
    uniqueIds.add(player.id);
  }
});
  }

  const newList = Array.from(uniqueIds);

  
  const old = await loadjson("./userid.json");

  const oldList: string[] = Array.isArray(old) ? old : (old?.value ?? []);

  const diff = newList.filter(id => !oldList.includes(id));

  savejson("./","diff_userid", diff);
  savejson("./","userid", newList);

  console.log("Total Count:", newList.length);
  console.log("New IDs:", diff.length);
  return diff;
}