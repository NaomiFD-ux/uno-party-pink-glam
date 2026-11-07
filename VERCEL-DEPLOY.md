# UNO Party · live deployment

Website: https://uno-party-pink-glam.vercel.app

The old /phone.html preview link redirects to the full-screen website, preserving invite query parameters.

Game server: https://uno-party-game.onrender.com

Private source: https://github.com/TaNeekwa/uno-party-pink-glam

## Verified publication

Vercel project `uno-party-pink-glam` in Naomi Donley’s projects (Hobby) is deployed successfully. The first production deployment is `BsrdApoAUxAn3vHUCMzxkJsvV1hY`, built from commit `48587104760e6b14657dca3e4533f43ac16813e6`. The import initially created the project without deploying; pushing to its connected main branch completed publication. No further email verification was needed.

Vercel environment values:

- GAME_SERVER_HTTP_URL=https://uno-party-game.onrender.com
- NEXT_PUBLIC_GAME_SERVER_URL=wss://uno-party-game.onrender.com

The live website passed an end-to-end test through its own account proxy: two separate accounts/sessions, shared room codes, readiness/dealing, synchronized turns, private hands, shared chat/effect events, reconnecting to the exact same hand/seat, a completed round with shared win totals, and saved history. Disposable SyncCheck accounts were used; passwords were generated in memory and not printed. Test users left their room and logged out. The actual published phone UI was inspected and saved as a screenshot in the parent outputs folder.

These automated remote checks simulate separate players. They do not replace checking actual iPhones on separate networks, backgrounding Safari, sound playback, and returning after a long interruption.

## Render service and saved data

Dashboard: https://dashboard.render.com/web/srv-dbnamqs9v7es73c7vu60

- Service ID: srv-dbnamqs9v7es73c7vu60
- Name: uno-party-game; region: Virginia.
- Plan: 0.5c-512mb, $7/month base.
- Persistent disk: 1 GB at /var/data/uno, $0.25/month base. Size and mount path verified in Render.
- The user approved the approximately $7.25/month base recurring cost and completed the payment step. Taxes and extra usage can apply. No paid workspace or additional resource was added.
- Build: npm ci --include=dev && npm run server:build
- Start: npm run server:start
- Health: /health (verified 200; server accounts enabled).
- Auto-deploy: Off; one instance only.

Environment: NODE_ENV=production; NODE_VERSION=24; PORT=10000; ALLOWED_ORIGINS=https://uno-party-pink-glam.vercel.app; ROOM_DATABASE_PATH=/var/data/uno/rooms.sqlite; BACKUP_DIRECTORY=/var/data/uno/backups.

Production started with a fresh database. Local accounts, passwords, backups and runtime files were not uploaded. Photos, accounts, sessions, saved rooms/hands and results now live in the server’s database under its persistent disk. Supabase is not used.

## Future changes

Vercel builds pushes to main automatically. Render is manual to avoid restarting live games for website/documentation edits. Deploy backend code changes in Render only when needed; retain the disk and database path. Vercel needs its environment values set before building. If the website domain changes, update ALLOWED_ORIGINS to the exact HTTPS origin and deploy that server setting before testing accounts/live play.

`npm run backup` creates a consistent SQLite snapshot. No recurring backup job has been configured; schedule private backups before relying on the service long term. Do not copy only a live SQLite main file without its active WAL state. Do not scale this implementation beyond one game-server instance or use temporary disk storage.

Closing a page or losing signal preserves the seat. The active turn waits for that person. Host kick/forfeit/end-round controls are not implemented. Forgotten-password recovery uses the private signup recovery code, not email; save that code. Old browser-preview accounts are separate from the live website’s accounts.
