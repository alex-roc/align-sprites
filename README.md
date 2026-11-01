# align-sprites

Normalize AI-generated sprites and tiles so they work in **Godot 4**, **GDevelop 5** and **Kaplay**: fixed cell sizes, one shared scale, feet-aligned frames, a true pixel grid and clean transparency. Everything runs in your browser; images are never uploaded.

**→ https://alex-roc.github.io/align-sprites/** · [Guide (in the app)](https://alex-roc.github.io/align-sprites/#/guide) · reference copies: [docs/README.md](docs/README.md), [docs/es.md](docs/es.md)

| AI output | After align-sprites |
|---|---|
| ![knight before](docs/img/knight-before.png) | ![knight after](docs/img/knight-after.png) |

## What it does

- **Sprite sheets and single characters**: removes the background (chroma key with edge matting, or flood from the borders for white backgrounds), finds every frame (auto, grid or single), recovers the real pixel grid of "fake" AI pixel art, resizes every character of a batch to the **same height**, shares one palette, and packs the frames into fixed cells (multiples of 32) with the **feet on the same line** (or centred, for effects). Every sprite gets an automatic **collision box**. Videos (MP4/WebM from video models) become frames too.
- **Export**: Godot 4 (`SpriteFrames .tres` + `AnimatedSprite2D .tscn` with the origin at the feet, and a `CharacterBody2D` scene with its collision shape), GDevelop 5 (the cut frames as flat numbered PNGs + origin point; optional Piskel spritesheets), Kaplay (`loadSprite` snippet), generic (Aseprite JSON).
- **World**: turns an AI tile sheet into exact T×T tiles (Godot TileSet, Tiled `.tsx`), composes terrain transitions from two seamless textures (blob 47 with Godot terrains, or dual-grid 16), and makes parallax layers that loop sideways (Godot `Parallax2D` scene).
- **Items**: fits AI sheets of objects and icons into an exact atlas, one slot per item (Godot `AtlasTexture`s, one PNG per item for GDevelop, Kaplay snippet).
- **Kit**: sprites, scenery and objects together: shared palettes (presets, from an image or your own, with batch colour swaps), a game resolution and tile size for everything, and a **playable test level** (Kaplay, with the parallax background behind) to check scale, feet and fps before opening an engine.
- **Prompts**: templates (en/es) with guide images, grouped like the tabs: Sprites (sheets, top-down 4-direction walks, effects, video clips), World (tile textures, atlases, parallax layers) and Items.
- **Guide**: an in-app, bilingual guide (`#/guide`) with a before/after slider, a same-height demo and step-by-step import for each engine.

*Español:* herramienta web gratuita para normalizar sprites y tiles generados con IA (Gemini, ChatGPT…) y usarlos en Godot, GDevelop y Kaplay: celdas fijas, una sola escala, pies alineados y cuadrícula de píxeles real. Ver la [guía dentro de la app](https://alex-roc.github.io/align-sprites/#/guide).

## Development

```sh
pnpm install
pnpm dev               # http://localhost:5173/align-sprites/
pnpm test              # Vitest: core with synthetic fixtures and real AI samples
pnpm test:godot        # headless Godot 4 loads the exported SpriteFrames (skips if Godot is missing)
pnpm test:godot:tiles  # headless Godot 4 checks TileSet terrains with set_cells_terrain_connect
pnpm test:godot:items  # headless Godot 4 loads the item AtlasTextures
pnpm test:godot:parallax  # headless Godot 4 loads the Parallax2D scene
pnpm test:godot:kit    # headless Godot 4 loads a whole kit (sprite, tiles, items, background)
pnpm build
node scripts/run-samples.ts   # process samples/ → samples/out/ for visual checks
node scripts/og-image.ts      # rebuild public/og.png (social preview) from tools/og/og.html
```

Architecture: [dev-docs/architecture.md](dev-docs/architecture.md). Sample sheets: `samples/real/` (real course assets) and `samples/codex/` (generated with our prompts; defects documented in its README).

## License

GPL-3.0-or-later. Includes the [unfake.js](https://github.com/jenissimo/unfake.js) WASM core (MIT), which bundles imagequant (GPL-3.0). Made by Alex Ojeda Copa · [Lab TecnoSocial](https://labtecnosocial.org).
