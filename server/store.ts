import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import type {UserProfile} from '../src/types/game';
import {dirname} from 'node:path';
export const accountNameKey=(name:string)=>name.normalize('NFKC').trim().toLowerCase();
export class Store {
 db:DatabaseSync;
 constructor(path:string){if(path!==':memory:')mkdirSync(dirname(path),{recursive:true});this.db=new DatabaseSync(path);this.db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS rooms(code TEXT PRIMARY KEY, body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY, body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS results(id TEXT PRIMARY KEY, body TEXT NOT NULL, synced INTEGER NOT NULL DEFAULT 0);');this.db.exec(`CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,name TEXT NOT NULL COLLATE NOCASE UNIQUE,email TEXT NOT NULL UNIQUE,salt TEXT NOT NULL,password_key TEXT NOT NULL,recovery_hash TEXT NOT NULL,avatar TEXT NOT NULL DEFAULT '',bio TEXT NOT NULL DEFAULT ''); CREATE TABLE IF NOT EXISTS account_sessions(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES accounts(id),expires INTEGER NOT NULL);`);if(!(this.db.prepare('PRAGMA table_info(accounts)').all() as any[]).some(c=>c.name==='name_key')){this.db.exec('ALTER TABLE accounts ADD COLUMN name_key TEXT');for(const a of this.db.prepare('SELECT id,name FROM accounts').all() as any[])this.db.prepare('UPDATE accounts SET name_key=? WHERE id=?').run(accountNameKey(a.name),a.id);}this.db.exec('CREATE UNIQUE INDEX IF NOT EXISTS account_name_key ON accounts(name_key)');}
 rooms(){return this.db.prepare('SELECT body FROM rooms').all().map((r:any)=>JSON.parse(r.body));}
 saveResult(room:any,id:string,body:any){this.db.exec('BEGIN IMMEDIATE');try{this.result(id,body);this.save(room);this.db.exec('COMMIT');}catch(e){this.db.exec('ROLLBACK');throw e;}}
 save(room:any){this.db.prepare('INSERT INTO rooms VALUES (?,?) ON CONFLICT(code) DO UPDATE SET body=excluded.body').run(room.code,JSON.stringify(room));}
 session(hash:string){const r=this.db.prepare('SELECT body FROM sessions WHERE hash=?').get(hash) as any;return r?JSON.parse(r.body):null;}
 saveSession(hash:string,user:any){this.db.prepare('INSERT INTO sessions VALUES (?,?)').run(hash,JSON.stringify(user));}
 result(id:string,body:any){this.db.prepare('INSERT OR IGNORE INTO results(id,body) VALUES (?,?)').run(id,JSON.stringify(body));}
 profile(id:string):UserProfile|null{const a=this.db.prepare('SELECT id,name,avatar,bio FROM accounts WHERE id=?').get(id) as any;if(!a)return null;const results=this.db.prepare('SELECT body FROM results ORDER BY rowid').all().map((r:any)=>JSON.parse(r.body)).filter(r=>r.players.some((p:any)=>p.user_id===id));let streak=0,best=0,wins=0;for(const r of results){if(r.winner_id===id){wins++;streak++;best=Math.max(best,streak);}else streak=0;}return {id,username:a.name,avatar:a.avatar?.startsWith('data:')?`/api/game/avatar/${id}?v=${createHash('sha256').update(a.avatar).digest('hex').slice(0,12)}`:a.avatar||'/default-avatar.svg',bio:a.bio,gamesPlayed:results.length,wins,winStreak:streak,bestStreak:best,totalWilds:0,matchHistory:results.slice().reverse().map(r=>{const p=r.players.find((p:any)=>p.user_id===id);return {id:r.id,date:r.finished_at,tableName:r.table_name,placement:r.winner_id===id?1:2,cardsPlayed:p.cards_played,turns:p.turns};})};}
 close(){this.db.close();}
}
