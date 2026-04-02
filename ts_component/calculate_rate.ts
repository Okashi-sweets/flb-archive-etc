/*
このファイルは将来的に使用するレースレートの計算用です。
まだコードは書きません^^
すまんやっぱ書くわ
*/
export function calc_Rate(
    base_rate: number,
    multiplier: number,
    time: number,
    top_time: number,
    max_percent: number,
    min_percent: number
){
    if(time / top_time < 1 + min_percent / 100){
        if(time / top_time < 1 + max_percent / 100){
            return base_rate + multiplier
        }
        const diff = (time / top_time) * 100 - 100
        const percent = (diff - max_percent) / (min_percent - max_percent)
        const weight = percent ** 2
        return base_rate + multiplier * (1 - weight)
    }
    else{
        return base_rate
    }
}
