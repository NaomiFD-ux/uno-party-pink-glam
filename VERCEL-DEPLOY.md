# Proposed publication: Vercel website + separate saved-game server

The Vercel account is accessible in the browser. The user chose to retain the tested game server on a separate host, instead of rewriting saved storage for Vercel Functions.

Prepared, not deployed:

- `vercel.json`: Next.js build and install settings.
- `.vercelignore`: excludes private environment files, runtime accounts, saved games, backups, dependencies and build output.
- Node.js 24 selected in package.json.
- `render.yaml`: proposed single-instance Render 0.5c-512mb game service with a 1 GB persistent disk. This is a paid service; review current pricing and approve the recurring cost before creating it. Nothing has been purchased or provisioned.

Render is a proposed host, not an existing deployment. Its service should own `/var/data/uno`, and the database path must remain under that disk. No development database or test accounts should be uploaded there.

Publication order:

1. Confirm the game-server host and its budget. If using Render, connect the sanitized source and review the 0.5c-512mb service + persistent disk before creation.
2. Choose/reserve the Vercel website's production origin. Enter that exact HTTPS origin in the game service's ALLOWED_ORIGINS.
3. Deploy the server and verify its HTTPS `/health` URL.
4. In the Vercel project, set GAME_SERVER_HTTP_URL to that HTTPS service origin and NEXT_PUBLIC_GAME_SERVER_URL to its WSS origin. Then deploy the website. These values must be set before the website build; do not deploy with localhost addresses.
5. Verify sign-up/login, photos, two different players, invite links, live turns/chat, saved results, and returning after refresh or losing signal on actual iPhones.

Vercel now supports WebSocket connections, but Functions do not provide permanent local SQLite storage or shared in-memory rooms across instances. Retaining the separate server preserves our tested architecture.

References:

- https://vercel.com/docs/functions/websockets
- https://vercel.com/kb/guide/is-sqlite-supported-in-vercel
- https://render.com/docs/disks
- https://render.com/pricing

Current reviewed base estimate: $7/month for the 512 MB service plus $0.25/month for a 1 GB disk = $7.25/month, before taxes and additional usage. Render Hobby workspace is $0/month plus compute. Do not enable a paid workspace or extra resources. The user approved approximately $7.25/month for the server and disk. Render account sign-in is still required. No service has been purchased or provisioned.

## Latest handoff

Private source repository: https://github.com/TaNeekwa/uno-party-pink-glam . The production website build passes with Webpack. The user completed the Render GitHub authorization/account signup steps; Render is awaiting email verification. No Render service, disk, or Vercel deployment has been created yet. Continue after verification, keeping the approved $7.25/month base server/disk budget.
