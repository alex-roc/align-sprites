# Design system and layout

Subject: a workbench where course students turn messy AI images into game-ready sprites and tiles. Audience: beginners in Godot / GDevelop / Kaplay, Spanish and English speakers, laptops first. Primary job: get from "the AI gave me this" to "it works in my engine", and understand why each step matters.

## Principles

1. **The stage is the hero.** The result (the animation standing on its ground line) is the biggest, most stable thing on screen. Everything else is quieter and serves it.
2. **Colour means something.** Magenta = chroma key / detected frames (what the tool takes away or finds). Yellow = ground line and origin (where the feet go). Cobalt = what you can act on. Nothing else is coloured.
3. **Settings in the order you think.** Style (compact switch in the column header) → sprite size → frame size → image type, frames, animations → folded finishing touches (colours, background, advanced). Scope is shown only when the batch has more than one image: the column then splits in "For all images (N)" and "Only «name»".
4. **Every warning carries its fix.** A warning is a sentence plus a button that applies the fix (bigger cell, switch to grid, lower tolerance).
5. **Teach in place.** Short hints next to controls, the full explanation one click away in the Guide tab (`#/guide/<section>`).

## Tokens

Light / dark (`light-dark()`, `data-theme` forces one):

| Token | Light | Dark | Use |
|---|---|---|---|
| `--paper` | #F1F0F6 | #15131F | page background |
| `--panel` | #FFFFFF | #1E1B2B | panels |
| `--panel-2` | #F7F6FB | #252236 | inset areas, inputs |
| `--ink` | #1E1A33 | #ECEAF6 | text |
| `--ink-soft` | #5F5A78 | #A7A2C2 | secondary text |
| `--line` | #DCD9E8 | #322E45 | borders |
| `--stage` | #2A2640 | #100E19 | the stage (always dark) |
| `--stage-check-a/b` | #34304C / #2C2842 | #1B1828 / #15131F | transparency checker on the stage |
| `--action` | #3346D3 | #8C9BFF | buttons, selection, focus, links |
| `--action-ink` | #FFFFFF | #10122E | text on action |
| `--key` | #E01BD6 | #FF5CF4 | detected frames, chroma key |
| `--ground` | #FFC531 | #FFC531 | feet line, origin cross |
| `--ok` / `--warn` / `--danger` | #1F8A4C / #9A5B00 / #C0362C | #5BD48C / #FFB547 / #FF8A7A | status |

Radii: 14px for top-level regions (stage, settings column, export), 8px for controls, 4px for chips. Shadows: none, except the stage (inner shadow) and popovers.

## Type

- **Pixelify Sans** (@fontsource/pixelify-sans): wordmark and the large stage numbers only (frame counter). Nowhere else.
- **Atkinson Hyperlegible Next** (@fontsource-variable/atkinson-hyperlegible-next): everything else, chosen for legibility for students. Numbers use `font-variant-numeric: tabular-nums` instead of a monospace face.
- Scale: 13 / 15 (body) / 17 / 21 / 28. Sentence case everywhere; no all-caps labels, no eyebrows, no middle-dot meta strings.
- Prose (Guide) at most 68ch, line-height 1.6.

## Layout

```
header   [▣ align-sprites]   Sprites  World  Items  Kit  Make with AI  Guide        EN|ES  ◐
assets   [thumb hero-run ×] [thumb hero ×] [+ Add images]          (only when there are images)
┌ settings 360px (scrolls) ┐ ┌ stage (sticky) ───────────────────────────────────────┐
│ Art style  Pixel|Cartoon │ │ All together | Animation | Final sheet | Original      │
│ Sprite size  8…128 Other │ │ ┌──────────────── dark stage ──────────────────────┐  │
│ Frame size  Auto|Custom  │ │ │  sprite(s) on the yellow ground line, frame box   │  │
│ Image type, Frames,      │ │ └───────────────────────────────────────────────────┘  │
│ Animations (sheet only)  │ │ ▶ fps zoom onion   frame strip (whole-frame thumbs)    │
│ ▸ Colours (palette)      │ │ frame editor: move, duplicate, remove, nudge           │
│ ▸ Background (Auto ✓)    │ │ frames 8 · AI pixel 9 px · frame size 32×32 · height 32│
│ ▸ Advanced               │ │ warnings with fix buttons                              │
│ Colour variants          │ ├ export ───────────────────────────────────────────────┤
└──────────────────────────┘ │ Godot | GDevelop | Kaplay | Other   (one engine)       │
                             │ import steps · [Download the 2 images for Godot 4]     │
                             └───────────────────────────────────────────────────────┘
```

- Empty state: the stage itself is the drop zone, with the two examples and a three-step "how it works" line.
- Below 1000px: settings stack under the stage; the stage is no longer sticky.
- World (one tool at a time, chosen in the tab and kept in the route) and Items use the same frame (settings left, stage right, export below). Make with AI: form left, prompt + guide image right, then "Open the result in Sprites".
- A single sprite hides everything animated (fps, play, onion skin, strip, counter, animations, frames, Final sheet); views are Sprite | Original.
- Kit (`#/kit`): game tile size and shared palette on the left; summary, a real-scale preview (sprites on a row of the kit's tiles) and one download per engine on the right.
- Routing by hash: `#/sprites`, `#/world[/<tool>]` (`sheet`, `terrain`, `parallax`; `#/tiles` is an alias), `#/items`, `#/kit`, `#/ai`, `#/guide`, `#/guide/<section>`.
