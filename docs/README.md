# align-sprites guide

> The up-to-date, interactive guide lives in the app: **https://alex-roc.github.io/align-sprites/#/guide**. This file is a reference copy.

**[Open the tool →](https://alex-roc.github.io/align-sprites/)** · [Guía en español](es.md)

AI image models (Gemini / Nano Banana, ChatGPT…) draw nice characters, but their sprite sheets break in game engines: frames of different sizes, characters that jump around between frames, a different scale on every image, "fake" pixel art (blurry ×8 blocks on an irregular grid) and a coloured background instead of transparency. align-sprites fixes that in your browser. Your images are never uploaded anywhere.

| AI output | After align-sprites (32 px tall, 16 colours, 32×32 frames) |
|---|---|
| ![knight before](img/knight-before.png) | ![knight after](img/knight-after.png) |
| ![fox before](img/fox-before.png) | ![fox after](img/fox-after.png) |

## 1. Make the image with AI

Open the **Make with AI** tab:

1. Describe the character and the action (walk, run, idle, attack, jump…), the number of frames and columns.
2. Copy the prompt and download the **guide image** (a magenta grid with a feet line).
3. In Gemini or ChatGPT, paste the prompt and attach the guide. If you already have a good character, attach it too as a reference: generating the animation from one reference image is what keeps the character consistent. The AI tends to copy the detail level of the reference rather than the height you asked for; that is fine, you choose the final size in the tool.
4. Download the result.

Tips:

- Ask for the **whole animation in one image**. Frames generated one by one never match.
- Use the **green key** if your character is pink, purple or magenta.
- Smaller characters (16–48 art pixels tall) are easier for the AI to keep consistent.
- The AI will not follow the guide exactly (frame count, feet line, size). That is fine: the tool fixes it.
- Some defects only you can fix: repeated poses and a character that changes between frames. Generate again, with a reference image.

### More things to ask for

The kind selector (grouped as Sprites, World and Items, like the tabs) also makes prompts (each with its guide image, except video) for:

- **Top-down, 4 directions**: one row per direction (down, left, right, up), or 3 rows where the side view is mirrored.
- **Video clip** for video models (Veo, Kling, Sora, Hailuo…): the character moves in place, with a fixed camera, on flat green, and the clip ends in the starting pose so it loops.
- **Tile atlas** (group World): tiles on a grid with key-coloured gaps between them, and solid ground tops so characters do not float.
- **Parallax layers** (group World): one prompt per layer. The far layer is opaque; the others sit on the key colour; all of them repeat sideways.
- **Effects** (explosion, hit, magic, smoke, projectile): each frame centred in its cell, with hard edges and no glow.
- **Items and icons** (group Items): separate objects, each centred in its own cell, at the same scale.

### From a video

Video models animate far more consistently than an image model drawing a grid. Drop an MP4 or WebM in the **Sprites** tab and the **Video to frames** dialog opens:

1. Choose the part of the clip that loops. **Find the loop** suggests the end where the character is back in the starting pose.
2. Choose the number of frames (8 by default) and check the thumbnails. The end is left out, so the first frame is not repeated.
3. The frames become a normal sprite sheet (grid already set, FPS from the clip) and follow the usual steps. Video frames are not pixel art: use *Cartoon*.

## 2. Normalize

Open the **Sprites** tab and drop one or more images. For each one the tool detects whether it is a **sprite sheet** (several frames) or a **single sprite** (one drawing). Correct it under **Image type** if it guessed wrong.

The settings follow the order you think in: art style, sprite size, frame size, frames, animations. Colours, background and advanced stay folded. With several images the column splits into settings for all images and for only the selected one.

- **Art style**: *Pixel art* finds the real pixel grid, removes the AI blur, keeps hard edges. *Cartoon* resizes smooth art with clean antialiased edges.
- **Sprite size**: the height of the drawing, in px. Presets: Original, 8, 16, 32, 64, 96, 128, or Other. It also shows the size in game tiles (set the game tile in the Kit tab). Every image in the batch gets the same height, so your player and your enemy have the same scale. A relative size (1.5 for a boss) goes on top. Choose a height smaller than what the AI drew: enlarging pixel art makes the pixels uneven.
- **Frame size**: the sprite is the drawing; the frame is the canvas each frame occupies, with the feet on one line. *Automatic* picks the smallest multiple of 32 where everything fits. *Custom* lets you type width and height (steps of 8 px, never below what fits) and the space under the feet. Multiples of 32 work well in most engines.
- **Frames** (sprite sheets): *Automatic* finds each frame, or *Grid* cuts rows × columns. In the **Original** view, **Edit boxes** lets you draw, move and resize the frame boxes by hand.
- **Animations**: name, frames such as `0-5` or `0,2,4-6`, FPS and loop. **Mirror** flips an animation, and **Create mirrored copy** adds the mirrored version as a new animation. **One animation per row** turns a top-down sheet into `walk_down`, `walk_left`, `walk_right` and `walk_up` (with 3 rows, `walk_left` is the mirrored side), or `anim_0`, `anim_1`… for any other number of rows.
- **Origin**: *Feet* for characters (the feet of every frame sit on one line) or *Centre* for effects, projectiles and things that float (every frame is centred; the size is the biggest frame).
- **Colours**: *Original colours*, a ready palette (PICO-8, Sweetie 16, Endesga 32, Game Boy), a palette *from an image*, *My own palette*, or *Reduce to N colours*. The palette is shared by every image and by your tiles. Fixed palettes only work with pixel art.
- **My own palette**: click a colour to change it, add or remove colours (up to 256), start from a ready palette or from the colours of your images, or paste a list of hex codes. Import and export `.hex` (Lospec), `.gpl` (GIMP) or `.txt` (Paint.NET).
- **Colour variants**: click a colour to change it, then **Duplicate as colour variant** to keep both versions (enemies, teams). With several images, **All images** applies that colour swap to every image, or duplicates every image as a variant named `name_<ending>`. With a fixed palette you can also swap the whole palette for another with the same number of colours (for example PICO-8 to Sweetie 16).
- **Background**: Auto (the most common border colour). *Everywhere (chroma key)* for magenta and green; *Only from the edges* for white backgrounds (it also clears enclosed pockets of flat white, like the gap between the feet). Lower the tolerance if part of the character disappears.

### Single sprites and sprite sheets

A single sprite has no animations and has the views **Sprite** and **Original**. A sprite sheet has **Animation**, **Final sheet** and **Original**. With several images, **All together** puts every image on one ground line at the same zoom: the proof that they share a scale.

### Fix frames by hand

The frame editor, under the frame strip, acts on the selected frame: move left or right, duplicate, remove from the animation, nudge 1 px. Shortcuts: `[` and `]` move the frame, `D` duplicates it, `Delete` removes it, `Shift` + arrows nudge it, `0` resets the nudge. When the AI repeats a pose, the tool says so ("Frame 4 repeats frame 1") and **Remove duplicates** removes them.

### Collision box

Every sprite gets an automatic collision box: the body for characters (arms, swords and capes stay out), a centred rectangle for effects. Tick **Collision box** in the Animation view to see it. It goes into every export (see below).

## 3. Use it in your engine

Under the stage, choose the engine and press **Download for …**. The ZIP has that engine's files (with *All engines*, one folder per engine).

### Godot 4

1. Copy the folder `<name>/` from the ZIP into your project (for example `res://characters/<name>/`).
2. Drag `<name>.tscn` into your scene: it is an `AnimatedSprite2D` whose **origin is at the feet**, with every animation ready (fps and loop included). A **single sprite** gives a `Sprite2D` scene instead.
3. Pixel art: the scene already uses *Nearest* filtering. For the whole project use *Project Settings → Rendering → Textures → Default Texture Filter = Nearest*.

4. For a playable character, use `<name>_body.tscn` instead: a `CharacterBody2D` with the sprite and a `CollisionShape2D` already sized to the collision box. Add your movement script to it.

Effects with the origin at the centre are centred scenes. You can also use only `<name>.tres` (a `SpriteFrames` resource) in your own `AnimatedSprite2D`, but the feet offset is in the `.tscn`. If Godot shows an error the first time, wait for the import to finish or reload the project.

### GDevelop 5

The ZIP has one folder per image with its cut frames (`<name>/<name>_<animation>_00.png`, `_01.png`…) and a `README.txt` with the origin and the fps.

- **Frames**: create a **Sprite** object, add an animation, click *Add images* and select all the PNGs of that animation at once.
- **Piskel spritesheet** (optional: tick *Also spritesheets for Piskel* before downloading): add an animation, open it with *Edit with Piskel*, then *Import*, pick `<name>/spritesheets/<name>_<animation>.png` and *Import as spritesheet* with your frame size.
- **Tip when importing again**: GDevelop copies the images into the project folder, and deleting them in GDevelop leaves the files. Before importing again, also delete the old PNGs from that folder, or GDevelop renames the copies and can repeat or mix frames. (Another option: unzip inside the project and pick the images there.)

Then set the time between frames to `1 / fps` and the loop. In *Edit points* (the Points editor), set the **Origin** point to the value in the README (the feet) for all frames. A **single sprite** is one PNG, `<name>/<name>.png`. The README also lists the 4 points of the **collision mask**: in the collision mask editor, untick "use the full image" and type them in. Pixel art: in the project properties set the scale mode to *Nearest (no antialiasing)*. (Menu names follow GDevelop 5 as we last saw it; the README in the ZIP has the same steps.)

### Kaplay

`<name>.png` plus `<name>.js` with the `loadSprite(...)` call (`sliceX`, `sliceY`, `anims`; each animation starts at `row × columns`). The snippet includes `area({ shape: new Rect(...) })` with the collision box. Use `anchor("bot")` so the feet are the origin (`anchor("center")` for effects), and `kaplay({ crisp: true, texFilter: "nearest" })` for pixel art. A single sprite is a plain `loadSprite(name, png)`.

### Other engines

`<name>.png` + `<name>.json` in Aseprite's format (with the origin and `meta.collision`), plus one PNG per frame. Phaser reads it as an Aseprite atlas, Unity slices the PNG with *Grid By Cell Size*, and Defold and Construct can import the per-frame PNGs. We know these engines less well: check their documentation. Any engine that slices by frame size works: animation `k` is row `k`, frame `i` is column `i`, origin at the feet.

## 4. World

The **World** tab builds the ground and the scenery. It has three tools, in the order of the tab: tile sheet, terrain transitions and parallax background. The tool is part of the address (`#/world/sheet`, `#/world/terrain`, `#/world/parallax`).

### Tile sheet (clean up an AI tileset)

1. Add one image with several tiles laid out in rows and columns (try *Andean mountains tileset*).
2. Pick the **tile size** (8 to 128 px, or your own). The grid is detected from the empty gaps between tiles; if the cut lines look wrong, untick *Detect columns and rows automatically* and type the columns and rows.
3. Every tile is resampled to exactly that size, the background is removed, and empty tiles are crossed out and left out of the tile set.
4. Choose a format (Godot 4, Tiled / GDevelop, PNG) or all formats and download.

### Terrain transitions (grass → dirt, and so on)

1. Add texture **A** (base terrain) and texture **B** (painted over A). Both should be square and seamless. Tick *No texture B: paint A over transparent* to make an overlay layer.
2. Choose the layout: **Blob 47 (Godot)** or **Dual 16 (GDevelop)**. Tune the edge style. The **test map** shows a random map built with your tiles; press *Shuffle map* to check that they connect everywhere. *Seams in A* and *Seams in B* tell you whether each texture repeats cleanly.
3. **Download ZIP**: the atlas PNG, a Godot `TileSet` `.tres` with the terrain data filled in, and a README with the tile table.

### Using the tiles in your engine

- **Godot 4**: copy the folder `godot/<name>/` into your project and assign the `.tres` to a `TileMapLayer`. For Blob 47, open the *TileMap* panel, choose the **Terrains** tab and paint. Dual 16 is made for the *TileMapDual* addon.
- **GDevelop 5**: use the **Tilemap** object with the `.tsx` (Tiled) and the atlas PNG. The Dual 16 atlas has no terrain data: paint it by hand using the README table.
- **Tiled / LDtk**: open the `.tsx` as a tileset.

### Parallax background

AI background layers (far sky and mountains, mid hills, near trees and rocks) become layers that repeat sideways at your game height and scroll at different speeds. Make them with the *Parallax layers* prompt, one per layer.

1. Add 1 to 4 images, from the farthest to the nearest (or try *Andes: mountains and trees*). Each layer has a **Speed**: 0 stays still, 1 moves with the camera (far 0.2, near 0.8 by default).
2. The tool cuts out the flat background colour of every layer but the farthest, looking at the top of the image, so landscapes that touch the bottom edge work. Untick **Cut out the background** if a layer is already transparent.
3. **Height of the layers** is your game height (shared with the Kit). Pixel art keeps its own pixel grid: it is enlarged by a whole number and the top is filled in or cut so the layer matches the height; the bottom stays in place.
4. **Make it repeat sideways** joins the right edge to the left edge along a hidden cut, so nothing jumps when the layer repeats. A picture that already wraps around its edge is left as it is; otherwise the tool tries a few join widths and picks one that leaves no floating pieces. Check it in **Repeat check**, and watch the result in **Scroll**.
5. Export: the layer PNGs plus a Godot 4 scene with one `Parallax2D` per layer (repeat and scroll speed set), a GDevelop README (one *Tiled Sprite* per layer with the official "Parallax for Tiled Sprite" extension), a Kaplay snippet, or a JSON with sizes and speeds.

## 5. Items

In the **Items** tab, an AI image of separate objects (coins, potions, keys, gems, icons) becomes an atlas where every item is centred in a square slot of the size you choose, with the background removed.

- By default every item shares one scale, so a coin stays smaller than a sword. *Each item fills its slot* makes every item as large as possible, which suits icons.
- Pixel art is never enlarged: items smaller than the slot keep their real size, and larger ones are reduced once, from the original, on the sheet's pixel grid.
- Click an item in **Original** to cross it out, and name the items in **Atlas**.
- Export: Godot gets one `AtlasTexture` `.tres` per item, GDevelop one PNG per item, Kaplay a `loadSpriteAtlas` snippet, and Other the atlas PNG, a JSON with the rectangles and the loose PNGs.

## 6. Kit

The **Kit** tab joins your sprites, your scenery (tiles and background) and your objects so they share one scale.

- **Game resolution**: the size of your game's screen before it is scaled up. Choose one that scales to the screen by a whole number, so the pixels stay even:

  | Game | Tile | Character | Full HD | 4K |
  |---|---|---|---|---|
  | 320×180 | 16 | 24–32 | ×6 | ×12 |
  | 640×360 | 32 | 48–64 | ×3 | ×6 |
  | 960×540 | 48 | 72–96 | ×2 | ×4 |
  | 1280×720 | 64 | 112–144 | – (×1.5) | ×3 |

- **Game tile size**: 16, 32, 48 or 64 px, the grid your game is built on. Sprite heights are shown in tiles, and a tile set with another size gets a warning with a button to fix it.
- **Shared palette**: the same palette as Colours in Sprites. A fixed palette is also applied to your tiles.
- **Preview at real scale**: your sprites standing on a row of your tiles (on the first solid row of the tile, so grass blades on top do not make them float). If it looks right here, it will in your game.
- **Test level**: press **Play** to walk, run (hold Shift) and jump with your character on your own tiles, before opening an engine. It runs the real Kaplay library at your game resolution, with the same sheet, animations, feet origin and collision box as the Kaplay export. Choose which animation plays when standing, walking, running and in the air; each one can come from a different image.
- **Download the kit for …**: one ZIP per engine with `sprites/`, `tiles/`, `items/`, `backgrounds/` (only the parts you made) and a `README.txt` that lists every size and the palette.

## Troubleshooting

| Problem | Fix |
|---|---|
| Detected as the wrong type | Change **Image type**: sprite sheet or single sprite. |
| Wrong number of frames | Use *Grid* with the rows × columns of the image, raise the tolerance if specks of background became frames, or draw the boxes with **Edit boxes**. |
| The jump comes out bigger than the other animations | Most of its frames are crouched: press **Measure the tallest frames** and compare in **All together**; adjust the **Relative size** if needed. |
| A part of the character disappears | The background removal took it: lower the tolerance, or use *Only from the edges*. Next time, use the green key. |
| A frame is cut by the frame edge | Use a bigger frame size or *Automatic*, or a smaller sprite size. |
| Player and enemy have different sizes | Pick one common sprite size. |
| "The sprite is shrunk a lot" | The AI drew the character much bigger than your sprite size: ask for a smaller one (around 32 art pixels). |
| "No clear pixel grid was found" | The image is not pixel art (use *Cartoon*) or it is at its original size. |
| Frames repeat or the character changes | The AI repeated a pose: **Remove duplicates**, or regenerate with a reference image. |
| The feet jump between frames | Nudge the frame in the frame editor (`Shift` + arrows). |
| The character faces the wrong way | **Create mirrored copy** on the animation. |
| Pixel art looks blurry in the engine | Nearest filtering: *Default Texture Filter* (Godot), *Scale mode* (GDevelop), `texFilter: "nearest"` (Kaplay). |
| Sprites and tiles do not fit together | Set the game tile size in the Kit tab and use it for your tiles. |
| An explosion or a projectile jumps around between frames | Set **Origin** to *Centre*: effects are centred, not stood on their feet. |
| A video does not open | Your browser cannot decode it: use an MP4 (H.264) or WebM file. |
| The join of a parallax layer shows | Widen the **Width of the join**, or ask the AI again for a layer whose edges match. |

## Credits

Built by Alex Ojeda Copa, Lab TecnoSocial.

Pixel-grid detection uses [unfake.js](https://github.com/jenissimo/unfake.js) by Eugeniy Smirnov, under the MIT licence ([licence notice](https://github.com/jenissimo/unfake.js/blob/main/LICENSE)).

align-sprites is free software under the [GPL-3.0](https://github.com/alex-roc/align-sprites/blob/main/LICENSE) licence.
