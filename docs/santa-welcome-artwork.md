# Animated Christmas welcome (preview)

The homepage Secret Santa banner opens a new welcome scene. Start Secret Santa opens the existing exchange tools; invitation links still go straight to their invitation or exchange. No game-server or round changes are involved.

Independent layers: scenic WebP, transparent title/hat WebP, transparent Santa sleigh WebP, CSS gold ribbon, falling snow, floating flakes, and bouncing gift icon. Animations use transforms; all decorative layers ignore pointer events. Motion can be paused and honors reduced-motion preferences. Christmas music is a quiet synthesized Jingle Bells arrangement with music-box melody, soft chords and sleigh-bell percussion, enabled by a user tap, with no external music request. It stops on leaving the welcome screen or hiding the page.

Assets in public/game-night:
- santa-welcome-scene.webp
- santa-welcome-title.webp
- santa-sleigh.webp

Generated with the built-in image generation tool, using the supplied Glamorous Secret Santa Game Night.png as the scenic/title style reference. Prompts:

1. Portrait glamorous photorealistic Christmas background, deep burgundy, hot pink, warm gold, tree with large satin bow and star in upper third, snowy pink and gold gifts at lower corners, open burgundy middle for separate title and UI. No text, logos, hats, buttons or navigation.
2. Transparent side-profile Santa in a glossy pink and gold sleigh pulled by three reindeer, moving right, all fully visible, luxurious velvet and gold details. No scenery or text.
3. Transparent exact title “Secret Santa”, luminous warm-white cursive with pink/gold glow, underline and outlined heart, red velvet Santa hat over initial S. Closely match supplied reference. No tree, ribbon, gifts or UI.

Validation: TypeScript, existing 82-test suite, phone viewport review, music toggle on/off, and start-button navigation to the actual demo exchange list. Deployment remains paused for user review.

The welcome title now has a one-shot fade/zoom/glow entrance with staggered sparkles. The homepage banner also enters gently. Fourteen larger snowflake shapes fall independently of the 42 small snow particles. All respect pause and reduced-motion controls.

## Supplied moving sleigh

The user supplied kling_20261110_VIDEO_Santa_s_sl_5510_0.mp4 (5.04 seconds, 1280×720). Its white background is removed locally frame by frame with rembg/u2netp and alpha matting, rather than globally removing white, to retain Santa's white trim. The result is scaled to 576×324 at 16 fps, with a short final hold to make a six-second cycle, saved as santa-sleigh-motion.webp. Original audio is not carried over. The welcome uses this transparent animated WebP in place of the still sleigh; pausing swaps back to the existing still asset. Reduced-motion mode hides the decorative sleigh. The original source is unchanged. Fine antlers and reins may have soft edges from matting; review against the burgundy backdrop before release.

## Alternate transparent Christmas scene

The user next supplied Christmas Sleigh.webm: a 6.52-second 150×86 transparent animation containing Santa, falling flakes and little trees. Its container declares VP9 but its payload decodes with libvpx/VP8; converted locally with that decoder into christmas-sleigh-overlay.webp at 24 fps to preserve alpha and avoid the codec mismatch in browsers. christmas-sleigh-poster.webp supplies the paused image. This preview replaces the flying sleigh with the full overlay in the upper scene, without additional translation because Santa already flies within the clip. The previous sleigh assets remain available. Source resolution is low and visibly soft when enlarged; a larger export would improve quality. No background removal was needed.

## Current selection and exchange-screen artwork

User selected the original still Santa sleigh again; the welcome currently uses santa-sleigh.webp with CSS flight. The video experiments remain unused.

New project asset: public/game-night/santa-exchange-scene.webp, generated with the built-in image tool for setup, hub and wishlist screens. Prompt: portrait 2:3 luxurious burgundy background, empty dark center occupying 75%, narrow snow-dusted evergreen branches and warm fairy lights along left/right edges, small glossy pink/gold gifts in lower corners, fluffy snow along bottom, subtle gold sparkles, no text/logos/buttons/UI, no central tree or Santa. Existing transparent title artwork is reused. Form fields, ribbon, tabs, clipboard/gift icon, cards and buttons are native UI so they stay readable and interactive at phone sizes.

## Glossy exchange-hub revision

User requested closer matching to the supplied Christmas Crew hub reference. New built-in image-generation assets saved in public/game-night:
- wishlist-hub-banner.webp: glossy burgundy 3:1 panel with neon pink rounded border, Santa-hat checklist at left, pink/gold gifts at right, snow along bottom, open dark center, no baked text or buttons.
- exchange-gold-ribbon.webp: transparent sculpted gold satin ribbon with beveled edges, curved center and folded/notched tails, no text. Live exchange name is placed over it.
- wishlist-script-title.webp: transparent warm-white/hot-pink neon calligraphy, exact text “Update Your Wishlist!”.

The title has a live neon pink gift outline above its end. Tabs/buttons have stronger glossy berry highlights and edge shadows. Invitation UI now only shows Invite Friends / Copy Invite Link: no joined count, label “Invite your people,” or visible raw link. Roster rows are tighter and status labels are Wishlist Updated / Update Wishlist. Draw Names is narrower, with glossy active berry and disabled dusty-rose states. Draw eligibility still follows the approved optional-wishlist rule.

Local preview now watches source changes and updates at the same localhost URL; styles refresh automatically, UI-code edits reload the page. Demo database is retained between preview restarts.

## Generated page-heading family

Four transparent finished headers now replace separately overlaid lettering on fixed page titles: santa-header-my-exchanges.webp, santa-header-exchange-details.webp, santa-header-my-wishlist.webp, santa-header-members.webp. Exchange Details is used for creation/setup and the Details tab. All have accessible real h1 text; the integrated artwork is decorative for assistive technology. Dynamic crew names retain the live name ribbon on the hub so arbitrary groups remain supported.

Built-in generation prompt: match supplied Secret Santa title/hat/pink present and heart; create an integrated slim curved metallic gold satin ribbon using the small Exchange Details reference, with exact dark burgundy text “My Exchanges.” No background, other words, UI or scenery. Variants edited only the ribbon lettering to “Exchange Details,” “My Wishlist,” and “Members,” preserving title, hat, gift, composition and transparency. Final assets optimized to 1200px WebP and saved in public/game-night.

Tabs and participant heading/list are now centered in narrower shared columns: tabs 86% desktop / 91% phone, roster 86% desktop / 89% phone. Button widths, label/icon gaps and roster type are reduced to keep Participants and Preparing closer together. Changes refresh in the existing localhost preview.

## My Exchanges cover library

Built-in image generation produced three square images, saved as public/game-night/santa-cover-0.webp through santa-cover-2.webp at 400×400. Prompts: (0) photorealistic glossy red gift with large gold satin bow and ivory heart tag in snow/evergreen/golden bokeh; (1) plush pink velvet Santa sack embroidered with gold snowflakes, gold ties, ivory fur, small gold present in snow; (2) cluster of pink/rose-gold gifts with burgundy satin bows, snow and small evergreen. All use the same luxe burgundy/pink/gold palette and no text. The group list selects a stable default; host uploads override it. Dynamic names use locally served Great Vibes (SIL Open Font License included in public/fonts/OFL-GreatVibes.txt).

## Approved still-image reveal sequence

User paused the 3D/video experiment and chose generated still artwork. Added output/imagegen/secret-santa-gift-opening.png, secret-santa-envelope-emerging.png, secret-santa-name-sample.png, secret-santa-name-blank.png; optimized WebPs in public/game-night. Built-in prompts edit the approved initial concept sequentially: same logo/hat/present, burgundy background and snow; lift original lid with golden inner light; emerge one pink heart-sealed envelope and blank cream gold-bordered card; final envelope/name/button composition; remove only sample Kayla lettering, preserving cream texture and heart. The name-sample is concept-only. santa-name-blank.webp is the asset used by the app, with live text and real accessible button hit areas. Three-dimensional experiment remains unused by the game.

## Post-draw hub banners

Generated santa-names-ready.webp: wide burgundy Christmas banner, luminous pink border, red glitter gift and metallic gold bow at left, blank center for live Names Drawn lettering. Generated santa-shopping-banner.webp: matching wide burgundy/pink Christmas banner, soft pink halo at left for the real member avatar, clear center for live recipient text and wishlist button, pink gift boxes at right, sparkles and fluffy snow along the bottom. Both optimized to 1200px WebP. Names, photos and actions are live UI rather than baked into the artwork.
