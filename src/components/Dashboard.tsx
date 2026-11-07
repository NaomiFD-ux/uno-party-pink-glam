import {useState} from 'react';
import {historyDate} from '../utils/history';
import { Trophy, Layers, PieChart, Flame, History, ArrowUpRight } from 'lucide-react';
import { UserProfile } from '../types/game';
export function Dashboard({profile,onProfile}:{profile:UserProfile;onProfile:()=>void}) {
  const [historyPeriod,setHistoryPeriod]=useState<'all'|'today'>('all');
  const matches=profile.matchHistory.filter(m=>historyPeriod==='all'||new Date(m.date).toDateString()===new Date().toDateString());
  const rate=profile.gamesPlayed?Math.round(profile.wins/profile.gamesPlayed*1000)/10:0;
  const stats=[
    {label:'Rounds played',value:profile.gamesPlayed,Icon:Layers,detail:'Every seat at the table counts',progress:profile.gamesPlayed?100:0},
    {label:'Rounds won',value:profile.wins,Icon:Trophy,detail:'A little friendly competition',progress:rate},
    {label:'Win percentage',value:`${rate.toFixed(1)}%`,Icon:PieChart,detail:'Your wins across all rounds',progress:rate},
    {label:'Longest streak',value:profile.bestStreak,Icon:Flame,detail:profile.bestStreak===1?'1 round in a row':`${profile.bestStreak} rounds in a row`,progress:profile.gamesPlayed?Math.min(100,profile.bestStreak/profile.gamesPlayed*100):0},
  ];
  return <div className="dashboard-details"><div className="dashboard-section-heading"><h2>Performance Overview <span>✦</span></h2><span className="stats-period">All time</span></div><div className="performance-grid">{stats.map(({label,value,Icon,detail,progress})=><article className="performance-card" key={label}><div className="performance-label"><h3>{label}</h3><span><Icon size={17}/></span></div><strong>{value}</strong><p>{detail}</p><div className="performance-track"><span style={{width:`${progress}%`}}/></div></article>)}</div><section className="dashboard-history"><div className="dashboard-section-heading"><h2><span className="section-icon"><History size={17}/></span> Recent Game History</h2><button className="text-button" onClick={onProfile}>View all <ArrowUpRight size={14}/></button></div><div className="history-period" aria-label="History period"><button aria-pressed={historyPeriod==='today'} onClick={()=>setHistoryPeriod('today')}>Today</button><button aria-pressed={historyPeriod==='all'} onClick={()=>setHistoryPeriod('all')}>All games</button></div>{matches.length?<div className="dashboard-match-list">{matches.slice(0,5).map(match=><article key={match.id}><span className={`match-result-icon ${match.placement===1?'won':''}`}><Trophy size={19}/></span><div className="dashboard-match-info"><div><h3>{match.tableName}</h3><span className={`match-placement ${match.placement===1?'won':''}`}>{match.placement===1?'WIN':'LOSS'}</span></div><p>{match.turns} turns · {match.cardsPlayed} cards played</p></div><span className="match-date">{historyDate(match.date)}</span></article>)}</div>:<div className="history-empty"><div className="empty-card-fan" aria-hidden="true"><i/><i/><i>✦</i></div><h3>{historyPeriod==='today'?'No completed rounds today.':'Your first game is waiting.'}</h3><p>Finished rounds will appear here.</p></div>}</section></div>;
}
