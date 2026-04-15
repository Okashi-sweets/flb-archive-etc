import { loadjson, savejson} from "./ts_component/json.ts";
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function user(){
const urls = await loadjson("./info/diff_userid.json");
const oldData = await loadjson("./info/userlist.json");

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

if (urls.length === 0){
  console.log("新しいユーザーIDはありません。");
  return;
}

const chunks = chunk(urls, 50);

const resultsArray: Array<{
    id: string;
    name: string;
    banned: boolean;
}> = [];

async function fetchChunk(chunk: string[], index: number) {
  console.log(`=== Fetching chunk ${index + 1}/${chunks.length} ===`);

  const results = await Promise.allSettled(
    chunk.map(async (url) => {
      const res = await fetch(`https://www.speedrun.com/api/v1/users/${url}`);

      const data = await res.json();
      const id = data.data.id;
      const name = data.data.names.international;
      const status = data.data.role
      if (status === "banned") {
        return { id: id, name: name, banned: true };
      }
      else{
      return { id: id, name: name, banned: false };
        }
    }),
  );

  for (const r of results) {
    if (r.status === "fulfilled") {
      resultsArray.push(r.value);
    } else {
      resultsArray.push({
        id: "ERROR",
        name: "ERROR",
        banned: false,
      });
    }
  }
}

let currentIndex = 0;

for(let i = 0; i < chunks.length; i++){

await fetchChunk(chunks[currentIndex], currentIndex);

  currentIndex++;

  if (i < chunks.length - 1) {
      console.log("Waiting 60s for next chunk...");
      await delay(60000); 
    }

  if (currentIndex >= chunks.length) {
    console.log("All chunks processed. Writing JSON...");

  }
}
const margedResults = [...oldData, ...resultsArray]

    await Deno.writeTextFile(
      "info/userlist.json",
      JSON.stringify(margedResults, null, 2),
    );
};