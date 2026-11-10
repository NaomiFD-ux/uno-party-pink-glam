# Private owner card power

The game service enables this ability for the existing **TheBaddest** account.
At startup it resolves that account's normalized username and saves its permanent
account ID in `owner_power_binding`. Subsequent restarts use the saved ID, even
if the account is renamed. Reusing the old username does not transfer the power.
If the account does not exist at startup, access remains disabled. Restart the
game service after the existing account is available. There is no browser-side
configuration or host-role shortcut that grants this ability.

During an online UNO round, hold a card for 600 milliseconds and choose
**Transform to +4**. Right-click or Shift+F10 also opens the action. Cancel or
Escape closes it. Moving the pointer more than 10 pixels, leaving the card, or
cancelling the touch cancels the hold. A completed hold does not also select or
play the card. There is no per-round conversion limit, and cards may be changed
outside the owner's turn. Dealing and finished rounds reject transformations.

The server checks the current authenticated account session, room membership,
room revision and ownership of the selected card. Development sign-ins cannot
use the power. It changes the existing card's color, value and score to
`wild`, `wild4` and `50`, preserving its ID and the total number of cards.
Converted cards are persisted and follow the existing Wild Draw Four rules,
including color selection, draw stacks and the existing last-card win rule.
Transforming does not play a card, advance the turn or reset its deadline.

Only the authorized account receives the capability flag. The action creates no
chat message, public event or house-rule announcement. Other participants keep
seeing only hand counts until the converted card is played normally. Other
players' special abilities are outside this change.

Deploy both the website and the persistent game service. On the first game
service restart, confirm that the production database contains TheBaddest;
the owner binding is stored alongside the existing saved rooms and accounts.
Back up that database with the normal game database backups.

Validation: `npm test`, `npm run lint`, `npm run server:build`, `npm run build`.
The owner integration tests cover authenticated access, spoofing, development
tokens, stale revisions, private views, saved cards, renames, restart, real +4
play and draw effects, and host transfer. Browser verification used the actual
GameTable with a local test fixture to check the hold, confirmation, updated
card and unavailable non-owner menu.
