const REPO = "Okashi-sweets/flb-archive-etc";
const TOKEN = Deno.env.get("GITHUB_TOKEN");
const BASE_URL = `https://api.github.com/repos/${REPO}/contents`;
const HEADERS = {
    "Authorization": `Bearer ${TOKEN}`,
    "Accept": "application/vnd.github+json",
    "Content-Type": "application/json",
};

const isLocal = !TOKEN;

export async function readJson(path: string) {
    if (isLocal) {
        const text = await Deno.readTextFile(path);
        return { data: JSON.parse(text), sha: "" };
    }

    const res = await fetch(`${BASE_URL}/${path}`, { headers: HEADERS });
    const file = await res.json();

    if (!res.ok || !file.content) {
        console.error(`readJson失敗 [${path}] status:${res.status}`, file);
        throw new Error(`readJson失敗: ${file.message ?? "不明なエラー"}`);
    }

    return {
        data: JSON.parse(atob(file.content.replace(/\n/g, ""))),
        sha: file.sha as string,
    };
}

export async function writeJson(path: string, data: unknown, sha: string | null = null) {
    if (isLocal) {
        await Deno.writeTextFile(path, JSON.stringify(data, null, 2));
        return;
    }

    const body: Record<string, unknown> = {
        message: `bot: update ${path}`,
        content: btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))),
    };
    if (sha) body.sha = sha;
    const res = await fetch(`${BASE_URL}/${path}`, {
        method: "PUT",
        headers: HEADERS,
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
    }
}