const kv = await Deno.openKv();

interface User {
    id: string;
    name: string;
    banned: boolean;
    racetime_id?: string;
    therun_id?: string;
}

import { readJson } from "./savetogithub.ts";

const CHUNK_SIZE = 100; // 100件ずつ分割

export async function getUserlist(): Promise<User[]> {
    // チャンク数を確認
    const meta = await kv.get(["cache", "userlist_meta"]);

    if (meta.value) {
        // キャッシュから復元
        const chunkCount = meta.value as number;
        const chunks = await Promise.all(
            Array.from({ length: chunkCount }, (_, i) =>
                kv.get(["cache", `userlist_${i}`])
            )
        );
        return chunks.flatMap(c => c.value as User[]);
    }

    // キャッシュ切れ → GitHubからfetch
    const { data } = await readJson("info/userlist.json");
    const userlist = data as User[];

    // チャンク分割して保存
    const chunks: User[][] = [];
    for (let i = 0; i < userlist.length; i += CHUNK_SIZE) {
        chunks.push(userlist.slice(i, i + CHUNK_SIZE));
    }

    await Promise.all(
        chunks.map((chunk, i) =>
            kv.set(["cache", `userlist_${i}`], chunk, { expireIn: 60 * 60 * 1000 })
        )
    );
    await kv.set(["cache", "userlist_meta"], chunks.length, { expireIn: 60 * 60 * 1000 });

    return userlist;
}

// --- セッション管理 ---
interface Session {
    step: "group" | "category1" | "category2" | "category3";
    url: string;
    report: string;
    fetched: { endedAt: string; entrants: unknown[] };
    group?: string;
    groupDisplay?: string;
    category1?: string;
    category2?: string;
    token: string;
}

export async function setSession(userId: string, session: Session) {
    await kv.set(["session", userId], session, { expireIn: 60 * 60 * 1000 });
}

export async function getSession(userId: string): Promise<Session | null> {
    const result = await kv.get(["session", userId]);
    return result.value as Session | null;
}

export async function deleteSession(userId: string) {
    await kv.delete(["session", userId]);
}