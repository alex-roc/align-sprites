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
            { title: "Frame size", text: "Each frame goes in a box of the same size, centred, with the feet on the line." },
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
          afterAlt: "The same wizard after align-sprites: sharp pixels, transparent background, 64 by 64 pixel frame.",
          caption: "The wizard as the AI drew it (1254 px, about 93 art pixels tall) and as align-sprites leaves it (a 64 px frame, transparent, crisp).",
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
        { type: 'p', text: "Making several sprites, tiles and objects for one game? The [Kit](#/guide/kit) tab joins them and checks that they share one scale." },
        { type: 'actions', items: [{ to: 'sprites', label: "Try it in Sprites" }, { to: 'ai', label: "Make with AI" }, { to: 'world', label: "World" }, { to: 'items', label: "Items" }, { to: 'kit', label: "Kit" }] },
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
            "**Attach a reference of your character** if you already have a good one. Generating from one reference image keeps the character consistent. The AI tends to copy the detail level of the reference rather than the height you asked for; that is fine, you choose the final size here.",
            "**Pick the key colour to suit the character.** Use magenta, or green if your character is pink, purple or magenta. The prompt tells the AI not to use the key colour on the character.",
            "**Ask for a small character**, between 16 and 48 art pixels tall. The AI keeps small characters more consistent.",
          ],
        },
        { type: 'figures', items: [{ src: 'guide/guide-3x2-magenta.png', alt: "A magenta grid of three columns by two rows with a line near the bottom of each box and a number in each box.", caption: "The guide image for a 3 by 2 sheet. The AI uses it as a template and does not copy its lines.", pixelated: false, zoom: 0.5 }] },
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
        { type: 'h3', id: 'more-prompts', text: "More things to ask for" },
        { type: 'p', text: "The tab has a prompt, and a guide image when a guide helps, for each of these. Pick the group (Sprites, World or Items) and the kind at the top." },
        {
          type: 'ul',
          items: [
            "**Top-down, 4 directions.** A walk cycle with one row per direction: down, left, right, up. The option **3 rows** asks for down, side and up, and your game flips the side row.",
            "**Video clip.** A text for a video model (Veo, Kling, Sora, Hailuo, Runway): a 2 to 4 second loop of the character moving in place, on a flat green background with a fixed camera. Start it from your character image if the model accepts one. The Sprites tab turns the video into frames.",
            "**Tile atlas.** A whole tileset in one image, with gaps of the key colour between tiles. The prompt asks for solid ground tops, so characters do not float. Open it in World, **Tile sheet**.",
            "**Parallax layers.** Open them in World, **Parallax background**. One prompt per layer (far, middle, near). The far layer is opaque, the others sit on the key colour, and all of them loop horizontally. Attach the far layer as a reference when you make the next one, so the style matches.",
            "**Effects.** Explosions, hit sparks, magic, smoke and projectiles, centred in each frame. The prompt asks for hard edges, because soft glows are removed together with the background.",
            "**Items and icons.** Open them in the Items tab. Many separate objects in one image, each centred in its own space, with the same scale and no shadows on the background.",
          ],
        },
        { type: 'h3', id: 'what-goes-wrong', text: "What the AI gets wrong" },
        { type: 'p', text: "These sheets were made in ChatGPT with this tool's own prompts and guide images. The numbers are measured, not guessed." },
        {
          type: 'example',
          item: { src: 'guide/knight-before.jpg', alt: "Six frames of a pixel art knight walking, on a magenta background.", caption: "Knight walk, pixel art, 6 frames on magenta.", pixelated: false },
          title: "Knight",
          facts: [
            "You asked for a character 32 art pixels tall. It came out about 58 pixels tall.",
            "The background was never the exact key colour: none of its pixels were #FF00FF, and there were about 8,500 shades of magenta.",
            "The horizontal centre drifts between frames (from 228 to 249 px in 256 px boxes).",
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
            ["Character off-centre or feet at different heights", "The tool. It aligns the feet and the centre in every frame."],
            ["Repeated poses", "You. Generate again."],
            ["The character changes between frames", "You. Generate again with a reference image."],
          ],
        },
        { type: 'h3', id: 'from-video', text: "Or make a video instead" },
        { type: 'p', text: "Video models (Veo, Kling, Sora, Hailuo and others) keep a character far more consistent than an image model drawing a grid. Ask for a short clip of the character running in place, seen from the side, with a fixed camera and a flat green background, then drop the video in the Sprites tab. Video frames are not pixel art: switch the art style to **Cartoon** unless your character is drawn in pixels." },
        {
          type: 'steps',
          items: [
            "Drop an MP4 or WebM file in the Sprites tab (a MOV only works if your browser can play it).",
            "In **Video to frames**, press **Find the loop**, or set the start and the end yourself. The end is not included, so the loop does not repeat its first frame.",
            "Choose how many frames you want (8 is a good start) and check the thumbnails.",
            "Press **Add frames**. They are laid out as a sheet and go through the same steps as any other image: background, size, frames and export.",
          ],
        },
      ],
    },
    {
      id: 'normalize',
      title: "Normalize",
      blocks: [
        { type: 'p', text: "Open the Sprites tab and drop one or more images. For each one the tool detects whether it is a **sprite sheet** (several frames) or a **single sprite** (one drawing), and picks sensible defaults. Change a setting only when the preview or a warning tells you to." },
        { type: 'p', text: "You can also drop a short video: the tool turns a looping range into frames. See [Or make a video instead](#/guide/generate)." },
        { type: 'p', text: "The settings follow the order you think in: art style, sprite size, frame size, frames, animations. Colours, background and advanced stay folded until you need them. With several images, the column splits into settings for all images and settings for only the selected one." },
        { type: 'actions', items: [{ to: 'sprites', label: "Try it in Sprites" }] },
        { type: 'h3', id: 'style', text: "Art style" },
        { type: 'p', text: "The switch at the top of the settings has two options." },
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
        { type: 'callout', title: "Heads up", text: "If you get “No clear pixel grid was found”, the image is not pixel art, or it is already at its original size. Switch to Cartoon." },
        { type: 'h3', id: 'size', text: "Sprite size and the same-height rule" },
        { type: 'p', text: "The sprite is the drawing of your character. **Sprite size** is its height in pixels. Pick one of the presets (Original, 8, 16, 32, 64, 96, 128) or choose Other and type your own. The tool also shows what it means in game tiles, for example “= 2 tiles of 32 px”, using the game tile size you set in [Kit](#/guide/kit)." },
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
        { type: 'p', text: "With **Original**, each image keeps the height the AI gave it. When you have several images of different heights, the tool tells you and offers one common size with a button. Every character in the batch is then resized to it. A boss or a small enemy gets a size relative to that height, such as 1.5 or 0.5." },
        { type: 'p', text: "A sheet's height is measured with most of its frames. In a jump or a crouching attack almost every frame is shorter than the character standing, so the character would come out bigger than in your other animations. The tool warns you: press **Measure the tallest frames**, or pick **Character height from: tallest frames**, and compare in **All together**. If an animation generated separately is still a bit bigger, adjust its **Relative size** (for example, 0.9)." },
        { type: 'callout', title: "Heads up", text: "Choose a height smaller than what the AI drew. Shrinking pixel art works well. Enlarging it makes the pixels uneven, and the tool warns you." },
        { type: 'h3', id: 'frame-size', text: "Frame size" },
        { type: 'p', text: "The frame is the canvas that each frame of the animation occupies. The sprite is the drawing; the frame is the box it sits in. Every frame has the same size, the sprite is centred sideways, and its feet land on the same line. That is what keeps the animation from wobbling in your game, and it is how an engine can cut your sheet into equal pieces." },
        {
          type: 'table',
          head: ["Setting", "What it is", "Example"],
          rows: [
            ["Sprite size", "The height of the drawing.", "32 px tall"],
            ["Frame size", "The box each frame sits in, with the feet on one line.", "64 by 64 px"],
          ],
        },
        { type: 'ul', items: [
          "**Automatic** picks the smallest multiple of 32 where every frame fits.",
          "**Custom** lets you type a width and a height, in steps of 8 px and never below what fits. Characters are usually taller than wide, for example 64 by 96. Animals and slimes need wider frames. Multiples of 32 work well in most engines.",
          "**Space under the feet** keeps empty rows below the feet. It only applies to a custom frame size.",
        ] },
        { type: 'p', text: "If a warning says a frame is cut by the frame edge, use a bigger frame size, Automatic, or a smaller sprite size." },
        { type: 'h3', id: 'image-type', text: "Sprite sheet or single sprite" },
        { type: 'p', text: "The tool detects the type when you drop the image, and it tells you what it found. If it guessed wrong, change it under **Image type**." },
        { type: 'ul', items: [
          "A **sprite sheet** has several frames. It gets the frames and animations settings, and the views Animation, Final sheet and Original.",
          "A **single sprite** is one drawing, for example a tree or a character that does not move. It has no animations, and it has the views Sprite and Original.",
        ] },
        { type: 'p', text: "A single sprite exports as a static sprite: a `Sprite2D` in Godot, one PNG in GDevelop, and a `loadSprite` without animations in Kaplay. The origin is still at the feet." },
        { type: 'h3', id: 'frames', text: "Frames" },
        { type: 'ul', items: [
          "**Automatic** finds each frame on its own and numbers the frames from 0 in reading order.",
          "**Grid** cuts the image into rows by columns. Use it when you know the layout. It is the most reliable choice when the AI placed the frames on an even grid.",
        ] },
        { type: 'p', text: "When the detection misses, draw the boxes yourself. In the **Original** view, press **Edit boxes**. Drag a box to move it and drag a corner to resize it. The arrow keys move the selected box, Delete removes it, and **Add box** draws a new one. **Back to automatic** undoes your boxes." },
        { type: 'h3', id: 'animations', text: "Animations" },
        { type: 'p', text: "Each animation has a name, a range of frames such as `0-5` or `0,2,4-6`, a speed in frames per second (FPS) and a loop switch. Leave the range blank to use all the frames." },
        { type: 'p', text: "One sheet can hold several animations. For example, `idle` with frames `0-3` and `walk` with frames `4-9`. Walks and idles loop. An attack usually does not." },
        { type: 'p', text: "**Mirror** flips an animation sideways. **Create mirrored copy** adds a new animation that is the mirror image of this one. The AI draws everyone facing right, so you get a left-facing `walk` without drawing it again." },
        { type: 'p', text: "Top-down games draw one walk cycle per direction, one per row. When the detected frames sit on 2 or more rows, **One animation per row** builds them for you. With 4 rows you get `walk_down`, `walk_left`, `walk_right` and `walk_up`. With 3 rows (down, side, up) the side is facing right, and `walk_left` is its mirror. Any other number of rows gives `anim_0`, `anim_1`… It replaces the animation list, so press it first." },
        { type: 'h3', id: 'origin-role', text: "Origin: feet or centre" },
        { type: 'p', text: "Choose the **Origin** of each image. **Feet** is for characters: the feet of every frame sit on one line. **Centre** is for effects, projectiles and things that float: every frame is centred in the frame, so an explosion grows from its middle, and the origin of the sprite is the middle of the frame. The space under the feet does not apply to centred sprites." },
        { type: 'p', text: "A centred image is sized by its biggest frame, not by the median one: the sprite size you set is the longest side of its largest frame." },
        { type: 'h3', id: 'collision', text: "Collision box" },
        { type: 'p', text: "Every sprite gets an automatic collision rectangle. For a character, the bottom sits on the feet line, the height is the character's height and the width is the body, so a sword, a cape or an arm held out do not widen it. For an effect, it is a centred rectangle a bit smaller than the frame. Tick **Collision box** under the animation to see it. The exports use it: see Godot, GDevelop and Kaplay." },
        { type: 'h3', id: 'frame-editor', text: "Fix single frames" },
        { type: 'p', text: "The frame editor sits under the frame strip and acts on the selected frame. You can reorder, duplicate or remove frames, and nudge a frame by one pixel when the feet jump." },
        { type: 'table',
          head: ["Action", "Shortcut"],
          rows: [
            ["Move the frame left or right", "`[` and `]`"],
            ["Duplicate the frame", "`D`"],
            ["Remove it from the animation", "`Delete`"],
            ["Nudge the frame 1 px", "`Shift` and the arrow keys"],
            ["Reset the nudge", "`0`"],
          ],
        },
        { type: 'p', text: "The AI often repeats a pose. The tool spots it and says, for example, “Frame 4 repeats frame 1”, with a **Remove duplicates** button. Repeated frames make an animation stutter, so remove them or generate the pose again." },
        { type: 'h3', id: 'colours', text: "Colours and palettes" },
        { type: 'p', text: "AI images have thousands of nearly identical shades. A small palette, shared by every image, makes your characters look like they live in the same world. Open **Colours** and choose one." },
        { type: 'ul', items: [
          "**Original colours** keeps what the AI used.",
          "A ready palette: **PICO-8**, **Sweetie 16**, **Endesga 32** or **Game Boy**. Every pixel snaps to the nearest colour of the palette.",
          "**From an image** takes the palette from any image you pick, for example your game's concept art.",
          "**Reduce to N colours** makes one palette of that size, shared by all images. Try 16 or 32.",
          "**My own palette** is a palette you build: click a colour to change it, add or remove colours, start from a ready palette or from the colours of your images, paste a list of codes, or import and export `.hex`, `.gpl` and `.txt` files (Lospec, GIMP, Paint.NET).",
        ] },
        { type: 'p', text: "Fixed palettes only work with pixel art. Cartoon keeps the original colours. The palette you choose also applies to your tiles, and you can change it in [Kit](#/guide/kit)." },
        { type: 'h3', id: 'variants', text: "Colour variants" },
        { type: 'p', text: "Need a red enemy and a blue one from the same drawing? Under **Colour variants**, click a colour to change it. Then press **Duplicate as colour variant**. You keep both versions, ready for enemies or teams. If a sprite has too many colours to change one by one, reduce them with a palette first." },
        { type: 'p', text: "With several images, **All images** applies the colour swap to the whole batch, or duplicates every image as a colour variant named `name_red` (you choose the ending). Only the colours an image has change. With a fixed palette you can also swap the whole palette for another one with the same number of colours, for example PICO-8 to Sweetie 16, and get a complete variant set in one go." },
        { type: 'h3', id: 'background', text: "Background" },
        { type: 'p', text: "Auto uses the most common colour on the image border. You can choose how it is removed." },
        { type: 'ul', items: [
          "**Everywhere (chroma key)** removes every pixel close to the colour, including holes between an arm and the body. Use it for magenta and green keys.",
          "**Only from the edges** removes only the background that touches the border. Use it for white backgrounds, so white or cream clothes survive. On light backgrounds it also removes enclosed pockets of the same flat white, like the gap between the feet; painted whites (eyes, teeth, highlights) are shaded and stay.",
        ] },
        { type: 'p', text: "If part of the character disappears, lower the tolerance. Next time, use the green key." },
        { type: 'h3', id: 'advanced', text: "Advanced" },
        { type: 'p', text: "The **Horizontal anchor** decides where each sprite is centred sideways in its frame. The default, the body column, ignores swords and capes. Change it only if the character wobbles from side to side." },
        { type: 'h3', id: 'check', text: "Check the result" },
        { type: 'p', text: "The stage on the right has views. A sprite sheet has **Animation**, **Final sheet** and **Original**. A single sprite has **Sprite** and **Original**. With several images, **All together** comes first." },
        { type: 'ul', items: [
          "**Animation** plays your frames on the yellow ground line, with zoom and onion skin. The ground line and the origin show where the feet go (a cross at the centre for centred sprites). **Collision box** draws the automatic hitbox over the frame.",
          "**Final sheet** is the PNG you export.",
          "**Original** shows your image with the detected frames in magenta, numbered from 0.",
        ] },
        { type: 'p', text: "Under the stage, the status line shows the frames, the pixel size the AI used, the height and the colours. Every warning comes with a button that applies the fix: a bigger frame size, the grid mode, a lower tolerance." },
        { type: 'h3', id: 'all-together', text: "All together: proof of the same scale" },
        { type: 'p', text: "With two or more images, **All together** puts every image side by side on one ground line, at the same zoom, with its name and height underneath. If a character looks too big or too small here, it will look so in your game. Pick a common sprite size and look again." },
        { type: 'h3', id: 'export', text: "Export" },
        { type: 'p', text: "Under the stage, choose the engine and press **Download for Godot 4** (or GDevelop 5, Kaplay, Other). **All engines** puts one folder per engine in the ZIP. With a batch, the button downloads all the images, and you can choose to download only the selected one. **PNG only** gives you just the sheet." },
      ],
    },
    {
      id: 'godot',
      title: "Godot 4",
      blocks: [
        { type: 'p', text: "The ZIP has a `<name>/` folder. A sprite sheet gets four files: the sheet `<name>.png`, a `SpriteFrames` resource `<name>.tres`, a ready scene `<name>.tscn` with an `AnimatedSprite2D`, and a `README.txt`. A single sprite gets a `Sprite2D` scene instead, with no `.tres`." },
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
        { type: 'p', text: "The scene sets the sprite so its origin sits at the character's feet. When you place the node at a position, the feet stand on that spot. Images set to **Centre** (effects, projectiles) are centred on the node instead." },
        { type: 'h3', id: 'godot-body', text: "A scene with a collision box" },
        { type: 'p', text: "Next to `<name>.tscn` there is `<name>_body.tscn`: a `CharacterBody2D` with the same sprite and a `CollisionShape2D` with a rectangle already placed on the body. Use it for the player or an enemy. The shape is a plain `RectangleShape2D`: resize it if you want a tighter hitbox." },
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
        { type: 'p', text: "The ZIP has one folder per image with its frames already cut: `<name>/<name>_<animation>_00.png`, `_01.png`… (when your sheet has a single unnamed animation, `<name>_00.png`…), plus a `README.txt` with the origin and the fps. So you pick every frame of an animation in one go." },
        {
          type: 'table',
          head: ["Method", "Files you use", "Good for"],
          rows: [
            ["Frames", "`<name>_<animation>_00.png`, `_01.png`…", "The usual way. Nothing else to learn."],
            ["Piskel spritesheet", "`<name>/spritesheets/<name>_<animation>.png`, one row per animation. Only if you tick **Also spritesheets for Piskel** when exporting.", "When you want to touch up the frames in Piskel."],
          ],
        },
        { type: 'h3', id: 'gdevelop-frames', text: "Method A: frames" },
        {
          type: 'steps',
          items: [
            "Create a **Sprite** object. Use your character's name.",
            "For each animation, add an animation, click **Add images** and select every PNG of that animation at once (the ones starting with `<name>_<animation>_`). GDevelop adds them in name order, which is why the files are numbered.",
            "Set the time between frames to `1 / fps`. At 10 fps it is `0.1` seconds. Turn **Loop** on or off as you chose in the tool.",
          ],
        },
        { type: 'h3', id: 'gdevelop-piskel', text: "Method B: Piskel spritesheet" },
        {
          type: 'steps',
          items: [
            "In the **Sprite** object, add an animation and open it with **Edit with Piskel**.",
            "In Piskel, choose **Import**, pick `<name>/spritesheets/<name>_<animation>.png` and choose **Import as spritesheet**. (To get it, tick **Also spritesheets for Piskel** before downloading.)",
            "Type the frame size. It is the frame size you chose in the tool, for example 32 by 32.",
            "Save and close Piskel. The frames appear in the animation.",
            "Set the time between frames to `1 / fps` and the loop, as in method A.",
          ],
        },
        { type: 'callout', title: "Tip when importing again", text: "GDevelop copies the images you pick into your project folder. If you later delete the sprite or its images **inside GDevelop**, the PNGs stay in that folder. When you import again, GDevelop finds those names taken, renames the copies (`_002`, `_013`…) and can repeat frames or leave a drawing cut in half. Before importing again, also delete the old PNGs from the project folder. Another option: unzip the ZIP inside the project folder (for example in `sprites/`), pick the images from there and, to update, unzip again on top." },
        { type: 'callout', title: "Heads up", text: "The menu names above follow GDevelop 5 as it was when we wrote this guide. If yours differ, `README.txt` in each folder lists the same steps with the exact values for your sheet." },
        { type: 'p', text: "A single sprite is simpler: the ZIP has one PNG, `<name>/<name>.png`. Add it to the Sprite object's only animation." },
        { type: 'h3', id: 'gdevelop-origin', text: "Put the origin point at the feet" },
        { type: 'p', text: "By default the origin is the top-left corner. Then an object placed at (x, y) hangs from that corner, and the character shifts when you flip or scale it. Put the **Origin** point at the feet instead." },
        {
          type: 'steps',
          items: [
            "Open the **Points** editor of the Sprite.",
            "Set the **Origin** point to the value in `README.txt`. It is half the frame width across and the row of the feet down. For a 32 by 32 frame with no space under the feet, that is (16, 31).",
            "Tick **Apply the same points to all frames**, so every animation lines up.",
          ],
        },
        { type: 'h3', id: 'gdevelop-collision', text: "Set the collision mask" },
        { type: 'p', text: "`README.txt` lists the 4 points of the automatic collision box, in image pixels with (0, 0) at the top-left corner. Open the **collision mask** editor of the animation, choose a custom mask, drag the corners of the rectangle onto those points and tick **Use the same collision masks for all animations / frames**. Without it, GDevelop uses the whole image, empty margins included. For images set to **Centre**, the origin point is the middle of the frame." },
        { type: 'h3', id: 'gdevelop-nearest', text: "Keep pixel art sharp" },
        { type: 'p', text: "In the project properties, set **Scale mode (also called sampling)** to **Nearest (no antialiasing)**. Turn on **Pixel rounding** if the camera moves. For smooth cartoon art, keep the default, Linear." },
        { type: 'actions', items: [{ to: 'sprites', label: "Try it in Sprites" }] },
      ],
    },
    {
      id: 'kaplay',
      title: "Kaplay",
      blocks: [
        { type: 'p', text: "The ZIP has `<name>.png` and `<name>.js`. The `.js` file has the `loadSprite` call ready to paste." },
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
        { type: 'p', text: "A single sprite gets a plain `loadSprite(\"name\", \"name.png\")`, with no `sliceX` and no `anims`, and the same `anchor(\"bot\")`." },
        { type: 'callout', title: "Heads up", text: "If the frame has space under the feet, the snippet adds it to `y`, so the feet, and not the bottom of the frame, stand on `pos`." },
        { type: 'p', text: "The snippet also has an `area({ shape: new Rect(vec2(x, y), w, h) })` line with the automatic collision box, so you can use collisions right away. Images set to **Centre** use `anchor(\"center\")` instead of `anchor(\"bot\")`." },
        { type: 'actions', items: [{ to: 'sprites', label: "Try it in Sprites" }] },
      ],
    },
    {
      id: 'other',
      title: "Other engines",
      blocks: [
        { type: 'p', text: "The **Other** ZIP is for any engine that reads Aseprite sheets or slices a sheet by frame size." },
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
            ["Unity", "Import the PNG, set **Sprite Mode** to **Multiple**, open the **Sprite Editor** and slice with **Grid By Cell Size**, using the frame size from the tool."],
            ["Defold", "Add the per-frame PNGs to an atlas and group them into animations, or make a tile source from the sheet with the frame size."],
            ["Construct", "Import the per-frame PNGs into an object's animation. It also imports a sprite strip."],
            ["Any other", "Slice the sheet by frame size. See below."],
          ],
        },
        { type: 'callout', title: "Heads up", text: "We know these engines less well than Godot, GDevelop and Kaplay, and their menus change between versions. Treat the names above as a pointer, and check the engine's own documentation." },
        { type: 'h3', id: 'other-slice', text: "Slice the sheet yourself" },
        { type: 'p', text: "Any engine that cuts a sheet into equal frames works. Use the frame size and the number of columns from the tool. Animation number `k` is row `k`, and frame `i` is column `i`. Put the origin at the feet: half the frame width across and `frame height − 1 − space under the feet` down." },
        { type: 'actions', items: [{ to: 'sprites', label: "Try it in Sprites" }] },
      ],
    },
    {
      id: 'world',
      title: "World",
      blocks: [
        { type: 'p', text: "The World tab builds the ground and the scenery of your game. It has three tools, in the same order as in the tab: **Tile sheet** cleans up a sheet of tiles made by the AI, **Terrain transitions** draws the edge and corner tiles between two terrains, and **Parallax background** turns images into layers that scroll behind your character. Pick the tool at the top of the tab. Coins, keys and icons have their own tab: [Items](#/guide/items)." },
        { type: 'h3', id: 'tile-sheet', text: "Clean up a tile sheet" },
        {
          type: 'steps',
          items: [
            "Add one image with several tiles in rows and columns. Try the Andean mountains example.",
            "Pick the tile size: 8 to 128 px, or your own.",
            "Check the grid. The tool detects columns and rows from the empty gaps between tiles. If the cut lines look wrong, untick **Detect columns and rows automatically** and type the columns and rows.",
            "Choose a format (Godot 4, Tiled / GDevelop or PNG) or all formats, and download.",
          ],
        },
        {
          type: 'figures',
          items: [
            { src: 'guide/tileset-before.jpg', alt: "A sheet of AI-drawn tiles: grass platforms, water, bridges, huts and plants on white.", caption: "The AI sheet", pixelated: false },
            { src: 'guide/tileset-atlas.png', alt: "The same tiles in an exact grid of 32 by 32 pixel tiles with transparent background.", caption: "The atlas: every tile exactly 32 by 32", pixelated: true, zoom: 2, backdrop: 'checker' },
          ],
        },
        { type: 'p', text: "Every tile is resampled to exactly the size you chose and the background is removed. Empty tiles are crossed out and left out of the tile set." },
        { type: 'p', text: "In Godot, copy `godot/<name>/` into your project, assign the `.tres` to a `TileMapLayer` and paint. In GDevelop, use the **Tilemap** object with the `.tsx` file (Tiled format) and the atlas PNG. Tiled and LDtk open the `.tsx` as a tileset." },
        { type: 'h3', id: 'terrains', text: "Terrain transitions" },
        { type: 'p', text: "Grass next to dirt needs edge and corner tiles. This tool draws them for you from two textures." },
        {
          type: 'steps',
          items: [
            "Add texture **A**, the base terrain, and texture **B**, painted over A. Both should be square and seamless. Tick **No texture B: paint A over transparent** to make an overlay layer that you can stack on any terrain.",
            "Choose the layout, **Blob 47 (Godot)** or **Dual 16 (GDevelop)** (see below) and tune the edge style: margin, softness, irregularity, seed, outline.",
            "Press **Shuffle map** in the test map. It must look connected everywhere. **Seams in A** and **Seams in B** tell you whether each texture repeats cleanly.",
            "Press **Download ZIP**: the atlas PNG, a Godot `TileSet` with the terrain data filled in, and a README with the tile table.",
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
            ["Blob 47", "47 tiles, one per pattern of the 8 neighbours", "Godot Terrains. Godot picks the right tile for every square."],
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
        { type: 'p', text: "In Dual 16 each tile sits half a tile away from your map squares. That is how 16 tiles are enough." },
        { type: 'h3', id: 'paint-godot', text: "Paint with Terrains in Godot" },
        {
          type: 'steps',
          items: [
            "Copy `godot/<name>/` into your project, for example to `res://tiles/<name>/`.",
            "Add a `TileMapLayer` and set its **Tile Set** to `<name>.tres`.",
            "Open the **TileMap** panel and go to the **Terrains** tab.",
            "Pick the terrain and paint. Godot chooses the right edge tile for every square. Set **Texture Filter** to **Nearest** for pixel art.",
          ],
        },
        { type: 'p', text: "Dual 16 needs the dual-grid logic of the TileMapDual addon (MIT, Standard layout), or you place tiles by hand." },
        { type: 'h3', id: 'paint-gdevelop', text: "Paint in GDevelop" },
        { type: 'p', text: "The Dual 16 atlas has no terrain data. Import the PNG as a tilemap atlas with your tile size and the column count in the README, and place tiles by hand. The README has a table that says which tile goes on each corner pattern." },
        { type: 'h3', id: 'parallax', text: "Parallax background" },
        { type: 'p', text: "A parallax background is made of layers (sky, hills, trees) that scroll at different speeds when the camera moves, so the scene looks deep. The **Parallax background** tool turns AI images into layers that repeat sideways, sized for your game." },
        {
          type: 'steps',
          items: [
            "Add 1 to 4 images, from the farthest to the nearest. Put them in order with the arrows. Far layers get a low **Speed** (0.2), near ones a high one (0.8). 0 stays still and 1 moves with the camera.",
            "Nearer layers on a flat colour (magenta) can have their background cut out, so the layers behind show through.",
            "The height of every layer is the height of your game screen (the one you set in [Kit](#/guide/kit)). The width follows the image. Pixel art keeps its own pixel grid: it is enlarged by a whole number (for example ×2), and the top is filled in or cut so the layer matches the height of your game.",
            "With **Make it repeat sideways** on, the right edge is joined to the left edge along a hidden cut, so nothing jumps when the layer repeats. Check it in **Repeat check**: the layer is shown twice and a line marks the join. If the picture already wraps around its edge (a tree split across it), it is left as it is. If a warning says it still does not join cleanly, use a wider join.",
            "Watch the **Scroll** preview, then pick your engine and download.",
          ],
        },
        { type: 'p', text: "Godot (4.3 or newer) gets a scene with one `Parallax2D` per layer. GDevelop gets the PNGs and a README: each layer is a Tiled Sprite with the “Parallax for Tiled Sprite” extension. Kaplay gets a snippet that draws every layer. Other gets the PNGs and a JSON with the size and speed of each layer." },
        { type: 'actions', items: [{ to: 'world', label: "Open World" }] },
      ],
    },
    {
      id: 'items',
      title: "Items",
      blocks: [
        { type: 'p', text: "The Items tab is for the small objects of your game: coins, potions, keys, gems and UI icons. The AI draws many of them in one image; this tab gives each one a slot of the same size." },
        { type: 'h3', id: 'items-icons', text: "Items and icons" },
        { type: 'p', text: "The tool finds every separate object and puts it in a slot of the size you choose: the same slot size for all, the art centred and never stretched." },
        {
          type: 'steps',
          items: [
            "Add the image (or try the example). The background is removed and every separate shape becomes an item. Items are numbered in reading order.",
            "Pick the **Slot size** and how items are scaled. **Keep relative sizes** gives all items one scale, so a coin stays smaller than a sword. **Each item fills its slot** makes every item as large as it can be, which is good for icons.",
            "In **Original**, click an item to cross it out and leave it out of the atlas (a stray mark, or an item much bigger than the rest). In **Atlas**, name each item.",
            "Press **Download**. Godot gets one `.tres` per item (an AtlasTexture of the atlas), GDevelop gets one PNG per item, Kaplay gets a `loadSpriteAtlas` snippet and Other gets the atlas PNG, a JSON with the rectangles and the loose PNGs.",
          ],
        },
        { type: 'p', text: "Pixel art is never enlarged: items smaller than the slot stay at their real size, centred. If one item is made of pieces far apart, untick **Find the separate shapes automatically** and give the columns and rows of the sheet." },
        { type: 'actions', items: [{ to: 'items', label: "Open Items" }] },
      ],
    },
    {
      id: 'kit',
      title: "Kit",
      blocks: [
        { type: 'p', text: "The Kit tab joins everything in your game: the sprites from Sprites, the scenery (tiles and background) from World and the objects from Items. It matters because sprites and tiles must agree on scale. If they do not, your character looks too big for your ground." },
        { type: 'h3', id: 'kit-tile', text: "Game tile size" },
        { type: 'p', text: "Choose the size of the grid your game is built on: 16, 32, 48 or 64 px. Sprites then show their height in tiles, and your tiles are checked against it. If a tile set uses another size, the Kit warns you and offers a button to use that size for the game." },
        { type: 'h3', id: 'kit-palette', text: "Shared palette" },
        { type: 'p', text: "This is the same palette as **Colours** in Sprites. A fixed palette is also applied to your tiles, so sprites and ground use the same colours." },
        { type: 'h3', id: 'kit-preview', text: "Preview at real scale" },
        { type: 'p', text: "The preview puts your sprites on a row of your tiles, at one scale. If it looks right here, it will look right in your game. It needs a tile atlas or a terrain from World to draw the ground." },
        { type: 'h3', id: 'kit-resolution', text: "Game resolution" },
        { type: 'p', text: "This is the size of your game screen before it is scaled up to the monitor. Pick one that scales to the screen by a whole number: 640×360 times 3 is exactly 1920×1080. A fraction, like ×1.5, makes pixels blurry or uneven. The tile size and the character height should fit the resolution:" },
        {
          type: 'table',
          head: ["Game", "Tile", "Character", "Full HD", "4K"],
          rows: [
            ["320×180", "16 px", "24 to 32 px", "×6", "×12"],
            ["640×360", "32 px", "48 to 64 px", "×3", "×6"],
            ["960×540", "48 px", "72 to 96 px", "×2", "×4"],
            ["1280×720", "64 px", "112 to 144 px", "not whole", "×3"],
          ],
        },
        { type: 'h3', id: 'kit-level', text: "Test level" },
        { type: 'p', text: "Press **Play** in the Test level card to walk, run and jump with your character on your ground, before you export. It runs in the real Kaplay library at your game resolution, with the same sheet, animations, feet and collision box that the Kaplay export has. If the character looks too big, floats, or moves too fast, fix it here and not in your engine." },
        { type: 'ul', items: [
          "Choose which animation plays when standing, walking, running and in the air. The names are guessed for you, and each one can come from a different image.",
          "Pick the ground tile. Sprites stand on the first solid row of the tile, so grass blades on top do not make them float.",
          "Move with the arrow keys or A and D, run with Shift, jump with Space, W or Up arrow, and close with Esc.",
        ] },
        { type: 'h3', id: 'kit-download', text: "Download the kit" },
        {
          type: 'steps',
          items: [
            "Choose the engine and press **Download the kit for Godot 4** (or the engine you use).",
            "Unzip the file in your project folder. The `sprites/`, `tiles/`, `items/` and `backgrounds/` folders keep each part together (a folder is there only when you made that part).",
            "Read `README.txt`. It lists every sprite height, the frame sizes, the tile size and the palette.",
          ],
        },
        {
          type: 'table',
          head: ["Engine", "What the kit has"],
          rows: [
            ["Godot 4", "A scene for each sprite, and the `TileSet` `.tres` to assign to a `TileMapLayer`."],
            ["GDevelop 5", "The sprite folders, and the tile atlas PNG with a Tiled `.tsx` for the Tilemap object."],
            ["Kaplay", "A `.js` snippet for each sprite. The tiles load as one sliced sprite: frame = row × columns + column."],
            ["Other", "The sheet with its Aseprite JSON, and the tile atlas with a Tiled `.tsx`."],
          ],
        },
        { type: 'actions', items: [{ to: 'kit', label: "Open Kit" }] },
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
            ["The image was detected as the wrong type", "Change it under **Image type**: sprite sheet or single sprite."],
            ["The number of frames is wrong", "Use **Grid** with the rows and columns of the image. If specks of background became frames, raise the tolerance. You can also draw the boxes yourself with **Edit boxes** in the Original view."],
            ["Part of the character disappears", "The background removal took it. Lower the tolerance, or use **Only from the edges**. Next time, generate on the green key."],
            ["A frame is cut by the frame edge", "Use a bigger frame size or Automatic. Wide characters need wider frames. A smaller sprite size also works."],
            ["My player and my enemy have different sizes", "Pick one common sprite size. See [Sprite size](#/guide/size)."],
            ["The tool says the sprite is shrunk a lot", "The AI drew the character much bigger than your sprite size. Ask for a smaller character, around 32 art pixels, to get crisper results."],
            ["“No clear pixel grid was found”", "The image is not pixel art, so use Cartoon. Or it is already at its original size."],
            ["Frames repeat or the character changes", "The AI repeated a pose. Press **Remove duplicates**, or generate again with a reference image of the character."],
            ["The feet jump between frames", "Select the frame and nudge it with the frame editor: `Shift` and the arrow keys."],
            ["The character faces the wrong way", "Use **Create mirrored copy** on the animation. You get the other direction without drawing it."],
            ["Pixel art looks blurry in the engine", "Set Nearest filtering: **Default Texture Filter** in Godot, **Scale mode** in GDevelop, `texFilter: \"nearest\"` in Kaplay."],
            ["The character floats, sinks or jumps when the animation changes", "The origin is not at the feet. Set the **Origin** point in GDevelop, or use `anchor(\"bot\")` in Kaplay."],
            ["Godot shows an error on the `.tres`", "Wait for the import, then reload the project. Check that the PNG imports as a Texture2D."],
            ["The tile grid is wrong", "Untick **Detect columns and rows automatically** and type the columns and rows."],
            ["Tiles show seams when they repeat", "The texture is not seamless. Check **Seams in A** and **Seams in B**, and generate the texture again asking for a tileable one."],
            ["Sprites and tiles do not fit together", "Set the game tile size in [Kit](#/guide/kit-tile) and use the same size for your tiles. The Kit tells you which tile set differs."],
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
            { term: "Sprite size", text: "The height of the drawing, in pixels. The same sprite size gives the same scale in your game." },
            { term: "Sprite sheet", text: "One image that holds all the frames of a sprite, in rows and columns." },
            { term: "Single sprite", text: "One drawing with no animation, such as a tree. It exports as a static sprite." },
            { term: "Frame", text: "One picture of an animation. A walk cycle has six or eight of them." },
            { term: "Frame size", text: "The box each frame sits in. Every frame has the same size, with the feet on one line, so the engine can cut the sheet evenly." },
            { term: "Origin (pivot)", text: "The point of the image that sits at the object's position. Here it is at the feet, so a character placed at (x, y) stands on that spot." },
            { term: "Pixel art and the pixel grid", text: "Pixel art is drawn one square pixel at a time. An art pixel is one of those squares. AI images draw them as blurry blocks, so the tool finds the grid and redraws them." },
            { term: "Palette", text: "The set of colours of an image. Pixel art uses a small one, 16 or 32 colours. In the tool, one palette is shared by every image and tile." },
            { term: "Colour variant", text: "A copy of a sprite with some colours changed, for example a blue enemy made from a red one." },
            { term: "Chroma key", text: "A flat colour, magenta or green, that you use as a background so it is easy to remove." },
            { term: "Nearest filtering", text: "A way of scaling an image that copies the closest pixel and does not blur. It keeps pixel art sharp." },
            { term: "Tile and atlas", text: "A tile is a small square of the map. An atlas is one image that holds many tiles." },
            { term: "Autotile (terrain)", text: "A set of tiles with edges and corners that the engine picks for you, so grass meets dirt cleanly." },
            { term: "Kit", text: "Your sprites, scenery, objects and palette in one export, sharing one scale." },
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
  credits: {
    title: "Credits",
    lines: [
      "Built by Alex Ojeda Copa, Lab TecnoSocial.",
      "Pixel-grid detection uses [unfake.js](https://github.com/jenissimo/unfake.js) by Eugeniy Smirnov, under the MIT licence. [Read its licence notice](https://github.com/jenissimo/unfake.js/blob/main/LICENSE).",
      "align-sprites is free software under the GPL-3.0 licence. [Read the licence](https://github.com/alex-roc/align-sprites/blob/main/LICENSE).",
    ],
  },
};
