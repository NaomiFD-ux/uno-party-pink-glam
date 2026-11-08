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
- UNO is automatic upon reaching one card, with a small chime; the spoken name announcement was removed on November 8. Later UI refinement calls for a small UNO badge near the picture rather than a large notification banner. No manual-UNO requirement or forgotten-UNO penalty.
- 15-second turns restored on November 8: the game makes a legal move automatically at expiry. No ticking/countdown sound.
- Track rounds won rather than card-point scoring. Every round counts. The previous winner takes the first turn in the next round.
- Daily history of games won and lost.
- Shuffle each round, animate shuffle and dealing, celebrate winners with fireworks.
- Pink Glam Game Night theme, classic UNO-style cards with corner symbols.
- Additional UNO variants later.

## Implementation status

The engine has been updated for the house rules above, with automated tests. Manual UNO penalties are removed. The latest requested 15-second timer now resolves a turn automatically. The local game and How to play use matching-type draw stacks and same-number batches. Normal draw takes one card; any valid hand card or matching-number batch can then be played. Taking a +2/+4 penalty ends the turn. The previous round winner opens the next deal, and the winning play lands card by card before results appear. A separate authoritative WebSocket server now runs shared rooms locally for 2–10 people; server-saved accounts, photos, wins and history are implemented without Supabase. The Vercel website and Render server are now published and passed live two-player checks. Real-iPhone verification remains.

## Agreed setup recovered from the pasted prior reply

Next.js + React + TypeScript; Tailwind CSS; Motion for React; canvas-confetti; Supabase accounts/profiles/photos/statistics/history; a separate authoritative realtime game server; Vercel for the website plus suitable realtime hosting. One 108-card deck, cryptographic Fisher–Yates shuffle, number-card opening discard, and preserved seats/hands after disconnection. See ONLINE-SETUP.md.

## Later setup change approved by the user

Supabase is removed. The existing Node.js realtime service now manages accounts, photos, sessions, room recovery and round history in its persistent SQLite database. The user’s priorities are live shared turns, synchronized room codes/invites, saved round wins, and leaving/returning to the same hand. Public deployment needs permanent disk storage and HTTPS.


## November 8 refinements

Wild and +4 color choices can be cancelled by tapping outside or choosing Cancel before a color is committed. A normal one-card draw permits any valid hand card or matching-number batch; draw penalties still end the turn. The 15-second deadline is authoritative online and uses one legal automatic card play, or a draw/skip when needed. The robot voice is removed. Direction arrows sit between seats, animate in play order, and pause briefly before reversing. Three-player layouts put opponents in the upper corners; hand rows stay compact as cards are played. Chat is centered over the board, with a 16px message input and keyboard viewport positioning. The winning cards land one by one before the winner dialog.
