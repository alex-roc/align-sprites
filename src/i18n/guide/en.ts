// Guide tab content (English, the source). Structure and block types live in ./types.ts.
import type { GuideContent } from './types.ts';

export const guideEn: GuideContent = {
  lede: "Learn why each step matters, then take your character to Godot, GDevelop or Kaplay. Your images never leave your computer.",
  ui: {
    indexLabel: "Guide sections",
    jumpTo: "Jump to a section",
    copy: "Copy",
    copied: "Copied",
  },
  sections: [
    {
      id: 'how-it-works',
      title: "How it works",
      blocks: [
        { type: 'p', text: "AI models like Gemini and ChatGPT draw good characters, but their sprite sheets break in a game engine. align-sprites fixes the sheet in your browser." },
        {
          type: 'ul',
          items: [
            "Frames come out in different sizes and the character jumps around from frame to frame.",
            "Every image has its own scale, so your player and your enemy do not match.",
            "The pixel art is fake: blurry blocks on an uneven grid.",
            "The background is a flat colour, not transparency.",
          ],
        },
        {
          type: 'diagram',
          steps: [
            { title: "AI image", text: "The AI draws the sheet on a flat key colour. Pixels are blurry and sizes uneven." },
            { title: "Background", text: "The tool finds the key colour and removes it. Holes between arm and body go too; white clothes stay." },
            { title: "Frames", text: "It finds each frame (the boxes) and numbers them in reading order." },
            { title: "Pixel grid", text: "It finds the real art-pixel grid and redraws each frame on it with hard edges. Pixel art only." },
            { title: "Same height", text: "Every character gets the same height, so player and enemy match. The line is where the feet go." },
            { title: "Cells", text: "Each frame goes in a cell of the same size, centred, with the feet on the line." },
            { title: "Your engine", text: "You get a ZIP for Godot, GDevelop and Kaplay, with the origin at the feet." },
          ],
          legend: [
            { tone: 'key', text: "Magenta is what the tool detects or removes." },
            { tone: 'ground', text: "Yellow is the line of the feet." },
          ],
        },
        {
          type: 'compare',
          asset: 'wizard',
          label: "Compare the AI image with the result. Use the arrow keys to move the divider.",
          before: "AI image",
          after: "Result",
          beforeAlt: "A pixel art wizard with a long white beard on a magenta background, drawn with blurry blocks.",
          afterAlt: "The same wizard after align-sprites: sharp pixels, transparent background, 64 by 64 pixel cell.",
          caption: "The wizard as the AI drew it (1254 px, about 93 art pixels tall) and as align-sprites leaves it (a 64 px cell, transparent, crisp).",
        },
        { type: 'p', text: "The tool never repaints your character. It only finds, cleans, resizes and places what the AI drew." },
        { type: 'h3', id: 'workflow', text: "The whole workflow" },
        {
          type: 'steps',
          items: [
            "**Generate.** In the Make with AI tab, build a prompt and a guide image, and ask your AI for the sheet. See [Make with AI](#/guide/generate).",
            "**Normalize.** In the Sprites tab, drop the image and check the preview. See [Normalize](#/guide/normalize).",
            "**Export.** Download the ZIP and follow the steps for your engine: [Godot](#/guide/godot), [GDevelop](#/guide/gdevelop) or [Kaplay](#/guide/kaplay).",
          ],
        },
        { type: 'actions', items: [{ to: 'sprites', label: "Try it in Sprites" }, { to: 'ai', label: "Make with AI" }, { to: 'tiles', label: "Tiles" }] },
      ],
    },
    {
      id: 'generate',
      title: "Make with AI",
      blocks: [
        { type: 'p', text: "The AI follows your prompt loosely. Your job is to ask in a way that makes its mistakes easy to fix." },
        { type: 'h3', id: 'rules', text: "Five rules for good sheets" },
        {
          type: 'ul',
          items: [
            "**Ask for the whole animation in one image.** Frames generated one by one never match: the character changes between images.",
            "**Attach the guide image.** It is a magenta grid with a feet line. It tells the AI how many frames to draw and where the feet go.",
            "**Attach a reference of your character** if you already have a good one. Generating from one reference image keeps the character consistent.",
            "**Pick the key colour to suit the character.** Use magenta, or green if your character is pink, purple or magenta. The prompt tells the AI not to use the key colour on the character.",
            "**Ask for a small character**, between 16 and 48 art pixels tall. The AI keeps small characters more consistent.",
          ],
        },
        { type: 'figures', items: [{ src: 'guide/guide-3x2-magenta.png', alt: "A magenta grid of three columns by two rows with a line near the bottom of each cell and a number in each cell.", caption: "The guide image for a 3 by 2 sheet. The AI uses it as a template and does not copy its lines.", pixelated: false, zoom: 0.5 }] },
        { type: 'h3', id: 'get-the-prompt', text: "Get the prompt and the guide" },
        {
          type: 'steps',
          items: [
            "Open the Make with AI tab.",
            "Describe the character and the action (walk, run, idle, attack, jump), the number of frames and the columns.",
            "Copy the prompt and download the guide image.",
            "In Gemini or ChatGPT, paste the prompt and attach the guide. Attach your character too, as a reference, if you have one.",
            "Download the result and open it in the Sprites tab.",
          ],
        },
        { type: 'actions', items: [{ to: 'ai', label: "Make with AI" }] },
        { type: 'h3', id: 'what-goes-wrong', text: "What the AI gets wrong" },
        { type: 'p', text: "These sheets were made in ChatGPT with this tool's own prompts and guide images. The numbers are measured, not guessed." },
        {
          type: 'example',
          item: { src: 'guide/knight-before.jpg', alt: "Six frames of a pixel art knight walking, on a magenta background.", caption: "Knight walk, pixel art, 6 frames on magenta.", pixelated: false },
          title: "Knight",
          facts: [
            "You asked for a character 32 art pixels tall. It came out about 58 pixels tall.",
            "The background was never the exact key colour: none of its pixels were #FF00FF, and there were about 8,500 shades of magenta.",
            "The horizontal centre drifts between frames (from 228 to 249 px in 256 px cells).",
            "Frames 4 to 6 mostly repeat frames 1 to 3, so the walk barely reads.",
          ],
        },
        {
          type: 'example',
          item: { src: 'guide/fox-before.jpg', alt: "Six frames of a cartoon fox running, on a green background.", caption: "Fox run, cartoon, 6 frames on green.", pixelated: false },
          title: "Fox",
          facts: [
            "The bottom row is almost a copy of the top row: only 3 different poses out of 6.",
            "The feet drift by up to 10 px between frames.",
            "The key colour was drawn as (2, 249, 2) with about 7,500 shades around it, never the exact #00FF00.",
            "The gait is a quadruped gait. The prompt asked for biped key poses, and the AI ignored them.",
          ],
        },
        { type: 'p', text: "Some of these defects are easy for the tool. Others only you can fix." },
        {
          type: 'table',
          head: ["Defect", "Who fixes it"],
          rows: [
            ["Background is not the exact key colour", "The tool. It uses the most common border colour, not an exact match."],
            ["Character too big or too small", "The tool. You choose the height."],
            ["Character off-centre or feet at different heights", "The tool. It aligns the feet and the centre in every cell."],
            ["Repeated poses", "You. Generate again."],
            ["The character changes between frames", "You. Generate again with a reference image."],
          ],
        },
      ],
    },
    {
      id: 'normalize',
      title: "Normalize",
      blocks: [
        { type: 'p', text: "Open the Sprites tab and drop one or more images. The tool picks sensible defaults. Change a setting only when the preview or a warning tells you to." },
        { type: 'p', text: "The settings follow the order you think in: style, frames, size, animations, colours and background." },
        { type: 'actions', items: [{ to: 'sprites', label: "Try it in Sprites" }] },
        { type: 'h3', id: 'style', text: "Art style" },
        { type: 'ul', items: [
          "**Pixel art** finds the real pixel grid, removes the AI blur, keeps hard edges and can limit the palette.",
          "**Cartoon** resizes smooth art and keeps clean, antialiased edges.",
        ] },
        { type: 'p', text: "Why it matters: an AI draws each art pixel as a blurry block, and the blocks are not all the same size. If you resize that by hand, you get mush. The tool finds the grid once and redraws every frame on it." },
        {
          type: 'figures',
          items: [
            { src: 'guide/knight-before.jpg', alt: "Knight sheet as the AI drew it: blurry blocks on magenta.", caption: "As the AI drew it", pixelated: false },
            { src: 'guide/knight-after.png', alt: "The same knight on the real pixel grid: six sharp frames, transparent background.", caption: "On the real grid: 32 px tall, 16 colours", pixelated: true, backdrop: 'checker' },
          ],
        },
        { type: 'callout', title: "Heads up", text: "If you get “No pixel grid found”, the image is not pixel art, or it is already at its native size. Switch to Cartoon." },
        { type: 'h3', id: 'frames', text: "Frames" },
        { type: 'ul', items: [
          "**Auto** finds each character on its own and numbers the frames in reading order.",
          "**Grid** cuts the image into rows by columns. Use it when you know the layout. It is the most reliable choice when the AI placed the frames on an even grid.",
          "**One character** treats the whole image as a single frame.",
        ] },
        { type: 'h3', id: 'size', text: "Size and the same-height rule" },
        { type: 'p', text: "Every AI image comes out at its own scale. Say your player and your enemy should both be a person tall. The AI drew the knight 58 art pixels tall and the wizard 93. Put them side by side in your game and the wizard looks like a giant." },
        {
          type: 'sameHeight',
          label: "Same-height demo",
          raw: "As the AI gave them",
          same: "Same height",
          knight: "Knight",
          wizard: "Wizard",
          ground: "Ground line",
          caption: "The same art pixels, drawn at the same zoom. Only the character height changes.",
        },
        { type: 'p', text: "Turn on the shared **Character height** and pick a value, for example 48. Every character in the batch is resized to it. A boss or a small enemy gets a relative size, such as 1.5 or 0.5, on top of that height." },
        { type: 'callout', title: "Heads up", text: "Choose a height smaller than what the AI drew. Shrinking pixel art works well. Enlarging it makes the pixels uneven, and the tool warns you." },
        { type: 'h3', id: 'cell', text: "Cell size" },
        { type: 'p', text: "Every frame goes in a cell of the same size, centred, with the feet on the same line. That is what keeps the animation from wobbling in your game." },
        { type: 'ul', items: [
          "**Auto** picks the smallest multiple of 32 that fits every frame.",
          "You can also type a width and a height: 32, 64, 96, 128. Characters are usually taller than wide, for example 64 by 96. Animals and slimes need wider cells.",
          "The bottom margin leaves empty rows under the feet. It only applies to a fixed cell.",
        ] },
        { type: 'p', text: "Multiples of 32 are a common convention. They line up with most tile sizes and keep the maths simple." },
        { type: 'p', text: "If a warning says the content was clipped, use a bigger cell, Auto, or a smaller character height." },
        { type: 'h3', id: 'animations', text: "Animations" },
        { type: 'p', text: "Each animation has a name, a range of frames such as `0-5`, a speed in frames per second (fps) and a loop switch. Leave the range blank to use all the frames." },
        { type: 'p', text: "One sheet can hold several animations. For example, `idle` with frames `0-3` and `walk` with frames `4-9`. Walks and idles loop. An attack usually does not." },
        { type: 'h3', id: 'colours', text: "Colours" },
        { type: 'p', text: "In pixel art, set a maximum number of colours, for example 16 or 32. The palette is shared by the whole batch. AI images have thousands of nearly identical shades. A small shared palette makes your characters look like they live in the same world. Use 0 to keep every colour." },
        { type: 'h3', id: 'background', text: "Background" },
        { type: 'p', text: "Auto uses the most common colour on the image border. You can choose how it is removed." },
        { type: 'ul', items: [
          "**Everywhere** removes every pixel close to the colour, including holes between an arm and the body. Use it for magenta and green keys.",
          "**Only from the edges** removes only the background that touches the border. Use it for white backgrounds, so white or cream clothes survive.",
        ] },
        { type: 'p', text: "If part of the character disappears, lower the tolerance. Next time, use the green key." },
        { type: 'h3', id: 'check', text: "Check the result" },
        { type: 'p', text: "The preview shows the detected frames in magenta and the feet line in yellow. Every warning comes with a button that applies the fix: a bigger cell, the grid mode, a lower tolerance." },
      ],
    },
    {
      id: 'godot',
      title: "Godot 4",
      blocks: [
        { type: 'p', text: "The ZIP has a `godot/<name>/` folder with four files: the sheet `<name>.png`, a `SpriteFrames` resource `<name>.tres`, a ready scene `<name>.tscn` with an `AnimatedSprite2D`, and a `README.txt`." },
        { type: 'h3', id: 'godot-add', text: "Add the character to your project" },
        {
          type: 'steps',
          items: [
            "Copy the whole `godot/<name>/` folder into your project, for example to `res://characters/<name>/`. Keep the files together: the `.tres` loads the PNG by a relative path.",
            "Wait for Godot to import the files.",
            "Drag `<name>.tscn` into your scene. Every animation is ready, with its fps and loop, and the first one plays when the game starts.",
            "For pixel art, open **Project Settings**, go to **Rendering > Textures** and set **Default Texture Filter** to **Nearest**. The scene already uses Nearest, but the rest of your project needs it too.",
          ],
        },
        { type: 'callout', title: "Heads up", text: "If Godot shows an error the first time, wait for the import to finish. If it stays, choose **Project > Reload Current Project** and check that the PNG imports as a Texture2D." },
        { type: 'h3', id: 'godot-feet', text: "The origin is at the feet" },
        { type: 'p', text: "The scene sets the sprite so its origin sits at the character's feet. When you place the node at a position, the feet stand on that spot. Put your `CollisionShape2D` above the node's position, because the node is not at the centre of the body." },
        { type: 'h3', id: 'godot-code', text: "Play animations from code" },
        { type: 'p', text: "Add the scene as a child of a `CharacterBody2D`. The animation names are the ones you set in the tool." },
        {
          type: 'code',
          lang: 'gdscript',
          title: "player.gd",
          code: `extends CharacterBody2D

const SPEED := 120.0

@onready var sprite: AnimatedSprite2D = $Hero  # the node from <name>.tscn

func _physics_process(_delta: float) -> void:
	var dir := Input.get_axis("ui_left", "ui_right")
	velocity.x = dir * SPEED
	if dir != 0.0:
		sprite.flip_h = dir < 0.0  # the AI draws facing right
		sprite.play("walk")
	else:
		sprite.play("idle")
	move_and_slide()
`,
        },
        { type: 'p', text: "You can also use only the `.tres` on your own `AnimatedSprite2D`. The `.tres` does not carry the feet offset: the `.tscn` does. Prefer the `.tscn`." },
        { type: 'actions', items: [{ to: 'sprites', label: "Try it in Sprites" }] },
      ],
    },
    {
      id: 'gdevelop',
      title: "GDevelop 5",
      blocks: [
        { type: 'p', text: "GDevelop gives you two ways to add an animation. Pick one. The ZIP has what both need, inside `gdevelop/<name>/`." },
        {
          type: 'table',
          head: ["Method", "Files you use", "Good for"],
          rows: [
            ["Frames", "`<animation>/<animation>_00.png`, `_01.png`…", "Few animations. Nothing else to learn."],
            ["Piskel spritesheet", "`spritesheets/<animation>.png`, one row per animation", "Many frames. One import per animation."],
          ],
        },
        { type: 'h3', id: 'gdevelop-frames', text: "Method A: frames" },
        {
          type: 'steps',
          items: [
            "Create a **Sprite** object. Use your character's name.",
            "For each animation, add an animation, click **Add images** and select every PNG in that animation's folder at once. GDevelop adds them in name order, which is why the files are numbered.",
            "Set the time between frames to `1 / fps`. At 10 fps it is `0.1` seconds. Turn **Loop** on or off as you chose in the tool.",
          ],
        },
        { type: 'h3', id: 'gdevelop-piskel', text: "Method B: Piskel spritesheet" },
        {
          type: 'steps',
          items: [
            "In the **Sprite** object, add an animation and open it with **Edit with Piskel**.",
            "In Piskel, choose **Import**, pick `spritesheets/<animation>.png` and choose **Import as spritesheet**.",
            "Type the frame size. It is your cell size, for example 32 by 32.",
            "Save and close Piskel. The frames appear in the animation.",
            "Set the time between frames to `1 / fps` and the loop, as in method A.",
          ],
        },
        { type: 'callout', title: "Heads up", text: "The menu names above follow GDevelop 5 as it was when we wrote this guide. If yours differ, `README.txt` in the folder lists the same steps with the exact values for your sheet." },
        { type: 'h3', id: 'gdevelop-origin', text: "Put the origin point at the feet" },
        { type: 'p', text: "By default the origin is the top-left corner. Then an object placed at (x, y) hangs from that corner, and the character shifts when you flip or scale it. Put the **Origin** point at the feet instead." },
        {
          type: 'steps',
          items: [
            "Open the **Points** editor of the Sprite.",
            "Set the **Origin** point to the value in `README.txt`. It is half the cell width across and the row of the feet down. For a 32 by 32 cell with no bottom margin, that is (16, 31).",
            "Tick **Apply the same points to all frames**, so every animation lines up.",
          ],
        },
        { type: 'h3', id: 'gdevelop-nearest', text: "Keep pixel art sharp" },
        { type: 'p', text: "In the project properties, set **Scale mode (also called sampling)** to **Nearest (no antialiasing)**. Turn on **Pixel rounding** if the camera moves. For smooth cartoon art, keep the default, Linear." },
        { type: 'actions', items: [{ to: 'sprites', label: "Try it in Sprites" }] },
      ],
    },
    {
      id: 'kaplay',
      title: "Kaplay",
      blocks: [
        { type: 'p', text: "The ZIP has `kaplay/<name>.png` and `kaplay/<name>.js`. The `.js` file has the `loadSprite` call ready to paste." },
        { type: 'p', text: "The sheet has one row per animation. Each animation starts at `from = row × columns`. That is why the snippet slices the sheet with `sliceX` and `sliceY`." },
        {
          type: 'code',
          lang: 'js',
          title: "main.js",
          code: `// Pixel art: crisp rendering, no smoothing.
kaplay({ crisp: true, texFilter: "nearest" });

loadSprite("hero", "hero.png", {
  sliceX: 6,
  sliceY: 2,
  anims: {
    idle: { from: 0, to: 3, loop: true, speed: 6 },
    walk: { from: 6, to: 11, loop: true, speed: 10 },
  },
});

// anchor("bot") puts the origin at the feet.
const hero = add([
  sprite("hero", { anim: "idle" }),
  pos(160, 120),
  anchor("bot"),
]);

onKeyDown("right", () => { hero.move(120, 0); hero.flipX = false; });
onKeyDown("left", () => { hero.move(-120, 0); hero.flipX = true; });
onKeyPress(["left", "right"], () => hero.play("walk"));
onKeyRelease(["left", "right"], () => hero.play("idle"));
`,
        },
        { type: 'callout', title: "Heads up", text: "If the cell has a bottom margin, the snippet adds it to `y`, so the feet, and not the bottom of the cell, stand on `pos`." },
        { type: 'actions', items: [{ to: 'sprites', label: "Try it in Sprites" }] },
      ],
    },
    {
      id: 'other',
      title: "Other engines",
      blocks: [
        { type: 'p', text: "The ZIP has a `generic/` folder for any engine that reads Aseprite sheets or slices a sheet by cell size." },
        { type: 'ul', items: [
          "`<name>.png` is the sheet, with one row per animation.",
          "`<name>.json` is in Aseprite's format: the rectangle of every frame, its duration in milliseconds and one tag per animation.",
          "`frames/<name>/<animation>_00.png` and so on: one PNG per frame, for engines that want separate images.",
        ] },
        { type: 'h3', id: 'other-how', text: "Where to start in each engine" },
        {
          type: 'table',
          head: ["Engine", "What to use"],
          rows: [
            ["Phaser", "Load the PNG and the JSON as an Aseprite atlas (`load.aseprite`), then create the animations from its tags. Check the Phaser docs for your version."],
            ["Unity", "Import the PNG, set **Sprite Mode** to **Multiple**, open the **Sprite Editor** and slice with **Grid By Cell Size**, using the cell size from the tool."],
            ["Defold", "Add the per-frame PNGs to an atlas and group them into animations, or make a tile source from the sheet with the cell size."],
            ["Construct", "Import the per-frame PNGs into an object's animation. It also imports a sprite strip."],
            ["Any other", "Slice the sheet by cell size. See below."],
          ],
        },
        { type: 'callout', title: "Heads up", text: "We know these engines less well than Godot, GDevelop and Kaplay, and their menus change between versions. Treat the names above as a pointer, and check the engine's own documentation." },
        { type: 'h3', id: 'other-slice', text: "Slice the sheet yourself" },
        { type: 'p', text: "Any engine that cuts a sheet into equal cells works. Use the cell size and the number of columns from the tool. Animation number `k` is row `k`, and frame `i` is column `i`. Put the origin at the feet: half the cell width across and `cell height − 1 − bottom margin` down." },
        { type: 'actions', items: [{ to: 'sprites', label: "Try it in Sprites" }] },
      ],
    },
    {
      id: 'tiles',
      title: "Tiles",
      blocks: [
        { type: 'p', text: "The Tiles tab has two tools: one cleans up a tile sheet the AI made, the other builds the transition tiles between two terrains." },
        { type: 'h3', id: 'tile-sheet', text: "Clean up a tile sheet" },
        {
          type: 'steps',
          items: [
            "Add one image with several tiles in rows and columns. Try the Andean mountains example.",
            "Pick the tile size: 16, 32, 48, 64 or your own.",
            "Check the grid. The tool detects columns and rows from the empty gaps between tiles. If the cut lines look wrong, untick **Detect automatically** and type the columns and rows.",
            "Download the ZIP.",
          ],
        },
        {
          type: 'figures',
          items: [
            { src: 'guide/tileset-before.jpg', alt: "A sheet of AI-drawn tiles: grass platforms, water, bridges, huts and plants on white.", caption: "The AI sheet", pixelated: false },
            { src: 'guide/tileset-atlas.png', alt: "The same tiles in an exact grid of 32 by 32 pixel cells with transparent background.", caption: "The atlas: every tile exactly 32 by 32", pixelated: true, zoom: 2, backdrop: 'checker' },
          ],
        },
        { type: 'p', text: "Every tile is resampled to exactly the size you chose and the background is removed. Empty cells are crossed out and left out of the tile set." },
        { type: 'p', text: "In Godot, copy `godot/<name>/` into your project, assign the `.tres` to a `TileMapLayer` and paint. In GDevelop, use the **Tilemap** object with the `.tsx` file (Tiled format) and the atlas PNG. Tiled and LDtk open the `.tsx` as a tileset." },
        { type: 'h3', id: 'terrains', text: "Terrain transitions" },
        { type: 'p', text: "Grass next to dirt needs edge and corner tiles. This tool draws them for you from two textures." },
        {
          type: 'steps',
          items: [
            "Add texture **A**, the base terrain, and texture **B**, painted over A. Both should be square and seamless. Tick **No texture B** to make an overlay layer that you can stack on any terrain.",
            "Choose the layout (see below) and tune the edge style: margin, softness, irregularity, seed, outline.",
            "Press **Shuffle map** in the test map. It must look connected everywhere. **Seams in A/B** tells you whether each texture repeats cleanly: close to 1 is good.",
            "Download the ZIP: the atlas PNG, a Godot `TileSet` with the terrain data filled in, and a README with the tile table.",
          ],
        },
        { type: 'p', text: "Ask the AI for textures that tile on both axes: the left edge continues into the right edge, and the top into the bottom." },
        {
          type: 'figures',
          items: [
            { src: 'guide/terrain-map.png', alt: "A test map of grass with a diagonal band of dirt, with smooth edges and corners between them.", caption: "The test map: dirt over grass", pixelated: true, zoom: 2 },
          ],
        },
        { type: 'h3', id: 'layouts', text: "Blob 47 or Dual 16" },
        {
          type: 'table',
          head: ["Layout", "Tiles", "Use it with"],
          rows: [
            ["Blob 47", "47 tiles, one per pattern of the 8 neighbours", "Godot Terrains. Godot picks the right tile for every cell."],
            ["Dual 16", "16 tiles, one per pattern of the 4 corners", "GDevelop, or Godot with the TileMapDual addon. Much easier to paint by hand."],
          ],
        },
        {
          type: 'figures',
          items: [
            { src: 'guide/terrain-blob47.png', alt: "The Blob 47 atlas: 8 by 6 tiles with every edge and corner combination of dirt over grass.", caption: "Blob 47", pixelated: true, zoom: 2 },
            { src: 'guide/terrain-dual16.png', alt: "The Dual 16 atlas: 4 by 4 tiles, one for each combination of four corners.", caption: "Dual 16", pixelated: true, zoom: 2 },
          ],
        },
        { type: 'p', text: "In Dual 16 each tile sits half a tile away from your map cells. That is how 16 tiles are enough." },
        { type: 'h3', id: 'paint-godot', text: "Paint with Terrains in Godot" },
        {
          type: 'steps',
          items: [
            "Copy `godot/<name>/` into your project, for example to `res://tiles/<name>/`.",
            "Add a `TileMapLayer` and set its **Tile Set** to `<name>.tres`.",
            "Open the **TileMap** panel and go to the **Terrains** tab.",
            "Pick the terrain and paint. Godot chooses the right edge tile for every cell. Set **Texture Filter** to **Nearest** for pixel art.",
          ],
        },
        { type: 'p', text: "Dual 16 needs the dual-grid logic of the TileMapDual addon (MIT, Standard layout), or you place tiles by hand." },
        { type: 'h3', id: 'paint-gdevelop', text: "Paint in GDevelop" },
        { type: 'p', text: "The Dual 16 atlas has no terrain data. Import the PNG as a tilemap atlas with your tile size and the column count in the README, and place tiles by hand. The README has a table that says which tile goes on each corner pattern." },
        { type: 'actions', items: [{ to: 'tiles', label: "Open Tiles" }] },
      ],
    },
    {
      id: 'troubleshooting',
      title: "Troubleshooting",
      blocks: [
        { type: 'p', text: "Find your problem in the first column. Most warnings in the tool already carry a fix button." },
        {
          type: 'table',
          head: ["Problem", "What to do"],
          rows: [
            ["The number of frames is wrong", "Use **Grid** with the rows and columns of the image. If specks of background became frames, raise the tolerance."],
            ["Part of the character disappears", "The background removal took it. Lower the tolerance, or use **Only from the edges**. Next time, generate on the green key."],
            ["“Content was clipped”", "Use a bigger cell or Auto. Wide characters need wider cells. A smaller character height also works."],
            ["My player and my enemy have different sizes", "Turn on the shared character height. See [Size](#/guide/size)."],
            ["“Big downscale”", "The AI drew the character much bigger than your target. Ask for a smaller character, around 32 art pixels, to get crisper results."],
            ["“No pixel grid found”", "The image is not pixel art, so use Cartoon. Or it is already at its native size."],
            ["Frames repeat or the character changes", "That comes from the AI. Generate again with a reference image of the character."],
            ["Pixel art looks blurry in the engine", "Set Nearest filtering: **Default Texture Filter** in Godot, **Scale mode** in GDevelop, `texFilter: \"nearest\"` in Kaplay."],
            ["The character floats, sinks or jumps when the animation changes", "The origin is not at the feet. Set the **Origin** point in GDevelop, or use `anchor(\"bot\")` in Kaplay."],
            ["Godot shows an error on the `.tres`", "Wait for the import, then reload the project. Check that the PNG imports as a Texture2D."],
            ["The tile grid is wrong", "Untick **Detect automatically** and type the columns and rows."],
            ["Tiles show seams when they repeat", "The texture is not seamless. Check **Seams in A/B** and generate it again asking for a tileable texture."],
          ],
        },
      ],
    },
    {
      id: 'glossary',
      title: "Glossary",
      blocks: [
        {
          type: 'dl',
          items: [
            { term: "Sprite", text: "A 2D image of a character or an object in a game." },
            { term: "Spritesheet", text: "One image that holds all the frames of a sprite, in rows and columns." },
            { term: "Frame", text: "One picture of an animation. A walk cycle has six or eight of them." },
            { term: "Cell", text: "The box that holds one frame in the sheet. Every cell has the same size, so the engine can cut the sheet evenly." },
            { term: "Origin (pivot)", text: "The point of the image that sits at the object's position. Here it is at the feet, so a character placed at (x, y) stands on that spot." },
            { term: "Pixel art and the pixel grid", text: "Pixel art is drawn one square pixel at a time. An art pixel is one of those squares. AI images draw them as blurry blocks, so the tool finds the grid and redraws them." },
            { term: "Palette", text: "The set of colours of an image. Pixel art uses a small one, 16 or 32 colours." },
            { term: "Chroma key", text: "A flat colour, magenta or green, that you use as a background so it is easy to remove." },
            { term: "Nearest filtering", text: "A way of scaling an image that copies the closest pixel and does not blur. It keeps pixel art sharp." },
            { term: "Tile and atlas", text: "A tile is a small square of the map. An atlas is one image that holds many tiles." },
            { term: "Autotile (terrain)", text: "A set of tiles with edges and corners that the engine picks for you, so grass meets dirt cleanly." },
          ],
        },
      ],
    },
  ],
  reference: {
    text: "The original written guide stays on GitHub as a reference.",
    link: "Open the guide on GitHub",
    href: 'https://github.com/alex-roc/align-sprites/blob/main/docs/README.md',
  },
};
