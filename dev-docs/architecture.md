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
src/worker/              Comlink worker implementing PipelineApi (src/worker/api.ts)
src/ui/, src/i18n/       React UI; every UI string lives in src/i18n (en + es, same keys)
src/vendor/unfake/       vendored unfake.js WASM (MIT; bundles imagequant, GPL-3.0 → project is GPL-3.0-or-later)
tests/                   Vitest; tests/fixtures/synth.ts builds deterministic AI-like sheets
samples/real/            real AI-generated assets used for manual/regression checks
tools/godot-validate/    headless Godot 4 project that loads and checks exported .tres
```

## Sprite pipeline (runSpriteJob)

1. **Background**: `detectBackground` takes the dominant border colour. `removeBackground`:
   - strategy `global` for chroma keys (magenta/green): also empties enclosed holes (between arm and body);
   - strategy `flood` (default for white/other colours): only bg regions connected to the border, so a cream tunic on a white background survives;
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

One ZIP, folder per target: `godot/<name>/` (png + SpriteFrames .tres + AnimatedSprite2D .tscn with the origin at the feet), `gdevelop/<name>/<anim>/…png` + README, `kaplay/<name>.png + .js`, `generic/<name>.png + .json` (Aseprite hash). Godot `.tres` uses relative `path` without uid: copy the folder into the project as is.

## UI (src/ui, src/i18n)

- `src/ui/state/`: `useReducer` store (context in `context.ts`, reducer in `reducer.ts`). `jobs.ts` maps settings → `SpriteJob[]`: GLOBAL settings (mode, cell, shared height, colours, bottom margin, anchor) go to every job; PER-ASSET settings (background, segmentation, animations, relative size) only to their own. `Processor.tsx` re-runs the batch 300 ms after the job signature changes (names are excluded: renaming never re-runs; the export applies the current name).
- Blank animation frame ranges mean "all frames": resolved with the frame count of the previous run (the untouched default animation is left to the core).
- `src/worker/client.ts` copies the source pixels and transfers the copies; the worker transfers result buffers back.
- `src/i18n/en.ts` is the source of keys; `es.ts` is typed against it and `tests/i18n.test.ts` checks keys and `{placeholders}`. Core warnings are translated with `tw()` (`warn.*`).
- Theme: CSS `light-dark()` + `data-theme` on `<html>`; language and theme are the only persisted UI state (localStorage).
- Tiles tab (`src/ui/components/tiles/`): two panels (tile sheet / terrain) with their state in `AppState.tiles`. Each panel owns a debounced processor hook (same pattern as `Processor.tsx`; the run signature is stored so remounting the tab does not recompute). The worker API has `normalizeTiles`, `buildAtlasZip`, `composeTerrain`, `renderTerrainPreview`, `buildTerrainZip`; `composeTerrain` keeps the prepared `TerrainKit` in the worker, so *Shuffle map* only sends a 16×10 cell array. Texture images are copied before being transferred.
- Examples for "Try an example" live in `public/examples/` (copies of `samples/real/`).

## Tiles (src/core/tiles)

**Atlas normalizer** (`atlas.ts`): `detectTileGrid` builds column/row profiles of "content" (not transparent, not within ΔE 25 of the border colour), takes the interior gutter runs (profile <= 35 %) and picks the LARGEST cell count for which a chain of gutters with plausible cell sizes (0.5-1.6x the average) exists. That tolerates objects crossing a gutter and non-uniform AI cells, and rejects multiples of the true count. `gridCutsFor` does the same for a user-given count (fallback: uniform cuts snapped within ±20 %). `normalizeTileAtlas` removes the background once, then reduces every cell window to EXACTLY T×T in one resample (pixel: unfake `downscaleGrid` with period window/T, dominant colour, binary alpha; cartoon: area filter). The window has the same size for every cell (75th percentile of the solid content boxes); full-bleed tiles (sky, ground) are cut from the untouched sheet so clouds touching the edge survive the white flood. Export: `tileAtlasGodot` (`TileSetAtlasSource` .tres) and `tileAtlasTiled` (.tsx; GDevelop's Tilemap object reads Tiled).

**Terrain compositor** (`terrain.ts`): one scalar field per tile = Gaussian blur of (signed distance to the A/B edge - margin), plus periodic (period T) value noise, thresholded at 0. blob47 uses a 3T×3T canvas of the 8-neighbour mask, dual16 a 2T×2T canvas of the 4 corners (the tile is offset half a tile from the data cells). Canvas origins are multiples of T from the world origin, so neighbouring tiles agree; `renderTerrainMap` renders a whole map in one go and tests compare a tile-assembled map with it (dual16: exact; blob47: exact at T=16 pixel, a few stray pixels elsewhere where the "diagonal only counts with both sides" rule changes the blur of a corner). Style requirement: margin + blur + noiseAmp + 2 < T/2 (clamped with `warn.edgeStyleClamped`). Godot: `godotTerrainTileSet` (blob47 = terrain set mode 0 with ONE terrain, A has no terrain; dual16 = mode 1, terrains A/B). Validated headless with `pnpm test:godot:tiles` (Godot 4.4.1: the TileMapLayer terrain solver picks the expected tile for every painted cell).

Warning keys: `warn.tileGridUncertain {confidence}`, `warn.tileUpscaled {count, to}`, `warn.notSeamless {which, score}`, `warn.edgeStyleClamped {margin, blur, noiseAmp}`, `warn.dualOddTile {tileSize}`.

## Conventions

- Core functions never mutate their inputs; they return new images.
- Warnings are `{key, params}` translated by the UI (`warn.*` keys in src/i18n).
- No new runtime dependencies without a reason; current: react, comlink, fflate, fast-png.
- Node 24 runs `.ts` directly: imports use the `.ts` extension; no enums or parameter properties (`erasableSyntaxOnly`).
