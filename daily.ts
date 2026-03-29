import { discord } from "./ts_component/webhook.ts";
import { checksrc } from "./checksrc.ts";
import { listed } from "./listed.ts";
import { user } from "./user.ts";
import { gene_lb } from "./generate_leaderboard.ts";
import { gene_user } from "./generate_userdata.ts";

const updatedlist = await checksrc();

if (updatedlist.length > 0) {
    const diff = await listed();
    if (diff.length > 0){
        await user();
    }
    await gene_lb()
    await gene_user()
    await discord(updatedlist.length + "件のリーダーボードを更新、" + diff.length + "件のユーザーを追加しました")
}else{
    await discord("更新はありませんでした")
}
