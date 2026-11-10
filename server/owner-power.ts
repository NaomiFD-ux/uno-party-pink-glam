import type {Store} from './store';
import {accountNameKey} from './store';
import type {Round} from '../src/utils/round';

// Resolve an existing account once and persist its immutable ID. A renamed or
// newly registered account cannot acquire the power by taking the old name.
export function bindOwner(store:Store,name?:string):string|undefined {
 if(!name)return undefined;
 store.db.exec('CREATE TABLE IF NOT EXISTS owner_power_binding(name_key TEXT PRIMARY KEY,account_id TEXT NOT NULL)');
 const key=accountNameKey(name);
 const saved=store.db.prepare('SELECT account_id FROM owner_power_binding WHERE name_key=?').get(key) as {account_id:string}|undefined;
 if(saved)return saved.account_id;
 const account=store.db.prepare('SELECT id FROM accounts WHERE name_key=?').get(key) as {id:string}|undefined;
 if(!account)return undefined;
 store.db.prepare('INSERT INTO owner_power_binding VALUES(?,?)').run(key,account.id);
 return account.id;
}

export function transformOwnerCard(round:Round|null,actorId:string,cardId:unknown):Round {
 if(!round||round.winner)throw Error('This round is not running.');
 const player=round.players.find(p=>p.id===actorId);
 if(typeof cardId!=='string'||!player?.hand.some(c=>c.id===cardId))throw Error('Choose a card in your hand.');
 return {...round,players:round.players.map(p=>p.id!==actorId?p:{...p,hand:p.hand.map(c=>c.id===cardId?{...c,color:'wild',value:'wild4',score:50}:c)})};
}
