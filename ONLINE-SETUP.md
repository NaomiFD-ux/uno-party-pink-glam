# UNO Party · saved accounts and live rooms

Supabase is no longer used. The Next.js website connects to our Node.js game service, which owns account sign-in, profiles/photos, rooms, cards, turn validation, messages, round wins, and history. SQLite on the game server stores the data. Publishing this server with permanent storage makes the same saved game available to everyone online.

## Preview on this computer

Use Node.js 24, then run:

```
npm ci
npm run dev
```

Website: http://127.0.0.1:3000/

Full-screen mobile website: http://127.0.0.1:3000/ (the old /phone.html link redirects here).

The command starts both the website on port 3000 and the game service on 3030. Stop with Ctrl+C. The website responds to the device width without a simulated phone frame. Localhost on an iPhone refers to the iPhone itself.

Create an account using the pink signup page, choose a picture, and save the recovery code. Login accepts email or username. Old browser-only preview accounts are not server accounts: create a new one. Existing preview passwords are not uploaded or migrated. Guests can use the bot practice mode; an account is required to play with friends.

To test two independent players on this computer, use http://127.0.0.1:3000/phone.html for one and http://localhost:3000/phone.html for the other. Create a different account on each origin. Ordinary tabs on the same origin share the same signed-in person.

Create Room → Friends produces a shared code and link. Players join that room, tap their own seat to get ready, and the host deals. Copy Link beside the room code creates a saved personal invitation at the website origin with `?invite=TOKEN`. The page shows the inviter’s name/photo, room name, and current players before sign-in. The invitation stays in the URL during login/signup, then returns to the same preview so the friend can join that exact room. Already-started/full rooms show their availability; private hands and account details are never included in the preview. Existing `?room=CODE` links still join by room code. A returning signed-in player automatically restores their current room and private hand. Joining another device with the same account restores that player's seat; it does not create a second player.

Create Room → Practice retains the four-bot game. Practice rounds do not alter a signed-in player's saved multiplayer statistics. Guest practice history remains browser-local. Round totals at a practice table still appear in its results screen.

## Saved information and account recovery

`.data/rooms.sqlite` contains accounts, password hashes, recovery-code hashes, profile pictures, active rooms/hands, sessions, and completed round results. Account passwords and recovery codes are never stored as plain text. Authentication uses HttpOnly cookies, with Secure cookies in production. WebSocket connections use short-lived, single-use tickets instead of a browser-stored account token. Logging out invalidates that session and disconnects its live connections; recovering an account revokes all of its sessions.

The signup page shows a private recovery code once. Save it somewhere safe. Forgot Password accepts the account name/email, that code, and a new password; it replaces the code and requires a new login. There is no email verification or emailed password reset. Email addresses are account identifiers, not publicly shared contact details. If both the password and recovery code are lost, there is no automatic recovery.

Photos are cropped to JPEG and stored in the server database. Other players receive a small image URL, not the photo bytes on every turn. Avatar URLs can be viewed by someone who has the URL. Profiles/history are read only through the signed-in account's session. Clients cannot set wins, edit somebody else's profile, or submit a round result. Results and room state save atomically; profiles derive statistics from unique completed round records.

Closing the page or losing signal preserves a player's cards and seat. The 15-second turn timer continues while they are away, making legal moves automatically. Exit Game asks for confirmation. Leave Match forfeits the current hand, removes the seat, and lets remaining players continue in turn order; the last remaining player wins. A departing host transfers the host role. Simply closing the page remains different: it preserves the seat for reconnect. A host kick/end-round control is not implemented yet. Closing every browser does not erase the saved room. Use the same account to return.

## Backups

Run `npm run backup` while the game service is available. It creates a consistent SQLite snapshot in `.data/backups/`, with private file permissions. `BACKUP_DIRECTORY` can select another folder. The backup includes account credentials as hashes, pictures, history, and saved games; keep it private and never put it in a source ZIP.

For a hosted server, schedule this command or a host snapshot job and retain copies outside the running service's disk. The command itself is implemented; no recurring hosted backup has been scheduled. To restore, stop the service, preserve the entire old database directory, and restore a selected snapshot as the configured database file into a clean directory before starting. Do not copy only the live main SQLite file while its WAL files are active. Losing the server disk without a backup would lose the saved game data.

## Publish

The Render game server is now live with the user-approved $7.25/month base server + disk setup. The Vercel website is published at https://uno-party-pink-glam.vercel.app . See VERCEL-DEPLOY.md for the current status and exact addresses; real-iPhone verification remains.

Website: deploy the Next.js source to Vercel. Set `NEXT_PUBLIC_GAME_SERVER_URL` to the service's `wss://` URL and `GAME_SERVER_HTTP_URL` to its `https://` URL **before building**. Build with `npm run build`. Website requests to `/api/game/...` are proxied to the game service so account cookies remain on the website's origin. Rebuild when those addresses change.

Game service: use a host that supports a long-running Node.js 24 process, WebSockets, HTTPS, and a persistent disk. Build with `npm ci && npm run server:build`; start with `npm run server:start`. `Dockerfile.game` is also supplied. Set:

- `NODE_ENV=production`
- `ALLOWED_ORIGINS` to the exact HTTPS website origin(s), comma-separated with no trailing slash
- `ROOM_DATABASE_PATH` to a writable database path on the permanent disk, such as `/var/data/uno/rooms.sqlite`
- `PORT` to the host's assigned port

Health check: `/health`. Do not use a host that sleeps midgame or discards its files when deployed. This implementation uses **one** game-server instance with one persistent SQLite disk. Do not enable multiple replicas. Vercel runs the website; it does not run the persistent WebSocket service. Hosting may have a cost.

Development uses loopback and local guest test authentication for automated checks only. The browser's Friends flow always requires an actual account. Production rejects development authentication and non-HTTPS website origins. Do not copy development runtime data/test accounts into a public deployment; start the production database fresh and create real accounts there.

## Verification and limits

Verified: production website/server builds; 27 automated tests covering the house rules, 10-player completion, private hands, stale/illegal moves, live messages, server restart, own-account profile access, username/email login, session revocation, one-time recovery codes, and account login on another device restoring its room, hand, wins, and history. The website's HTTP proxy, session cookies, and backup command were checked locally.

Still needs hosted verification: real iPhones on different networks, backgrounding/returning, long interruptions, production HTTPS cookie handling through the deployed proxy, deployment disk retention, backup scheduling/restoration, and end-to-end invite delivery. Events are sent to all connected players; animation start times can vary with network latency. This is not frame-perfect synchronization. We cannot make an interactive website float above other iPhone apps; returning to the browser restores the saved server game.

## Publication choice

The user chose Vercel for the website and retained the tested server on a separate host. Vercel configuration is prepared and the Render persistent-disk game service has been deployed. Both hosts are connected and the live two-player checks passed. See VERCEL-DEPLOY.md for the publication sequence and proposed recurring cost.


After a completed round, the host can choose **Invite Players** to reopen the same room. Existing round-win totals remain saved; newcomers join at zero wins, everyone readies up, and the host starts the next deal. The room code and saved personal invitation links stay the same.

Settings includes **Change Profile Picture**. Uploads are cropped to a square and resized to 256×256 JPEG before saving to the account; the updated photo is broadcast to the room and appears in invitation previews.


Hold the message button for half a second to open the floating table chat history; a regular tap still opens the composer. The history popup scrolls independently without dimming or blocking the table and can be closed with ×, Escape, or an outside tap. Sender names, local timestamps, dates, and effect labels are shown. The latest 200 messages are saved with the room across reconnects and rounds; public invitation previews do not include chat history.


## Who’s Most Likely To

The host can select UNO or Who’s Most Likely To in the shared waiting room. Editing the game or questions resets readiness. The voting game supports 2–10 players and 10 questions: up to 10 host-written questions play before randomized starter questions. Each player locks one secret vote or passes. The server reveals totals when everyone submits; the host can also reveal early, skip, or finish. Ties award each tied player one spotlight. The recap counts spotlights within this game, separately from UNO wins.

Votes and question order persist with the room. Clients receive only their own vote and submission status until the reveal; the room’s full ballot is never broadcast. Disconnects preserve seats and votes. Explicitly leaving removes invalid ballot choices and transfers the host; with one player remaining the game ends. The host returns everyone to the same waiting room after the recap, allowing another game without new invitations. Chat, voice notes, history, Echo/Slam and profile slaps work in the new game too.
