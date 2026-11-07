# UNO Party · Pink Glam Game Night

Live game: https://uno-party-pink-glam.vercel.app

A Next.js/React/TypeScript website with the pink-glam phone/table designs, a four-bot practice mode, and a separate authoritative WebSocket game server for shared rooms.

Use Node.js 24:

```
npm ci
npm run dev
```

Phone preview: http://127.0.0.1:3000/phone.html

Full website: http://127.0.0.1:3000/

The local preview does not require a Gemini API key. Accounts, profile photos, live rooms and round history save on our own persistent game server; no Supabase is required. The Vercel website and Render game service are live and connected. See [ONLINE-SETUP.md](ONLINE-SETUP.md) for the exact setup, local multiplayer testing, deployment, verified features, and remaining work. The house rules are in [AGREED-RULES.md](AGREED-RULES.md).

Checks: `npm test`, `npm run lint`, `npm run build`, `npm run server:build`. Backups: `npm run backup`.
