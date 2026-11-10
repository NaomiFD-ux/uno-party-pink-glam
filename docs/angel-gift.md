# Angel's private gift

The existing `angel` account is resolved at game-service startup and bound to
its permanent account ID, using the same persisted binding mechanism as the
owner power. Renaming the account or reusing its old username does not transfer
access. Development tokens, room hosts and other accounts cannot use the gift.

After refreshing the website and reconnecting, Angel receives a private,
nonblocking love note from TheBaddest. It explains the double-tap area directly
below the DRAW deck. The note works even outside a room; dismissing it is
remembered per account and browser. There is no broadcast or chat message.
The release does not force a browser reload: Angel should refresh once to load
the updated website and receive her surprise.

The invisible touch area is a separate control beneath the deck's DRAW label.
Two nearby primary-pointer taps within 400ms activate it. One tap, dragging,
pointer cancellation or tapping elsewhere does not activate the gift. Keyboard
Enter/Space is also supported. The control is unavailable while disconnected,
dealing, animating a draw, or after a round ends.

The authenticated server selects a random non-Draw-Four card from Angel's hand
and turns that existing card into a Wild Draw Four with score 50. It preserves
card IDs, hand size, turn, deadline, seating, wins and public events. Cards are
saved with the normal room state and follow the normal +4 play rules. The gift
may be repeated while eligible cards remain; an all-+4 hand gets a private
message instead. Angel sees a small success message after each conversion.

Both the website and game service must be deployed. Retain the production
database and back it up before deployment. No migration clears rooms, hands,
accounts or results. Existing rounds continue from their saved state.

Validation: 78 tests, TypeScript and both production builds pass. Added server
tests cover private login capabilities, independent owner/Angel permissions,
spoofed targets, development tokens, stale requests, eligible-card selection,
unchanged round metadata, persistence and real account reconnect. The actual
GameTable and love-note components were checked in a local browser fixture for
single tap, double tap, card update, dismissal persistence and non-Angel views.
