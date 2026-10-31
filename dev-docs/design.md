# Design system and layout

Subject: a workbench where course students turn messy AI images into game-ready sprites and tiles. Audience: beginners in Godot / GDevelop / Kaplay, Spanish and English speakers, laptops first. Primary job: get from "the AI gave me this" to "it works in my engine", and understand why each step matters.

## Principles

1. **The stage is the hero.** The result (the animation standing on its ground line) is the biggest, most stable thing on screen. Everything else is quieter and serves it.
2. **Colour means something.** Magenta = chroma key / detected frames (what the tool takes away or finds). Yellow = ground line and origin (where the feet go). Cobalt = what you can act on. Nothing else is coloured.
3. **Settings in the order you think.** Style → frames → size → animations → finish (colours, background). Scope ("this image" vs "all images") is shown only when the batch has more than one image.
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
header   [▣ align-sprites]   Sprites  Tiles  Make with AI  Guide            EN|ES  ◐
assets   [thumb run-cycle ×] [thumb hero ×] [+ Add images]          (only when there are images)
┌ settings 360px (scrolls) ┐ ┌ stage (sticky) ───────────────────────────────────────┐
│ Art style  Pixel|Cartoon │ │ Animation | Sheet | Original                          │
│ Frames     Auto|Grid|One │ │ ┌──────────────── dark stage ──────────────────────┐  │
│ Size       height, cell  │ │ │      sprite on the yellow ground line, cell box   │  │
│ Animations list          │ │ └───────────────────────────────────────────────────┘  │
│ Colours                  │ │ ▶  fps  zoom  onion   frame strip (thumbnails)        │
│ ▸ Background (Auto ✓)    │ │ 8 frames · pixel grid 9 px · cell 32×32 · height 32  │
│ ▸ Advanced               │ │ warnings with fix buttons                            │
└──────────────────────────┘ ├ export ───────────────────────────────────────────────┤
                             │ Godot | GDevelop | Kaplay | Other   (one engine)      │
                             │ 3 import steps for that engine · link to guide        │
                             │ [Download for Godot]  [PNG only]                      │
                             └───────────────────────────────────────────────────────┘
```

- Empty state: the stage itself is the drop zone, with the two examples and a three-step "how it works" line.
- Below 1000px: settings stack under the stage; the stage is no longer sticky.
- Tiles uses the same frame (settings left, stage right, export below). Make with AI: form left, prompt + guide image right, then "Open the result in Sprites".
- Routing by hash: `#/sprites`, `#/tiles`, `#/ai`, `#/guide`, `#/guide/<section>`.
