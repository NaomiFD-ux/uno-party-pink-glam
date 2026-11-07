# UNO Party hosting status

## Game server: live

- Service: https://uno-party-game.onrender.com
- Health: https://uno-party-game.onrender.com/health — checked successfully, account authentication enabled.
- Render dashboard: https://dashboard.render.com/web/srv-dbnamqs9v7es73c7vu60
- Service ID: srv-dbnamqs9v7es73c7vu60
- Instance: 0.5c-512mb ($7/month base), Virginia.
- Persistent disk: 1 GB ($0.25/month base), mounted at /var/data/uno. Size/path verified in Render.
- The user approved this approximately $7.25/month base cost, then completed the card step. Paid service is now running; taxes and extra usage can apply.
- Build: npm ci --include=dev && npm run server:build
- Start: npm run server:start
- Health path: /health. Auto-deploy: Off. One instance.
- Environment: NODE_ENV=production; NODE_VERSION=24; PORT=10000; ROOM_DATABASE_PATH=/var/data/uno/rooms.sqlite; BACKUP_DIRECTORY=/var/data/uno/backups; ALLOWED_ORIGINS=https://uno-party-pink-glam.vercel.app.

The live backend passed a two-player check with disposable test accounts: account sessions, a shared room/code, readiness, dealing, private hands, live turns, shared chat/effect event, reconnecting to the same hand/seat, and a completed round with shared wins and saved history. Test sessions were logged out and the test room was left. No real user account or password was used.

## Website: project created, first production deployment pending

Vercel import form is open in the in-app browser, tab 5 (New Project – Vercel), for:

- Team: Naomi Donley’s projects (Hobby).
- Project name: uno-party-pink-glam.
- Private source: https://github.com/TaNeekwa/uno-party-pink-glam .
- Framework: Next.js, settings from vercel.json, production build passed locally.
- GAME_SERVER_HTTP_URL=https://uno-party-game.onrender.com (Production + Preview).
- NEXT_PUBLIC_GAME_SERVER_URL=wss://uno-party-game.onrender.com (Production + Preview; public value).

Deploy was clicked, but Vercel requires a six-digit email security code. The code was sent, and the user was asked to enter it in the Verify Your Identity dialog. Do not resend needlessly or cancel/reload the prepared form. No successful Vercel deployment or public website URL has been confirmed yet; the intended https://uno-party-pink-glam.vercel.app returned 404 before verification.

After verification:

1. Follow this existing deployment; do not create a duplicate project.
2. Verify the actual production website domain. If it differs from the intended domain, update Render ALLOWED_ORIGINS to the exact HTTPS origin and deploy the environment change.
3. Confirm website and account proxy routes respond, secure session cookies work through the website, and the built client uses the Render WSS address.
4. Run the hosted verification through the website proxy (not only directly against the backend), then inspect the actual phone UI. Work verification script is in the parent workspace’s work/verify-hosted.mjs; it uses disposable credentials kept only in memory and does not print them.
5. Verify the game on actual iPhones, including backgrounding and return. Do not claim this device check has already happened.

No development runtime database, backups or test credentials were uploaded. Saved production data is on Render’s attached disk. Source repository is private. The current deployed source commit is 878f9a7dc699bd0bc7b70bdb25807f2b2375edd1; local hosting documentation may be newer.

Manual consistent backups are available with npm run backup; no recurring backup job has been configured. Keep the database under the disk path and use one server instance. Vercel’s website does not store local SQLite data.

## Existing Vercel project recovered

The verification dialog is no longer visible. Retrying the import reported that uno-party-pink-glam already exists. Its existing project is at https://vercel.com/naomi-donleys-projects/uno-party-pink-glam and is linked to this GitHub repository, but currently shows No Production Deployment. Continue in this project; do not create or rename another. A push to main is being used to trigger its first production deployment. Confirm the environment settings and actual public site before calling publication successful.
