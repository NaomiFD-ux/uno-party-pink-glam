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

## Exchange hub and product wishlists

Start Secret Santa opens setup with name, optional budget, gift exchange date, wishlist switch and in-app reminder switch. The welcome also links straight to My Exchanges. Every authenticated member may join multiple exchanges; the group list contains only their memberships and indicates which ones they host. Each group has its own wishlist and assignment. There is no join-by-room-code or QR placeholder: the actual private invitation link is shared by all current members until the draw.

Invitees explicitly confirm joining and committing to the exchange. After joining there is no self-leave action; the host may remove a member before the draw. The host may draw once 3–50 people have joined without waiting for wishlists. Joining, removal, settings and assignments lock at draw. Only the host changes wishlist/reminder settings. Reminders are in-app only, shown during the week before the gift exchange date, with no external messages or background notification scheduling.

The shared hub has Exchange Hub, Wishlist, Details and Members tabs. Others see only a wishlist-ready status, never the actual gifts. Wishlist content is returned only to its author and the assigned giver after revealing their assignment. Old text hints remain readable; structured items are per group. The plus button opens a native accessible modal for a product link and optional note. Product title, image, price/currency and store are parsed from Product JSON-LD or Open Graph metadata. If a store blocks the fetch or omits fields, show a clear partial/link-only preview; do not invent data or require manual product entry. Prices are snapshots, not live quotes.

Server preview route checks authenticated membership before and after the fetch, validates https public targets, resolves and pins a public address on every redirect, limits response size/time and request rate, and rejects private/special network addresses. A short-lived preview is bound to one account and exchange; adding an item consumes it so the client cannot spoof metadata or save it into someone else’s list. Each user may save up to 40 gifts per exchange and add/edit notes up to 600 characters. Edits after the draw update the assigned giver's view. No changes touch UNO rooms, cards, scores or match timers.

Validation: 85 tests passing, website build, server build and TypeScript; tests cover commitment, multiple groups, shared invites, no-wishlist draw, host settings, private product lists, preview binding/single use, post-draw notes, persistence, product metadata and restricted addresses. The existing saved-UNO-match test still passes. Browser review covers setup, group switching, hub, modal preview and save against a real public product page.

Entry routing now checks authenticated memberships before showing the welcome: no exchanges → festive Start Secret Santa welcome; one exchange → its hub; multiple exchanges → My Exchanges. Every member screen retains New exchange. Direct invitation links keep their invitation flow. Membership lookup failures show Retry instead of treating the account as having no groups. The welcome description about drawing names/managing wishlists/budget has been removed. Verified all three membership cases in the browser, plus TypeScript and website build.

## Compact My Exchanges cards and covers

My Exchanges now shows glossy horizontal cards with script names, real participant/budget/date data, host badges, status and a contextual wishlist/assignment action. All, Hosting, Joined and Completed filters use actual memberships and saved completion state. Assignment names appear in the list only for the requester who already revealed that assignment; other members and the host do not gain access to each other's recipients. The intro is higher and smaller, with a bottom Create New Exchange button.

Each exchange receives a stable default from three generated Christmas cover images. The host can replace it from the card's camera button or Details. Browser upload crops and compresses JPG/PNG/WebP into a 400px JPG, validates size, then saves server-side. The server accepts only the host's update and returns custom covers through an authenticated, member-only, no-store route. Original user photo metadata is discarded by canvas re-encoding. No images are uploaded to an outside service. Host can reset to default artwork. These cosmetic changes are allowed after names are drawn and do not alter assignments.

After the draw, the host can mark gifts exchanged and move the group to Completed through Details, with confirmation. This is reversible and preserves assignments, wishlists and group membership. Completion does not happen automatically based on a date.

Tests cover owner-only picture updates, outsider/member cover access, invalid image inputs, restart persistence, requester-only revealed recipient summaries and reversible completion without assignment changes. Browser review covers all four list filters and an actual host image upload/save.

## Live name on approved reveal artwork

After the viewer explicitly reveals their person, SantaNameReveal receives only exchange.recipient.name from the authenticated saved response. The artwork's card is blank: there is no hardcoded Kayla or other name in the production asset. The component types the actual name by grapheme, fits longer account names, waits for the script font and image, and respects reduced-motion preferences. A native dialog keeps the reveal private on screen. View Their Wishlist goes to the saved recipient's gifts; Keep It a Secret closes to Details. The draw endpoint is unchanged and cannot redraw names. Verified with the local demo's real saved assignment: Jordan appeared on the card rather than Kayla. No live exchange was drawn.

## Supplied blank-card video

The user supplied kling_20261111_Creation_so_i_want__183_0.mp4 (720×1280, 24 FPS, 10.04 seconds) with a blank card. The current reveal plays its optimized MP4 at natural 9:16 without cropping. The viewer’s saved recipient name starts typing at media time 6.0 seconds, at 60ms per grapheme. Frame callbacks synchronize it to playback so buffering does not advance the typing. At the end, a matching final-frame poster holds indefinitely. Names remain live text, never a fixed name in the video. Accessible button hit regions align with View Their Wishlist and Keep It a Secret in the final artwork. Wishlist opens the authenticated viewer's saved recipient section; Keep It a Secret closes to Details. Replay restarts only playback/type-out and does not mutate or redraw assignments. A small matching Game Night ♡ badge covers the original corner watermark on-screen. The original source remains unchanged. Sound is on by default; if audible autoplay is blocked, the viewer taps Play reveal with sound. Mute remains available. Skip and reduced-motion fallback go straight to the blank final frame and saved name.

The original file is unchanged; public/game-night/santa-reveal.mp4 is a 3.8MB H.264/AAC fast-start copy, and santa-reveal-video-poster.webp holds its final frame, including original creator attribution. Local preview serves HTTP byte ranges for mobile video playback.

## Name fitting

Live recipient lettering is measured using the actual loaded script font and card bounds, then sized before the type-out finishes. ResizeObserver recalculates for orientation/viewport changes. Long names can wrap within the safe card rectangle; fitting uses the full saved name, so letters do not shrink/jump as they appear. Verified Jeremiah, Al and a worst-case 24-character all-W sample at 390px and 320px phone widths; measured text stayed inside the name rectangle in every case. A separate local /santa-name-preview harness shows sample names without touching actual assignments. The production component still accepts only the authenticated saved recipient name.

## Personal post-draw hub

After the host draws, each member sees a Names Drawn reveal prompt until their own reveal finishes (or they deliberately skip to the final card). Opening then closing the animation early does not acknowledge it. A private, authenticated reveal-viewed action persists the member's progress without changing assignments or the participant revision. Repeated acknowledgments are idempotent. Legacy exchanges use existing revealed progress until migrated.

After acknowledgment the prompt is replaced by the assigned recipient's current profile photo, name and private wishlist action. Compact details, participants and optional reminder panels remain below. Keep It a Secret returns to the hub; View Their Wishlist opens the recipient's private wishlist screen. Replay never redraws. Other members' acknowledgment state and recipients remain independent. Tests cover access controls, premature acknowledgment, per-member isolation, idempotency and restart persistence; all 88 tests and website/server builds passed. Verified an unseen demo member through video completion, refreshed hub and persisted shopping card in the browser. These changes remain local preview only.
