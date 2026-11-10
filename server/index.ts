import 'dotenv/config';
import {createGameServer} from './game-server';
const production=process.env.NODE_ENV==='production';
if(production&&!process.env.ALLOWED_ORIGINS)throw new Error('Set ALLOWED_ORIGINS to the exact HTTPS website URL before running the public server.');
const origins=(process.env.ALLOWED_ORIGINS||'http://127.0.0.1:3000,http://localhost:3000').split(',').map(s=>s.trim());if(production&&origins.some(s=>!s.startsWith('https://')))throw Error('Public accounts require HTTPS origins.');
const server=createGameServer({ownerAccountName:'TheBaddest',angelAccountName:'angel',databasePath:process.env.ROOM_DATABASE_PATH||'.data/rooms.sqlite',allowDevAuth:!production&&process.env.UNO_DEV_AUTH==='1',allowedOrigins:origins,secureCookies:production});
server.http.listen(Number(process.env.PORT||3030),production?'0.0.0.0':'127.0.0.1',()=>console.log('UNO game server ready on port '+(process.env.PORT||3030)));
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,async()=>{await server.close();process.exit(0);});

