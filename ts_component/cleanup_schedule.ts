import { loadjson, savejson } from "./json.ts";

export async function cleanupSchedule() {
    const now = new Date();
    const schedule = await loadjson("./info/schedule.json");

    const before = schedule.schedules.length;
    schedule.schedules = schedule.schedules.filter(
        (s: { datetime: string }) => new Date(s.datetime) > now
    );
    const after = schedule.schedules.length;

    await savejson("./info", "schedule", schedule);
    console.log(`Cleaned up ${before - after} expired schedules.`);
}