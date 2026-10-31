# Roadmap

Ideas agreed with Alex on 2026-10-31, in the suggested order. Pick them up from here.

## 1. Fix by hand what the AI gets wrong (small effort, high impact)

- Detect duplicate or near-identical frames (e.g. the Codex fox repeats its bottom row) and offer to remove them.
- Light frame editor: reorder, delete, duplicate, nudge a frame a few px when it jumps, adjust the detected rects by hand (`Segmentation.kind = 'manual'` already exists in the core).
- Mirror to get the left-facing version; build 4-direction sets for top-down.

## 2. Video to sprite (medium effort, high impact)

Like Sorceress Auto-Sprite: video models animate far more consistently than a grid of frames in one image. Upload an MP4/WebM, pick the looping range and the number of frames, then run the same pipeline (HTMLVideoElement seek or WebCodecs in the worker).

## 3. Coherent game kit (medium effort, high impact for the course)

- One shared scale for sprites and tiles (e.g. 32 px tiles, 48 px characters).
- Shared palettes (PICO-8, Endesga 32, Sweetie 16, custom) applied to every asset; palette swaps for variants (enemies, teams).
- Export everything together as a folder ready for a Godot or GDevelop project.

## 4. Test before exporting (medium effort)

A tiny playable level in the browser (Kaplay) where your character walks, jumps and runs on your tiles, to check scale, feet origin and fps without opening an engine. Fits the GameGenres demos.

## 5. More asset types on the same engine (small to medium effort)

- Effects (explosions, hits) anchored at the centre instead of the feet.
- Icons and items: an item sheet to an exact 16/32 px atlas (like the tile-atlas normalizer).
- Parallax backgrounds: horizontally looping layers sized to the game resolution.
- Automatic collision boxes, exported as `CollisionShape2D` in the Godot `.tscn` and as a collision mask for GDevelop.

## 6. Generate inside the tool (medium effort, with caveats)

Each student pastes their own free Gemini API key; the tool sends prompt + guide + reference and normalizes the result automatically. Caveats: limited free image quota, the key stays in the student's browser.

## 7. CLI and agent skill (small effort)

The core is pure TypeScript: expose it as a command (`align-sprites in.png --height 48 --cell 64 --godot`) and a skill so Claude/Codex can generate and normalize assets in other projects (GameGenres, threeplay).
