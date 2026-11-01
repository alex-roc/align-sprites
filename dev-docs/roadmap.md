# Roadmap

Ideas agreed with Alex on 2026-10-31, in the suggested order. Items 1-5 and 7 were built the same day (v4); what is left of them is listed under each one.

## 1. Fix by hand what the AI gets wrong — done

Duplicate detection, frame editor (reorder, duplicate, remove, nudge, hand-drawn boxes), mirror per animation, and **One animation per row** for top-down 4-direction sheets (down, left, right, up; 3 rows mirror the side). Prompt kind "Top-down, 4 directions" in Make with AI.

Open: hand-drawn boxes all get row 0, so *One animation per row* is hidden for them.

## 2. Video to sprite — done

Drop an MP4/WebM in Sprites → *Video to frames* dialog (range, frame count, *Find the loop*), frames composed into a grid sheet that follows the normal pipeline (`src/core/video`, `src/ui/lib/video.ts`). Prompt kind "Video clip" for video models.

Open: only WebM is tested in CI (Playwright's Chromium has no H.264); the mode is not switched to Cartoon automatically for video frames.

## 3. Coherent game kit — done

Game tile size and **game resolution** (with integer-scale table), shared palettes including **My own palette** (edit, paste, import/export .hex/.gpl/.txt), batch colour swaps and palette-to-palette swaps, Kit tab with preview (sprites stand on the first solid row of a tile) and per-engine download.

Items and parallax backgrounds go in the Kit ZIP (`items/`, `backgrounds/`). Tabs follow the asset type: Sprites, World (tiles, terrain, parallax), Items.

## 4. Test before exporting — done

Kit → *Test level*: real Kaplay (lazy chunk) at the game resolution, using the Kaplay export's sheet/anims and the collision box; walk, run (Shift) and jump on the student's tiles.

## 5. More asset types on the same engine — done

- Effects anchored at the centre (`SpriteJob.anchor`), sized by their biggest frame.
- Items and icons → exact atlas (Items tab).
- Parallax backgrounds: looping layers at the game height (World tab, Godot `Parallax2D`).
- Automatic collision boxes: Godot `<name>_body.tscn` (`CharacterBody2D` + `CollisionShape2D`), GDevelop mask points, Kaplay `area()`, JSON `meta.collision`.

Open: manual adjustment of the collision box (% of width/height); "space under the feet" is still shown for centred assets.

## 6. Generate inside the tool (later, by Alex's decision)

Each student pastes their own free Gemini API key; the tool sends prompt + guide + reference and normalizes the result automatically. Caveats: limited free image quota, the key stays in the student's browser.

## 7. CLI and agent skill — done (internal)

`cli/align-sprites.ts` (`sprite`, `inspect`, `tiles`, `terrain`, `items`, `parallax`, `prompt`), shim `~/.local/bin/align-sprites`, skill `~/.agents/skills/align-sprites`. For Alex's own use for now: not advertised on the site or in the guide.

## Other ideas

- Custom palette swaps per animation (team colours on only some frames).
- A Godot demo scene that puts everything in the Kit together; parallax layers behind the test level.
