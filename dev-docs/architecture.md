# Architecture

align-sprites is a static web app (Vite + React + TypeScript). Everything runs in the browser; heavy work runs in a Web Worker. The processing core (`src/core/`) is pure TypeScript over `RGBAImage {width, height, data}` with no DOM, so it runs unchanged in the worker and in Vitest (Node).

## Layout

```
src/core/types.ts        shared contracts (read this first)
src/core/image.ts        createImage, crop, blit, alphaBBox, resizeNearest…
src/core/color.ts        sRGB→Lab, ΔE, distanceTo(ref)
src/core/pixel/unfake.ts adapter over the unfake.js WASM core (grid detection, grid downscale, quantize)
src/core/bg/             background detection/removal
src/core/segment/        frame segmentation (grid / auto)
src/core/measure/        per-frame metrics (bbox, feet, horizontal anchor)
src/core/resample/       area resampling for cartoon art
src/core/pack/           fixed-cell sheet packing, feet-anchored
src/core/pipeline/       runSpriteJob / runBatch (orchestration)
src/core/export/         PNG/ZIP + Godot, GDevelop, Kaplay, generic (Aseprite JSON)
src/core/prompts/        prompt templates + guide grid image
src/core/tiles/          tile atlas normalizer + terrain transition composer (phase 2)
src/core/inspect/        inspectImage: bg + sheet/single + frame count + source height on a <= 512 px copy
src/core/frames/         findDuplicateFrames, frameDifference, flipCellX (frame editor helpers)
src/core/palette/        PALETTES presets, hex helpers, paletteFromImage, remapToPalette, applyColorMap, imageColors
src/core/kit/            buildKitExport: sprites + tiles of a session, per engine
src/worker/              Comlink worker implementing PipelineApi (src/worker/api.ts)
src/ui/, src/i18n/       React UI; every UI string lives in src/i18n (en + es, same keys)
src/vendor/unfake/       vendored unfake.js WASM (MIT; bundles imagequant, GPL-3.0 → project is GPL-3.0-or-later)
tests/                   Vitest; tests/fixtures/synth.ts builds deterministic AI-like sheets
samples/real/            real AI-generated assets used for manual/regression checks
tools/godot-validate/    headless Godot 4 project that loads and checks exported .tres
```

## Sprite pipeline (runSpriteJob)

1. **Background**: `detectBackground` takes the dominant border colour. `removeBackground`:
   - strategy `global` for chroma keys (magenta/green): also empties enclosed holes (between arm and body). Lighter/darker shades of the key (same hue ±12°, saturation ≥ 0.75, value ≥ 0.6: `keyShade`) count as background, because the AI redraws the guide lines a bit darker (≈ΔE 19);
   - strategy `flood` (default for white/other colours): bg regions connected to the border, so a cream tunic on a white background survives; on light backgrounds also enclosed *flat* pockets (≥ 75 % of their pixels within ΔE 3 of the bg, ≥ `minHole` px), e.g. the gap between the feet. Painted whites (eyes, teeth) are shaded (≤ 65 % flat, measured) and stay. Dark backgrounds skip this rule: pupils and outlines are flat dark too;
   - pixel mode → binary alpha; cartoon mode → soft alpha + despill.
2. **Segmentation** on the alpha: `sliceGrid` (rows×cols, cut lines snapped to empty gutters), `findFrames` (connected components, merge, reading order), `single`, or manual rects.
3. **Pixel grid** (pixel mode only): `detectGrid` ONCE on the whole sheet → period P. Each frame crop is downscaled with `gridForScale(crop, P)` (phase re-fitted per frame) + `downscaleGrid(..., 'dominant')`, then alpha binarized. The dominant vote also kills 1-px magenta/white halos.
4. **Scale**: refHeight = median bbox height of the first animation's frames. One scale per character:
   - pixel: native unless `targetHeight` differs by > 10 %; then re-downscale **from the original crop** with period `P · refHeightNative / target` (single resample, no double scaling);
   - cartoon: `resampleScale(crop, target / refHeightSource)` with premultiplied area filter.
   In a batch every job shares `targetHeight` (times its `relative`), so all characters end up at the same scale.
5. **Palette** (pixel, optional): quantize an atlas of every frame of every job once → shared palette → remap each frame.
6. **Measure** each normalized frame: bbox, footY (last row with ≥ 2 opaque px), anchorX (weighted median of column alpha counts).
7. **Pack**: one row per animation; anchorX → floor(cell.w/2), footY → cell.h − 1 − padBottom. Cell `auto` = smallest multiple of 32 per axis that fits.

## Export

One ZIP, folder per target: `godot/<name>/` (png + SpriteFrames .tres + AnimatedSprite2D .tscn with the origin at the feet), `gdevelop/<name>/<anim>/…png` + README, `kaplay/<name>.png + .js` (single-frame sheets export as static sprites, see below), `generic/<name>.png + .json` (Aseprite hash). Godot `.tres` uses relative `path` without uid: copy the folder into the project as is.

## Inspect, frames, palette, kit (src/core)

- `inspectImage(img, mode)` reduces the image to a longest side of 512 px (nearest), runs `autoBgOptions` + `removeBackground` + `findFrames` and returns `{bg, kind, frameCount, sourceHeight}` (height rescaled to ORIGINAL px, ~20-40 ms for 1500 px sheets). Regions under 10 % of the largest bbox area are parts (a sword held away from the body), not frames, so such a character stays `single`.
- `frames/`: `findDuplicateFrames(cells, tolerance = 0.45)` groups packed cells by `frameDifference` (share of differing pixels, RGB/alpha delta > 24, over the pixels opaque in either frame), comparing each cell with the first of every group (no chaining). 0.45 was measured on the Codex samples: fox repeats 0.29-0.37, nearest distinct poses (knight) 0.55 (see `DUPLICATE_TOLERANCE`). `flipCellX` mirrors a cell around column `floor(w/2)`; `AnimSpec.flipX` is applied by `packFrames` on the frame itself (mirror around its anchor, nothing is cut), and `placementMetrics` makes `cell: 'auto'` account for mirrored/nudged placements.
- `SpriteJob.frameOffsets` (keyed by detected frame index, so every animation using the frame gets the same nudge) goes to `packFrames(..., { offsets })`. `SpriteJob.palette` (pixel only) remaps every frame to the nearest ΔE colour with `remapToPalette` (no dithering) and wins over `maxColors`; cartoon ignores it (it would posterize the antialiasing). `colorMap` is applied last, to every frame and to `diag.palette`. Tiles take `palette` in `normalizeTileAtlas` options and `composeTransitions(..., { palette })`.
- `palette/`: presets with the published hex values (PICO-8, Sweetie 16, Endesga 32, Game Boy; checked against lospec). `kit/buildKitExport(kit, target)` reuses the per-engine exporters: `<target>/sprites/…` (the usual export), `<target>/tiles/…` (Godot `.tres`; GDevelop/generic atlas PNG + Tiled `.tsx`; Kaplay atlas PNG + `loadSprite(name, png, { sliceX, sliceY })` snippet) and `<target>/README.txt` (en + es: sprite heights, frame sizes, animations, tile size, palette).
- A sheet with ONE animation of ONE frame is a static sprite (`isStatic` in `export/common.ts`): Godot exports a `Sprite2D` scene (no SpriteFrames), GDevelop a single PNG + README, Kaplay a plain `loadSprite`.

## UI (src/ui, src/i18n)

Layout, tokens and type live in `dev-docs/design.md`. Summary of the code:

- **Shell**: `App.tsx` + `components/layout/` (header with wordmark, tabs, EN|ES and theme; footer). Hash routing in `ui/route.ts` (`#/sprites`, `#/tiles`, `#/kit`, `#/ai`, `#/guide[/<section>]`); the route is the only source of truth for the active tab. `GuideTab` is owned by the guide task (`components/guide/`, `i18n/guide/`).
- **Workbench frame** (Sprites, Tiles, Make with AI): settings column on the left (sticky, own scroll, 360 px) and the stage on the right; below 1000 px the settings stack under the stage. Shared pieces are in `components/common/` (`Section`, `Fold`, `StatusLine`, `Warnings` with per-warning fix buttons, `ExportCard`, `EmptyStage`, `DropOverlay`).
- **State** (`ui/state/`): `useReducer` store. `jobs.ts` maps settings → `SpriteJob[]`: GLOBAL settings (mode, frame size, sprite height, palette, space under the feet, anchor) go to every job; PER-ASSET settings (type, background, segmentation or hand-drawn `regions`, animations with `flipX`, `frameOffsets`, `colorMap`, relative size) only to their own. `AssetKind` `single` forces `{kind:'single'}` and no animations. `Processor.tsx` re-runs the batch 300 ms after the job signature changes (names are excluded: renaming never re-runs; the export applies the current name). Global settings and the export engine are persisted in localStorage (`persist.ts`, keys `align-sprites.settings` / `align-sprites.export`), as are language and theme.
- Blank animation frame ranges mean "all frames": resolved with the frame count of the previous run (the untouched default animation is left to the core).
- **Warnings → fixes**: `components/sprites/fixes.ts` (sprites) and the stage components of the Tiles panels map `warn.*` keys to a setting change or a guide link.
- **Worker**: `src/worker/client.ts` copies source pixels and transfers the copies; the worker transfers result buffers back. API: `runBatch`, `buildZip`, `inspect` (type + background on upload), `paletteFromImage`, `findDuplicates`, `buildKitZip`, `normalizeTiles`, `buildAtlasZip`, `composeTerrain`, `renderTerrainPreview`, `buildTerrainZip`. `composeTerrain` keeps the prepared `TerrainKit` in the worker, so *Shuffle map* only sends a 16×10 cell array.
- **Frame editor** (`components/sprites/`): `AnimationView` (strip of whole-frame thumbnails, keyboard shortcuts) + `FrameEditor` (actions) + `useFrameEditor` (maps the cursor to an animation draft and detected frame number; `useDuplicates` asks the worker for repeated frames per animation). Reordering writes the draft's frame list (`frameOps.framesToText`); nudges go to `Asset.frameOffsets`. `SourceView` edits boxes (HTML overlay, pointer capture, `lib/rects.ts`).
- **Palettes and variants**: `GlobalSettings.palette` ('original' | 'reduce' | preset | from an image) → `SpriteJob.palette/maxColors` (`jobs.fixedPalette`), also passed to the Tiles processors. `ColorVariants` recolours through `Asset.colorMap` and clones an asset (`cloneAsset`) for a variant.
- **Kit tab** (`components/kit/`): reads sprite results and the Tiles tab results from the store; `KitPreview` draws at real scale; download = `buildKitZip`.
- **Tiles processors** (`state/useTileProcessors.ts`): debounced like `Processor.tsx`; the run signature is stored so remounting the tab does not recompute.
- **i18n**: `src/i18n/en.ts` is the source of keys; `es.ts` is typed against it and `tests/i18n.test.ts` checks keys and `{placeholders}`. Core warnings are translated with `tw()` (`warn.*`).
- Theme: CSS `light-dark()` + `data-theme` on `<html>`. Fonts: Pixelify Sans (wordmark, frame counter) and Atkinson Hyperlegible Next (everything else), via `@fontsource`.
- Examples for "Try an example" live in `public/examples/` (copies of `samples/`). Each example is a list of files loaded together as one batch (`ui/dev/examples.ts`): the character + idle + run example shows three images at one shared size.

## Conventions

- Core functions never mutate their inputs; they return new images.
- Warnings are `{key, params}` translated by the UI (`warn.*` keys in src/i18n).
- No new runtime dependencies without a reason; current: react, comlink, fflate, fast-png.
- Node 24 runs `.ts` directly: imports use the `.ts` extension; no enums or parameter properties (`erasableSyntaxOnly`).
