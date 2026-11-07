import 'dotenv/config';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync,existsSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
const source=resolve(process.env.ROOM_DATABASE_PATH||'.data/rooms.sqlite');
if(!existsSync(source))throw Error('No saved game database exists yet. Start the server first.');
const folder=resolve(process.env.BACKUP_DIRECTORY||join(dirname(source),'backups'));mkdirSync(folder,{recursive:true,mode:0o700});
const target=join(folder,`uno-${new Date().toISOString().replace(/[:.]/g,'-')}.sqlite`),db=new DatabaseSync(source);
try{db.prepare('VACUUM INTO ?').run(target);chmodSync(target,0o600);}finally{db.close();}
console.log('Saved a consistent database backup to '+target);
