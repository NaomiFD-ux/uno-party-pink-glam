export const SANTA_NAME_START_SECONDS=6;
export const SANTA_LETTER_SECONDS=.06;
/** Use media time, not wall-clock time, so buffering and replay stay synchronized. */
export function santaLettersAt(mediaTime:number,length:number){
 if(!Number.isFinite(mediaTime)||mediaTime<SANTA_NAME_START_SECONDS)return 0;
 return Math.min(length,1+Math.floor((mediaTime-SANTA_NAME_START_SECONDS+1e-6)/SANTA_LETTER_SECONDS));
}
