import { discord } from "./ts_component/webhook.ts";
import { checksrc } from "./checksrc.ts";
import { listed } from "./listed.ts";
import { user } from "./user.ts";
import { generateNewsIndex } from "./generate_news.ts";
import { generateSchedule } from "./generate_schedule.ts";
import { gene_lb } from "./generate_leaderboard.ts";
import { gene_user } from "./generate_userdata.ts";
import { sort_rank } from "./sort_rank.ts";
import { cleanupSchedule } from "./ts_component/cleanup_schedule.ts";

console.log("レスキュー開始！")
await cleanupSchedule();
await generateSchedule();
const updatedlist = await checksrc();

console.log("srcの確認完了")

if (updatedlist.length > 0) {
    const diff = await listed();
    if (diff.length > 0){
        console.log("ユーザーの確認開始")
        await user();
        console.log("ユーザーの確認完了")
    }
    console.log("リーダーボードの生成開始")
    await gene_lb()
    console.log("リーダーボードの生成完了")
    console.log("ユーザーデータの生成開始")
    await gene_user()
    await sort_rank();
    await generateNewsIndex();
    await discord(updatedlist.length + "件のリーダーボードを更新、" + diff.length + "件のユーザーを追加しました")
}else{
    await generateNewsIndex();
    await discord("更新はありませんでした")
}
console.log("レスキュー完了！")