export type PoolSet='solid'|'stripe'|'hearts';
export type PoolBall={id:number;set:PoolSet|'cue'|'eight';x:number;y:number;pocketed:boolean};
export type PoolFrame={t:number;balls:{id:number;x:number;y:number;pocketed:boolean}[]};
export type PoolState={id:string;players:string[];assignments?:Record<string,PoolSet>;departed:string[];active:string;balls:PoolBall[];shotNumber:number;ballInHand:boolean;winner:string|null;draw:boolean;notice:string;shot?:{id:number;startedAt:number;duration:number;frames:PoolFrame[];pocketed:number[];scratch:boolean}};
export const POOL_WIDTH=360,POOL_HEIGHT=640,BALL_RADIUS=13;
export const POOL_POCKETS=[{x:0,y:0},{x:360,y:0},{x:0,y:320},{x:360,y:320},{x:0,y:640},{x:360,y:640}];
export const POOL_SETS:PoolSet[]=['solid','stripe','hearts'];
export const POOL_LABELS:Record<PoolSet,string>={solid:'Solids',stripe:'Stripes',hearts:'Pink Hearts'};
export function newPool(players:string[],id=crypto.randomUUID()):PoolState{
 if(players.length!==3||new Set(players).size!==3)throw Error('Pool needs exactly three players.');
 const positions=[[-42,228],[-14,228],[14,228],[42,228],[-56,253],[-28,253],[0,253],[28,253],[56,253],[-42,278],[-14,278],[14,278],[42,278],[-28,303],[0,303],[28,303],[-14,328],[14,328]];
 return {id,players:[...players],assignments:{},departed:[],active:players[0],balls:[{id:0,set:'cue',x:180,y:500,pocketed:false},{id:19,set:'eight',x:180,y:353,pocketed:false},...positions.map(([x,y],i)=>({id:i+1,set:POOL_SETS[i%3],x:180+x,y,pocketed:false}))],shotNumber:0,ballInHand:false,winner:null,draw:false,notice:'Clear your six, then pocket the 8 ball.'};
}
export function poolSet(s:PoolState,id:string){return s.assignments?s.assignments[id]:POOL_SETS[s.players.indexOf(id)];}
export function legalPoolTarget(s:PoolState,id:string,b:PoolBall){const own=poolSet(s,id);if(!b.id||b.pocketed)return false;if(own)return b.set===(remainingPool(s,id)===0?'eight':own);return POOL_SETS.includes(b.set as PoolSet)&&!Object.values(s.assignments||{}).includes(b.set as PoolSet);}
export function remainingPool(s:PoolState,id:string){const set=poolSet(s,id);return s.departed.includes(id)?0:s.balls.filter(b=>b.set===set&&!b.pocketed).length;}
export function poolBusyUntil(s:PoolState){return s.shot?s.shot.startedAt+s.shot.duration:0;}
export function placeCue(s:PoolState,actor:string,x:number,y:number,now=Date.now()):PoolState{
 if(s.winner||s.draw||s.active!==actor||!s.ballInHand||now<poolBusyUntil(s))throw Error('Wait for your ball-in-hand turn.');
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<18||x>342||y<18||y>622||POOL_POCKETS.some(p=>Math.hypot(x-p.x,y-p.y)<25)||s.balls.some(b=>b.id&&!b.pocketed&&Math.hypot(x-b.x,y-b.y)<BALL_RADIUS*2+1))throw Error('Place the cue ball on clear felt, away from the pockets.');
 return {...s,ballInHand:false,balls:s.balls.map(b=>b.id?b:{...b,x,y,pocketed:false})};
}
export function shootPool(s:PoolState,actor:string,angle:number,power:number,now=Date.now()):PoolState{
 if(s.winner||s.draw||s.active!==actor||s.departed.includes(actor))throw Error('Wait for your turn.');if(now<poolBusyUntil(s))throw Error('Let the balls stop first.');
 if(!Number.isFinite(angle)||!Number.isFinite(power)||power<.05||power>1)throw Error('Choose a valid aim and shot power.');
 const balls=s.balls.map(b=>({...b,vx:0,vy:0})),cue=balls.find(b=>!b.id)!;if(cue.pocketed)throw Error('Place the cue ball first.');cue.vx=Math.cos(angle)*(180*power+1120*power*power);cue.vy=Math.sin(angle)*(180*power+1120*power*power);
 const frames:PoolFrame[]=[],pocketed:number[]=[];let first:number|undefined;const dt=1/120,r=BALL_RADIUS;
 const frame=(t:number)=>frames.push({t,balls:balls.map(b=>({id:b.id,x:Math.round(b.x*100)/100,y:Math.round(b.y*100)/100,pocketed:b.pocketed}))});frame(0);let steps=0;
 for(;steps<1440;steps++){
  for(const b of balls){if(b.pocketed)continue;b.x+=b.vx*dt;b.y+=b.vy*dt;
   if(POOL_POCKETS.some(p=>Math.hypot(b.x-p.x,b.y-p.y)<23)){b.pocketed=true;b.vx=b.vy=0;pocketed.push(b.id);continue;}
   if(b.x<r){b.x=r;b.vx=Math.abs(b.vx)*.84;}if(b.x>360-r){b.x=360-r;b.vx=-Math.abs(b.vx)*.84;}if(b.y<r){b.y=r;b.vy=Math.abs(b.vy)*.84;}if(b.y>640-r){b.y=640-r;b.vy=-Math.abs(b.vy)*.84;}
  }
  for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++){const a=balls[i],b=balls[j];if(a.pocketed||b.pocketed)continue;const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>=r*2||d<.0001)continue;const nx=dx/d,ny=dy/d,overlap=(r*2-d)/2+.001;a.x-=nx*overlap;a.y-=ny*overlap;b.x+=nx*overlap;b.y+=ny*overlap;const speed=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;if(speed>0){if(first===undefined&&(a.id===0||b.id===0))first=a.id===0?b.id:a.id;const impulse=speed*.98;a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny;}}
  let moving=false;for(const b of balls){const speed=Math.hypot(b.vx,b.vy);if(speed>0){const next=Math.max(0,speed-120*dt),ratio=next/speed;b.vx*=ratio;b.vy*=ratio;if(next>1.5)moving=true;else b.vx=b.vy=0;}}
  if(steps%4===3)frame((steps+1)/120*1000);if(!moving)break;
 }
 frame((steps+1)/120*1000);const own=poolSet(s,actor),firstSet=balls.find(b=>b.id===first)?.set,scratch=pocketed.includes(0),foul=scratch||first===undefined||!s.balls.some(b=>b.id===first&&legalPoolTarget(s,actor,b));
 const result:PoolState={...s,balls:balls.map(({vx,vy,...b})=>b),shotNumber:s.shotNumber+1,ballInHand:false,winner:null,draw:false,notice:'',shot:{id:s.shotNumber+1,startedAt:now+120,duration:Math.max(250,frames.at(-1)!.t),frames,pocketed,scratch}};
 if(!own&&!foul){const claim=pocketed.map(id=>balls.find(b=>b.id===id)!).find(b=>POOL_SETS.includes(b.set as PoolSet)&&!Object.values(s.assignments||{}).includes(b.set as PoolSet));if(claim)result.assignments={...s.assignments,[actor]:claim.set as PoolSet};}
 const eightPot=pocketed.some(id=>balls.find(b=>b.id===id)?.set==='eight'),eligible=!!own&&remainingPool(s,actor)===0;
 if(eightPot&&eligible&&!foul){result.winner=actor;result.notice='Your set is clear · 8 ball pocketed!';}
 else if(eightPot){result.departed=[...s.departed,actor];result.balls=result.balls.map(b=>b.set===own?{...b,pocketed:true}:b);const spot=findPoolSpot(result.balls,180,320);result.balls=result.balls.map(b=>b.set==='eight'?{...b,...spot,pocketed:false}:b);result.notice='8 ball pocketed early or on a foul · you’re out.';}
 const alive=s.players.filter(id=>!result.departed.includes(id));if(!alive.length)result.draw=true;
 const ownPot=pocketed.some(id=>balls.find(b=>b.id===id)?.set===poolSet(result,actor));
 const keep=!foul&&!eightPot&&ownPot&&alive.includes(actor);let next=actor;if(!keep&&!result.winner&&!result.draw){const start=s.players.indexOf(actor);for(let n=1;n<=3;n++){const id=s.players[(start+n)%3];if(alive.includes(id)){next=id;break;}}}result.active=next;result.ballInHand=scratch&&!result.winner&&!result.draw;

 if(!result.notice)result.notice=scratch?'Scratch · next player places the cue ball.':foul?'Wrong ball or no contact · turn passes.':keep?(remainingPool(result,actor)===0?'Set cleared · shoot the 8 ball!':'Your ball pocketed · shoot again!'):'Turn passes.';
 return result;
}
function findPoolSpot(balls:PoolBall[],x:number,y:number){for(let row=y;row>=40;row-=40)for(let col=x;col<330;col+=40)if(!balls.some(b=>b.set!=='eight'&&!b.pocketed&&Math.hypot(col-b.x,row-b.y)<BALL_RADIUS*2+2))return {x:col,y:row};return {x:40,y:600};}
export function leavePool(s:PoolState,id:string):PoolState{if(s.departed.includes(id))return s;const set=poolSet(s,id),r={...s,departed:[...s.departed,id],balls:s.balls.map(b=>b.set===set?{...b,pocketed:true}:b)};const alive=r.players.filter(p=>!r.departed.includes(p));if(!alive.length)r.draw=true;if(r.active===id)r.active=alive[0]||'';r.notice='A player left. Clear your set, then sink the 8 ball.';return r;}
export function poolBotShot(s:PoolState):{angle:number;power:number}{const cue=s.balls[0],targets=s.balls.filter(b=>legalPoolTarget(s,s.active,b));let best:{angle:number;power:number;score:number}|undefined;
 const clear=(a:{x:number;y:number},b:{x:number;y:number},ignore:number[])=>!s.balls.some(o=>{if(o.pocketed||ignore.includes(o.id))return false;const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy,t=((o.x-a.x)*dx+(o.y-a.y)*dy)/len;if(t<=0||t>=1)return false;return Math.hypot(o.x-a.x-t*dx,o.y-a.y-t*dy)<BALL_RADIUS*2.1;});
 for(const ball of targets)for(const p of POOL_POCKETS){const d=Math.hypot(p.x-ball.x,p.y-ball.y),gx=ball.x-(p.x-ball.x)/d*BALL_RADIUS*2,gy=ball.y-(p.y-ball.y)/d*BALL_RADIUS*2;if(gx<10||gx>350||gy<10||gy>630)continue;const distance=Math.hypot(gx-cue.x,gy-cue.y);if(clear(cue,{x:gx,y:gy},[0,ball.id])&&clear(ball,p,[0,ball.id])){const score=distance+d;if(!best||score<best.score)best={angle:Math.atan2(gy-cue.y,gx-cue.x),power:Math.min(.95,.3+score/1600),score};}}
 return best||{angle:Math.atan2((targets[0]?.y||180)-cue.y,(targets[0]?.x||180)-cue.x),power:.7};}

export function poolAimGuide(s:PoolState,actor:string,balls:PoolBall[],angle:number){
 const cue=balls.find(b=>b.id===0)!,dx=Math.cos(angle),dy=Math.sin(angle),r=BALL_RADIUS;
 const wall=(x:number,y:number,vx:number,vy:number)=>Math.min(...[vx>1e-8?(360-r-x)/vx:vx< -1e-8?(r-x)/vx:Infinity,vy>1e-8?(640-r-y)/vy:vy< -1e-8?(r-y)/vy:Infinity].filter(t=>t>=0));
 let distance=wall(cue.x,cue.y,dx,dy),target:PoolBall|undefined;
 for(const b of balls){if(!b.id||b.pocketed)continue;const x=b.x-cue.x,y=b.y-cue.y,along=x*dx+y*dy,side=x*x+y*y-along*along;if(along<=0||side>4*r*r)continue;const hit=along-Math.sqrt(Math.max(0,4*r*r-side));if(hit>=0&&hit<distance){distance=hit;target=b;}}
 const end={x:cue.x+dx*distance,y:cue.y+dy*distance};
 if(!target||!legalPoolTarget(s,actor,target))return {end,target,branches:[]};
 const nx=(target.x-end.x)/(2*r),ny=(target.y-end.y)/(2*r),dot=dx*nx+dy*ny,tx=dx-dot*nx,ty=dy-dot*ny,len=Math.hypot(tx,ty);
 const branch=(x:number,y:number,vx:number,vy:number)=>{const d=Math.min(100,wall(x,y,vx,vy));return {x,y,endX:x+vx*d,endY:y+vy*d};};
 return {end,target,branches:[branch(target.x,target.y,nx,ny),...(len>.01?[branch(end.x,end.y,tx/len,ty/len)]:[])]};
}
