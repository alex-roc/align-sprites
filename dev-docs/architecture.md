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

## Conventions

- Core functions never mutate their inputs; they return new images.
- Warnings are `{key, params}` translated by the UI (`warn.*` keys in src/i18n).
- No new runtime dependencies without a reason; current: react, comlink, fflate, fast-png.
- Node 24 runs `.ts` directly: imports use the `.ts` extension; no enums or parameter properties (`erasableSyntaxOnly`).
