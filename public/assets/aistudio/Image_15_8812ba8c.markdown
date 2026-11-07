---
name: Pink Glam Game Night
colors:
  surface: '#fff8f8'
  surface-dim: '#ffcddb'
  surface-bright: '#fff8f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff0f2'
  surface-container: '#ffe8ed'
  surface-container-high: '#ffe1e8'
  surface-container-highest: '#ffd9e3'
  on-surface: '#3e001e'
  on-surface-variant: '#574048'
  inverse-surface: '#650034'
  inverse-on-surface: '#ffecf0'
  outline: '#8b7079'
  outline-variant: '#debec8'
  surface-tint: '#b4136d'
  primary: '#b10e6b'
  on-primary: '#ffffff'
  primary-container: '#d23284'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb0cd'
  secondary: '#ae236b'
  on-secondary: '#ffffff'
  secondary-container: '#fd64aa'
  on-secondary-container: '#68003c'
  tertiary: '#87466d'
  on-tertiary: '#ffffff'
  tertiary-container: '#a45e86'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd9e4'
  primary-fixed-dim: '#ffb0cd'
  on-primary-fixed: '#3e0022'
  on-primary-fixed-variant: '#8c0053'
  secondary-fixed: '#ffd9e4'
  secondary-fixed-dim: '#ffb0cd'
  on-secondary-fixed: '#3e0021'
  on-secondary-fixed-variant: '#8c0053'
  tertiary-fixed: '#ffd8ea'
  tertiary-fixed-dim: '#ffaeda'
  on-tertiary-fixed: '#3a0329'
  on-tertiary-fixed-variant: '#6f3157'
  background: '#fff8f8'
  on-background: '#3e001e'
  surface-variant: '#ffd9e3'
typography:
  display-lg:
    fontFamily: Outfit
    fontSize: 56px
    fontWeight: '800'
    lineHeight: 64px
  display-lg-mobile:
    fontFamily: Outfit
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-sm:
    fontFamily: Outfit
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-lg:
    fontFamily: Outfit
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 20px
  label-md:
    fontFamily: Outfit
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Outfit
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system defines an upscale, high-energy digital card table atmosphere blending tactile game-night nostalgia with runway glamour. The design style combines **Tactile Glamour** and **Luminous Glassmorphism**: rounded, pillowy geometries, soft satin sheens, glossy rim highlights, and dynamic neon-hot-pink glow effects.

The target audience seeks a celebratory, socially connected multiplayer experience that feels joyful, cheeky, and visually luxurious rather than utilitarian or arcade-gritty. Interactions must feel springy, tactile, and sparkling, evoking physical enamel game chips, lacquered cards, and plush berry felt.

## Colors

The palette balances luminous pearl backgrounds, vibrant hot pink interactive elements, rich berry felt surfaces, and high-contrast burgundy typography:

- **Primary (`#EC4899`)**: Hot Pink. Used for primary CTAs, active player halos, interactive glows, and winning banners.
- **Secondary (`#B92D74`)**: Berry Pink. Serves as the central card-table felt hue, deep container backdrops, and active toggle fills.
- **Tertiary (`#F9A8D4`)**: Blush Pink. Used for card rim highlights, gentle divider lines, and pill outlines.
- **Neutral (`#881B4D`)**: Deep Burgundy. Provides high-contrast readability for headings, labels, and primary icons without harsh near-black tones.
- **Surface Light (`#FFF1F7`)**: Pearl Pink. The primary canvas backdrop, providing a warm, radiant ground.
- **Surface Bright (`#FFFFFF`)**: Pure White. Used for glossy top-edge rim reflections and card face backgrounds.

### Game Card Deck Palette
- **Deck Red**: `#EF4444`
- **Deck Blue**: `#3B82F6`
- **Deck Green**: `#10B981`
- **Deck Yellow**: `#F59E0B`
- **Wild / Black**: `#1F2937`

## Typography

Typography pairs **Outfit** for headings and labels with **Inter** for gameplay status indicators and chat messages. Outfit delivers geometric, sculpted, glamorous personality with circular shapes that echo the card graphics. Inter ensures numerical clarity, card count legibility, and effortless reading during quick turns.

- Headings and large score callouts use Outfit Bold (`700`) or Extra Bold (`800`) with tight tracking (`-0.02em`).
- In-game stats, player labels, and button labels employ Outfit Medium (`600`) in uppercase with spaced tracking (`+0.05em`).
- Player chat, card descriptions, and rule explanations use Inter Regular (`400`) and Medium (`500`).

## Layout & Spacing

The layout centers around an organic, radial felt game table anchored within a 12-column adaptive layout for lobby and post-game dashboards.

- **Mobile (< 768px)**: Edge margins set to `margin` (`1rem`). Player hand docks horizontally across the bottom with a peek-ahead scroll. Sidebars collapse into floating pearl modal sheets.
- **Tablet (768px - 1024px)**: Outer margins set to `margin-md` (`1.5rem`). Circular table occupies the upper 60% viewport; player dock rests anchored below.
- **Desktop (> 1024px)**: Max container width pinned to 1440px with `margin-lg` (`2.5rem`). Central card felt anchors the table view with floating player pods arranged radially at 60-degree increments, flanked by collapsible chat and score rails.

## Elevation & Depth

Visual hierarchy uses radiant pearl glassmorphism, directional top-edge gloss highlights, and hot-pink ambient luminescence:

- **Level 0 (Table Base)**: Rich berry-pink felt (`#B92D74`) with an inward ambient vignette (`inset 0 0 80px rgba(136, 27, 77, 0.45)`).
- **Level 1 (Panels & Trays)**: Pearl pink (`#FFF1F7`) at 90% opacity with `backdrop-filter: blur(16px)`, a top inset rim highlight (`inset 0 1px 0 rgba(255, 255, 255, 0.9)`), and soft pink shadow (`0 8px 24px -4px rgba(236, 72, 153, 0.18)`).
- **Level 2 (Cards & Tiles)**: Pure white surface with double border (outer: 1px `#F9A8D4`, inner: 1px `#FFFFFF`), elevated by `0 12px 28px -6px rgba(136, 27, 77, 0.22)`. Hover states shift cards vertically by `-12px` and intensify the glow.
- **Level 3 (Active Player / Turn Halos)**: Multi-layer outer glow (`0 0 0 3px #FFFFFF, 0 0 20px 4px rgba(236, 72, 153, 0.65)`).
- **Level 4 (Modals & Victory Overlays)**: Floated centered sheets with dramatic deep burgundy backdrops (`rgba(136, 27, 77, 0.65)` blur 12px) and concentrated sparkle drop shadows (`0 24px 64px rgba(185, 45, 116, 0.4)`).

## Shapes

The design system uses level `3` (Pill-shaped) geometry to reinforce a friendly, cosmetic-inspired glamour.

- **Buttons & Pills**: Completely pill-rounded (`border-radius: 9999px`).
- **Cards**: Soft, exaggerated rounded corners (`border-radius: 1.25rem` / `20px`) with an aspect ratio of 2:3.
- **Game Table**: Continuous stadium/oval contours (`border-radius: 9999px` or `50%`).
- **Panels & Dialogs**: Ultra-rounded corners (`border-radius: 2rem` / `32px`).

## Components

### Buttons
- **Primary Glam Button**: Pill-shaped (`roundedness: 3`), linear gradient fill from `#F472B6` to `#EC4899`. Topped with a subtle glossy white crescent highlight (`inset 0 1px 1px rgba(255, 255, 255, 0.8)`). Label in white Outfit Bold. Hover triggers a hot-pink ambient aura (`0 0 18px rgba(236, 72, 153, 0.5)`) and slight upward scaling (`scale(1.03)`).
- **Secondary / Ghost Button**: Translucent pearl background (`rgba(255, 241, 247, 0.7)`), 1.5px border in `#F9A8D4`, deep burgundy label text (`#881B4D`).

### Game Cards
- **Hand Display**: Overlapping hand cards with a standard rotation fan (`-12deg` to `+12deg`). Active hover elevates the target card 24px, applies a `#EC4899` focus outline, and increases card scale to 1.1x.
- **Card Anatomy**: Pure white core border, saturated colored oval center (`#EF4444`, `#3B82F6`, `#10B981`, `#F59E0B`), high-contrast center glyph, and dual mini corner pips.

### Turn Indicator & Player Rings
- Circular avatar pods encased in an enamel ring.
- **Active Turn**: Animated rotating gradient rim shifting between `#FFFFFF`, `#F9A8D4`, and `#EC4899` with sparkle particle accents orbiting the ring.
- **Inactive**: Muted berry border (`rgba(249, 168, 212, 0.4)`) with dimmed avatar opacity.

### Chips & Badges
- Pill capsules (`padding: 0.25rem 0.75rem`) featuring a solid pearl background, 1px blush pink border (`#F9A8D4`), and uppercase burgundy label (`#881B4D`).
- Card count counter badges display in Hot Pink with white numerals.

### Form Inputs
- Pill-shaped text fields with a pale pearl background (`#FFF1F7`), bordered with `#F9A8D4`.
- On focus: Transition border to `#EC4899` with a soft 3px diffused outer halo (`rgba(236, 72, 153, 0.2)`).

### Sparkle Accents
- Four-point diamond sparkles (`✦`) in pure white or shimmering `#F9A8D4` placed contextually on game triggers, card draws, and victory modals.