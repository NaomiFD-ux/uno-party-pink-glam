# Secret Santa

Secret Santa is separate from UNO rooms. Open **Santa** in the mobile navigation,
**Secret Santa** in the desktop navigation, or **Plan Secret Santa** on Home.
Create an exchange with a name, optional gift budget and optional date; the
default date is December 25 of the current year. The organizer participates.

Copy the private invitation link and send it to the group. Each person joins
using their own Game Night account; they do not need to play UNO or join a game
room. The invitation remains in the address through account signup or login.
Invitations show the exchange details and organizer, then require an explicit
join. Returning members can reopen the same exchange through their link or
their account's exchange list.

An exchange supports 3–50 people, without exclusions. Participants can leave,
and the organizer can remove someone, before names are drawn. Review the roster
and confirm **Yes, draw names now** when everyone is in. Server-side revision
checks reject a draw if the roster changed during review.

Names are drawn once. Every participant gives one gift and receives one, and
nobody is assigned themselves. The server uses a cryptographically randomized
Sattolo permutation, which gives each person equal chances of each other person
and forms one gifting cycle. Assignments, roster and draw status then lock;
there is no redraw or post-draw membership editing.

Participants may save an optional wishlist before or after names are drawn. Only their assigned giver can see it, after revealing the recipient; other members and the organizer cannot browse everyone’s wishlists.

Each person presses **Reveal my person** privately. The organizer gets only
their own recipient, not the group's assignment list. Unrevealed recipients
are not included in exchange responses. No assignments are sent over room
WebSockets, public invitation previews or chat. There are no automatic emails
or messages; users share their invitation links themselves.

Exchanges live in the `gift_exchanges` table in the existing persistent SQLite
database and are included in normal game database backups. Joining, drawing,
revealing and reopening exchanges do not edit UNO room state, hands, wins,
seating or deadlines. Navigation into Secret Santa preserves an existing room
connection; deep links stay on Secret Santa after the game reconnects.

Deploy both the website and game service, retaining the persistent database.
The table is added automatically; no existing rows are cleared. Tests cover
assignments, authorization, private reveals, stale rosters, repeated draws,
membership changes, revoked sessions, restart recovery and an unchanged active
UNO match. Browser checks use disposable local accounts and do not draw names
for a real group.
