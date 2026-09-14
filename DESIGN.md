# Design Brief

## Direction

SoundWave — a dark, premium social music app where every upload is a post in a Twitter-style feed, anchored by a persistent audio player, now extended with direct messaging, comments, recommendations, and playlists.

## Tone

Dark, high-energy music-app aesthetic — near-black violet-charcoal surfaces with electric violet + hot magenta accents, confident and immersive like a nightclub feed.

## Differentiation

Live animated equalizer bars embedded in every card and the persistent player make the feed feel sonically alive, while message bubbles and thread cards carry the same violet-charcoal rhythm into social surfaces.

## Color Palette

| Token      | OKLCH           | Role                              |
| ---------- | --------------- | --------------------------------- |
| background | 0.13 0.02 285   | near-black violet-charcoal canvas |
| foreground | 0.95 0.01 285   | primary text                      |
| card       | 0.17 0.025 285  | feed card surface                 |
| primary    | 0.62 0.24 300   | electric violet CTA/play          |
| accent     | 0.68 0.22 330   | hot magenta like/active           |
| muted      | 0.21 0.03 285   | secondary surface                 |
| border     | 0.26 0.03 285   | hairline dividers                 |
| bubble-own | 0.62 0.24 300   | sent message bubble               |
| bubble-other | 0.24 0.03 285 | received message bubble         |
| thread     | 0.19 0.03 285   | comment/reply card surface        |
| conversation | 0.17 0.025 285 | conversation list surface       |
| unread     | 0.68 0.22 330   | unread message indicator          |
| recommend  | 0.17 0.025 285  | recommendation card surface       |
| playlist   | 0.17 0.025 285  | playlist card surface             |

## Typography

- Display: Space Grotesk — headings, track titles, hero, message names
- Body: DM Sans — captions, UI labels, feed text, message text
- Mono: JetBrains Mono — timestamps, play counts, durations, unread counts
- Scale: hero `text-4xl md:text-6xl font-bold tracking-tight`, h2 `text-2xl font-bold tracking-tight`, label `text-xs font-semibold tracking-widest uppercase`, body `text-base`

## Elevation & Depth

Elevated cards on a flat background with a soft elevated shadow; the persistent player floats above content with a dedicated `player` top shadow; conversation and thread surfaces sit slightly lighter than the canvas to read as nested panels.

## Structural Zones

| Zone          | Background     | Border   | Notes                              |
| ------------- | -------------- | -------- | ---------------------------------- |
| Header        | bg-background  | border-b | sticky top nav, brand + tabs       |
| Content       | bg-background  | —        | feed cards alternate bg-card rows  |
| Conversation  | bg-conversation| border-r | chat list panel, active row tint   |
| Thread        | bg-thread      | border   | message/comment bubbles on thread  |
| Player        | bg-card        | border-t | fixed bottom, shadow-player        |
| Footer        | bg-muted/40    | border-t | minimal, inside scroll area        |

## Spacing & Rhythm

Generous card gaps (gap-4) with tight internal micro-spacing (gap-2) for dense action rows; feed column max-w-2xl centered; conversation thread max-w-3xl with bubbles grouped by sender and reply chains indented (ml-8).

## Component Patterns

- Buttons: rounded-full pills; primary uses gradient-primary, ghost for icon actions
- Cards: rounded-2xl, bg-card, border-border, shadow-elevated on hover
- Badges: rounded-full, bg-muted, mono text for counts
- Message bubbles: rounded-2xl with clipped corner (rounded-br-md own / rounded-bl-md other), max-w-[78%]
- Comment thread: bg-thread cards, replies indented with border-l-2 rail
- Player: rounded-t-2xl elevated bar with eq animation, progress track, transport controls

## Motion

- Entrance: `animate-fade-up` staggered on feed cards; `animate-bubble-in` on new messages
- Hover: cards lift with shadow-elevated + subtle scale; conversation rows tint bg-muted
- Decorative: `animate-eq-bounce` equalizer bars; `animate-like-pop` on like toggle; `animate-pulse-dot` on unread indicators

## Constraints

- Token-only styling: no raw hex/rgb, no arbitrary Tailwind colors
- Dark mode is primary; light mode mirrors the same hue family
- Persistent player must remain legible above content at all breakpoints
- Existing feed and persistent player styling must not change
- doNotBuild (push-style real-time delivery, group conversations) gets no visual zones

## Signature Detail

The animated equalizer bars that live in every feed card and the persistent player — a living waveform identity that turns the feed into a soundscape, now echoed in message and thread surfaces.
