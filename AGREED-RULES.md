# Agreed UNO Party requirements

Recovered from the user's messages in “UNO Website Features” (6aedfa4b-86e4-83ea-8872-b77e495c63d2). These are the user's house rules, not a claim about official UNO rules. Later explicit user changes take precedence.

- Two or more human players online, with room codes. Anyone using the website can create a room.
- Accounts created once, with usernames and profile pictures.
- Multiple same-number cards can be played together, even across colors. The last played card determines the active color.
- Wild Draw Four can be played at any time.
- Draw stacking is allowed only within matching types: +2 on +2; +4 on +4. No mixing. The first player who cannot stack draws the accumulated total.
- Any card may be the final card, including action/draw cards. A final draw card ends the round immediately, with no opponent drawing that penalty.
- Normal drawing is one card, not drawing until playable.
- 7–0 rule off. Jump-in off.
- UNO is automatic upon reaching one card; announce the player's name with sound. Later UI refinement calls for a small UNO badge near the picture rather than a large notification banner. No manual-UNO requirement or forgotten-UNO penalty.
- No turn time limit or forced timeout. No ticking/countdown sound (removed by later request).
- Track rounds won rather than card-point scoring. Every round counts.
- Daily history of games won and lost.
- Shuffle each round, animate shuffle and dealing, celebrate winners with fireworks.
- Pink Glam Game Night theme, classic UNO-style cards with corner symbols.
- Additional UNO variants later.

## Implementation status

The engine has been updated for the house rules above, with automated tests. Manual UNO penalties and forced timeouts are removed. The local game and How to play use matching-type draw stacks and same-number batches. Normal draw takes one card; a playable drawn card can be played immediately, per the later request. A separate authoritative WebSocket server now runs shared rooms locally for 2–10 people; server-saved accounts, photos, wins and history are implemented without Supabase. The Vercel website and Render server are now published and passed live two-player checks. Real-iPhone verification remains.

## Agreed setup recovered from the pasted prior reply

Next.js + React + TypeScript; Tailwind CSS; Motion for React; canvas-confetti; Supabase accounts/profiles/photos/statistics/history; a separate authoritative realtime game server; Vercel for the website plus suitable realtime hosting. One 108-card deck, cryptographic Fisher–Yates shuffle, number-card opening discard, and preserved seats/hands after disconnection. See ONLINE-SETUP.md.

## Later setup change approved by the user

Supabase is removed. The existing Node.js realtime service now manages accounts, photos, sessions, room recovery and round history in its persistent SQLite database. The user’s priorities are live shared turns, synchronized room codes/invites, saved round wins, and leaving/returning to the same hand. Public deployment needs permanent disk storage and HTTPS.
