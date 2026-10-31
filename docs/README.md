# align-sprites guide

**[Open the tool →](https://alex-roc.github.io/align-sprites/)** · [Guía en español](es.md)

AI image models (Gemini / Nano Banana, ChatGPT…) draw nice characters, but their sprite sheets break in game engines: frames of different sizes, characters that jump around between frames, a different scale on every image, "fake" pixel art (blurry ×8 blocks on an irregular grid) and a coloured background instead of transparency. align-sprites fixes that in your browser. Your images are never uploaded anywhere.

| AI output | After align-sprites (32 px tall, 16 colours, 32×32 cells) |
|---|---|
| ![knight before](img/knight-before.png) | ![knight after](img/knight-after.png) |
| ![fox before](img/fox-before.png) | ![fox after](img/fox-after.png) |

## 1. Generate with AI

Open the **Generate with AI** tab:

1. Describe the character and the action (walk, run, idle, attack, jump…), the number of frames and columns.
2. Copy the prompt and download the **guide image** (a magenta grid with a feet line).
3. In Gemini or ChatGPT, paste the prompt and attach the guide. If you already have a good character, attach it too as a reference: generating the animation from one reference image is what keeps the character consistent.
4. Download the result.

Tips:

- Ask for the **whole animation in one image**. Frames generated one by one never match.
- Use the **green key** if your character is pink, purple or magenta.
- Smaller characters (16–48 art pixels tall) are easier for the AI to keep consistent.
- The AI will not follow the guide exactly (frame count, feet line, size). That is fine: the tool fixes it.

## 2. Normalize

Open the **Sprites** tab and drop one or more images.

**Settings for the whole batch** (shared, so every character ends up at the same scale):

- **Art style**: *Pixel art* finds the real pixel grid, removes the AI blur, keeps hard edges and can limit the palette. *Cartoon / vector* resizes smooth art with clean antialiased edges.
- **Cell size**: *Auto* picks the smallest multiple of 32 that fits every frame. Or choose width and height yourself (32, 64, 96, 128…). Characters are usually taller than wide, for example 64×96.
- **Character height**: turn it on and every character in the batch is resized to that height in pixels. This is what fixes "my player and my enemy have different sizes". A single big character (one image, type *Single character*) is resized the same way.
- **Max colours** (pixel art): a shared palette for the whole batch, for example 16 or 32.

**Settings per image**: background (usually *Auto*), frame detection (*Auto*, *Grid* rows × columns, or *Single character*), animations (name, frames such as `0-5`, fps, loop) and a relative size (1.5 for a boss).

**Result**: the detected frames over the source, the final sheet, an animated preview (onion skin, feet line, origin) and a diagnosis with warnings, for example "content was clipped: use a bigger cell or Auto".

## 3. Use it in your engine

**Download ZIP** contains one folder per engine.

### Godot 4

1. Copy the folder `godot/<name>/` into your project (for example `res://characters/<name>/`).
2. Drag `<name>.tscn` into your scene: it is an `AnimatedSprite2D` whose **origin is at the feet**, with every animation ready (fps and loop included).
3. Pixel art: the scene already uses *Nearest* filtering. For the whole project use *Project Settings → Rendering → Textures → Default Texture Filter = Nearest*.

You can also use only `<name>.tres` (a `SpriteFrames` resource) in your own `AnimatedSprite2D`. If Godot shows an error the first time, wait for the import to finish or reopen the project.

### GDevelop 5

GDevelop does not import sprite sheets, so the ZIP has one PNG per frame: `gdevelop/<name>/<animation>/<animation>_00.png…`.

1. Create a **Sprite** object, add an animation and add all its images at once (they are sorted by name).
2. Set the time between frames to `1 / fps` and *Loop* as in the README.
3. In *Edit points*, set the **Origin** point to the value given in the README (the feet), so every animation lines up.
4. Pixel art: in the project properties set the scale mode to *Nearest* (pixel art).

### Kaplay

`kaplay/<name>.png` plus `kaplay/<name>.js` with the `loadSprite(...)` call (`sliceX`, `sliceY`, `anims`). Use `anchor("bot")` so the feet are the origin, and `kaplay({ crisp: true, texFilter: "nearest" })` for pixel art.

### Other engines

`generic/<name>.png` + `<name>.json` in Aseprite's format (Phaser, Unity importers, Defold…), plus one PNG per frame.

## Troubleshooting

| Problem | Fix |
|---|---|
| Wrong number of frames | Use *Grid* with the rows × columns of the image, or raise the tolerance if specks of background became frames. |
| A part of the character disappears | The background removal took it: lower the tolerance, or use the green key when generating. White backgrounds use *flood* (only from the borders) so white clothes survive. |
| "Content was clipped" | Use a bigger cell or *Auto*. Wide characters (animals, slimes) need wider cells. |
| "Big downscale" | The AI drew the character much bigger than your target: ask the AI for a smaller character (e.g. 32 art pixels) for crisper results. |
| "No pixel grid found" | The image is not pixel art (use *Cartoon*) or it is already at native size. |
| Frames repeat or the character changes | That comes from the AI: regenerate with a reference image of the character. |
