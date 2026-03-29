export function src1(game: string,category: string,type1: string,var1: string): string {
    return "https://www.speedrun.com/api/v1/leaderboards/"+ game + "/category/" + category + "?var-" + type1 + "=" + var1;
}
export function src2(game: string,category: string,type1: string,var1: string,type2: string,var2: string): string {
    return "https://www.speedrun.com/api/v1/leaderboards/"+ game + "/category/" + category + "?var-" + type1 + "=" + var1 + "&var-" + type2 + "=" + var2;
}