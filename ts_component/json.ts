export async function loadjson(uri: string) {
    try{
        const res = await Deno.readTextFile(uri);
    return JSON.parse(res);
    }
    catch (error) {
        // ファイルが存在しない場合は null を返す
        if (error instanceof Deno.errors.NotFound) {
            return null;
        }
        // それ以外のエラー（権限不足など）はそのまま投げる
        throw error;
    }
}

export async function savejson(path: string, uri: string, data: any) {
    const directory = `${path}/${uri}.json`;
    await Deno.mkdir(path, { recursive: true });
    await Deno.writeTextFile(directory, JSON.stringify(data, null, 2));
}

export async function* loadfolder(uri: string) {
    for await (const entry of Deno.readDir(uri)) {
        if(entry.isFile){
            const path = uri + "/" + entry.name;
            const value = await loadjson(path);
            yield {
                name: entry.name,
                value: value
            }
        }
    }
}