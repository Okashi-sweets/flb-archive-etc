const kv = await Deno.openKv();

// --- userlistキャッシュ ---
interface User {
    id: string;
    name: string;
    banned: boolean;
    racetime_id?: string;
    therun_id?: string;
}

import { readJson } from "./savetogithub.ts";

export async function getUserlist(): Promise<User[]> {
    const cached = await kv.get(["cache", "userlist"]);
    if (cached.value) return cached.value as User[];

    const { data } = await readJson("info/userlist.json");
    await kv.set(["cache", "userlist"], data, { expireIn: 60 * 60 * 1000 });
    return data as User[];
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