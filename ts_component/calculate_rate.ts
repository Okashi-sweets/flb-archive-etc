/*
値の設定
op_border:opが加算される最低ラインかつレートが最大値になるライン
rate_border:レートが加算される最低ライン
base_rate:rate_borderを下回った時のスコア　レート用
multiplier:op_borderを上回った時のスコア　レート用
op_score:top_timeと同じ時間の時のスコア　op用(op_borderを下回った時は0なのでbaseはなし)
*/
export async function calc_rate(
    base_rate: number,
    multiplier: number,
    time: number,
    top_time: number,
    op_border: number,
    rate_border: number
){
    if(time / top_time < 1 + rate_border / 100){
        if(time / top_time < 1 + op_border / 100){
            return base_rate + multiplier
        }
        const diff = (time / top_time) * 100 - 100
        const percent = (rate_border - diff) / (rate_border - op_border)
        const weight = percent ** 2
        return base_rate + multiplier * weight
    }
    else{
        return base_rate
    }
}

export async function calc_op(
    time: number,
    top_time: number,
    op_border: number,
    op_score: number
) {
    if(time / top_time < 1 + op_border / 100){
        const diff = (time / top_time) * 100 - 100
        const percent = (op_border - diff) / op_border
        return op_score * percent
    }
    else{
        return 0
    }
}