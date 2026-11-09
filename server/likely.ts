import {LIKELY_TOPICS} from '../src/data/likelyTopics';
import {randomUUID,randomInt} from 'node:crypto';
import type {LikelyView} from '../src/online/protocol';
export type LikelyState={voteDeadline?:number;id:string;questions:string[];index:number;phase:'vote'|'reveal'|'finished';votes:Record<string,string|null>;results:Record<string,number>;totals:Record<string,number>;skipped:boolean};
export const STARTERS=[
 'Who’s most likely to fall asleep during movie night?',
 'Who’s most likely to say “I’m on my way” while still at home?',
 'Who’s most likely to become famous by accident?',
 'Who’s most likely to plan a trip and forget to book the flight?',
 'Who’s most likely to laugh at the worst possible moment?',
 'Who’s most likely to order food after saying they aren’t hungry?',
 'Who’s most likely to win an argument with a screenshot?',
 'Who’s most likely to spend an hour picking an outfit?',
 'Who’s most likely to make friends with a stranger in line?',
 'Who’s most likely to turn a quick story into a whole movie?',
 'Who’s most likely to forget why they walked into a room?',
 'Who’s most likely to send a five-minute voice message?',
 'Who’s most likely to start dancing in the grocery store?',
 'Who’s most likely to become the group’s unofficial detective?',
 'Who’s most likely to bring enough luggage for a month-long trip?',
 'Who’s most likely to keep playing “one more round” until sunrise?',
 'Who’s most likely to accidentally like a very old photo?',
 'Who’s most likely to have a snack hidden in their bag?',
 'Who’s most likely to turn a board game into a competitive sport?',
 'Who’s most likely to make everyone laugh without trying?'
];
export function fairQuestions(groups:string[][]):string[]{
 const queues=groups.map(g=>[...g]);for(let i=queues.length-1;i>0;i--){const j=randomInt(i+1);[queues[i],queues[j]]=[queues[j],queues[i]];}
 const result:string[]=[];for(let n=0;n<10;n++)for(const group of queues)if(group[n]&&!result.includes(group[n]))result.push(group[n]);return result;
}
export function newLikely(custom:string[]=[],topics:string[]=[]):LikelyState{
 const selected=LIKELY_TOPICS.filter(t=>topics.includes(t.id));
 const starters=selected.length?selected.flatMap(t=>t.prompts.map(p=>`Who’s most likely to ${p}?`)):[...STARTERS,...LIKELY_TOPICS.flatMap(t=>t.prompts.map(p=>`Who’s most likely to ${p}?`))];for(let i=starters.length-1;i>0;i--){const j=randomInt(i+1);[starters[i],starters[j]]=[starters[j],starters[i]];}
 const questions=Array.from(new Set([...custom.map(q=>q.trim()),...starters])).slice(0,10);
 return {voteDeadline:Date.now()+15000,id:randomUUID(),questions,index:0,phase:'vote',votes:{},results:{},totals:{},skipped:false};
}
export function revealLikely(game:LikelyState){if(game.phase!=='vote')return;game.results={};for(const id of Object.values(game.votes))if(id)game.results[id]=(game.results[id]||0)+1;const high=Math.max(0,...Object.values(game.results));if(high)for(const [id,n] of Object.entries(game.results))if(n===high)game.totals[id]=(game.totals[id]||0)+1;game.phase='reveal';}
export function likelyView(game:LikelyState,you:string):LikelyView{return {voteDeadline:game.voteDeadline,id:game.id,questionId:`${game.id}:${game.index}`,question:game.questions[game.index],number:game.index+1,total:game.questions.length,phase:game.phase,submitted:Object.keys(game.votes),yourVote:game.votes[you],results:game.phase==='vote'?{}:game.results,totals:game.totals,skipped:game.skipped};}
export function removeLikelyPlayer(game:LikelyState,id:string,remaining:string[]){delete game.votes[id];for(const [voter,target]of Object.entries(game.votes))if(target===id&&game.phase==='vote')delete game.votes[voter];if(remaining.length<2){game.phase='finished';return;}if(game.phase==='vote'&&remaining.every(id=>Object.hasOwn(game.votes,id)))revealLikely(game);}
