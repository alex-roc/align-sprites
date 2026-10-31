# Codex samples

Real AI-generated sprites and tiles used as regression input for align-sprites. They were made with the project's
own prompt templates (`src/core/prompts/`) and guide images, and are kept **unedited**: their defects are exactly
what the tool has to fix.

- **Tool:** `codex-image-gen` skill (codex-cli → built-in image tool, gpt-image-2), `batch` mode, one codex session
  for all six images; driver model `gpt-5.6-luna`, reasoning effort `low`, lean context.
- **Date:** 2026-10-31.
- **Cost:** 16,803 codex text tokens in total (~2,800 per image) plus six gpt-image-2 generations on the ChatGPT
  plan; 213 s wall time.
- **Inputs:** `manifest.json` (the exact batch manifest, prompts included) and `guides/` (guide images from
  `makeGuideImage`, cell 256 px, attached as reference image 1 to each sprite item). Tiles have no guide.
- **Measurements** below come from a throwaway Node script (bg = pixels within L1 distance 90 of the key colour;
  pixel period from unfake `detectGrid`; feet = last non-bg row of each cell, as % of the cell height).

## Files and observed defects

| File | Request | Output | Defects |
|---|---|---|---|
| `knight-walk-pixel.png` | pixel art, walk, 6 frames, 3×2, ~32 art px tall, side view, #FF00FF | 1536×1024 | Background is not the exact key: 0 % of bg pixels are #FF00FF, mostly `249,3,249` with ~8.5k distinct near-magenta shades (noise). Pixel period 7.0 px → character ≈ 58 art px tall, not 32. Many colours inside the sprite (~100k distinct: soft/noisy edges, not a 16-colour palette). Bbox heights vary 380–412 px (the "down" frames are lower, partly legitimate). Horizontal centre drifts 228–249 px in 256-px cells; feet at 92.6–93.2 % instead of the 90 % baseline (consistent, but off the guide). Frames 4–6 largely repeat 1–3 (near/far leg swap barely readable). Cell borders and baseline of the guide were not drawn (good). |
| `slime-idle-cartoon.png` | cartoon, idle, 4 frames, 2×2, #FF00FF (green subject → magenta key) | 1254×1254 | Canvas is 1254 px (cells of 627 px), not the 512-px guide size. Background `251,4,249` + ~4.3k shades, never exact. Feet at ~80 % of the cell, not on the 90 % baseline. Frames almost identical (frame 4 ≈ frame 1): the idle motion is a 2–15 % height change only (286–340 px). Soft anti-aliased outline with a dark rim. |
| `wizard-single-pixel-large.png` | single character, pixel art, ~64 art px, front view, #FF00FF | 1254×1254 | The "loose character too large" case: 963 px tall on a 1254-px canvas. Fractional pixel period (10.36×10.40) → ≈ 93 art px instead of 64, with uneven block sizes. ~100k distinct colours inside the sprite (soft edges, not a limited palette). Background `251,3,251` with noise. Slightly off-centre (599 vs 627). |
| `fox-run-cartoon.png` | cartoon, run (Spanish prompt «correr»), 6 frames, 3×2, #00FF00 | 1536×1024 | Bottom row is a near copy of the top row (mean diff 3.5–4.7 vs ~21 between consecutive frames): only 3 distinct poses. Feet drift 443 → 433 px across frames (up to 10 px, ~2 % of the cell). Wide frames get close to the left cell border (x = 23 px). Background `2,249,2` + ~7.5k shades, never exact #00FF00. The quadruped gait does not follow the biped key poses of the prompt. |
| `grass-seamless-pixel.png` | seamless top-down grass, pixel art, 32×32 art px | 1254×1254 | Resolution is 64×64 art px (period 19.59, fractional), not 32×32. ~50k distinct colours (no limited palette, per-block noise). Seams are acceptable: right→left edge difference 30.0 vs 30.4 for any interior art-pixel boundary, bottom→top 22.2. |
| `dirt-seamless-pixel.png` | seamless top-down dirt with pebbles, pixel art, 32×32 art px | 1254×1254 | Same 64×64 art-px fractional grid (19.59), ~18k colours. Seams fine (13.8 / 11.7 vs 16.8 interior). Pebbles are cut by the image edges; continuity across the wrap is plausible but not exact. |

## Second batch: Alex's character (hero-idle, hero-run)

- **Goal:** two animations of the course character (`reference/personaje.png` = `samples/real/Personaje.png`, the
  single sprite on white) made by following the tool's own rules, to check the whole flow on a realistic case.
  The originals are also in Alex's Drive (`…/Mis assets/Visuales/bien-generados/`).
- **Inputs:** `manifest-hero.json` (exact manifest, Spanish prompts from `buildSpritePrompt` with `withReference`,
  `artHeight` 64, view side, key magenta). References: the guide first, then the character.
- **Date / cost:** 2026-10-31, one `batch` session, 13,513 codex text tokens (~6,800 per image) plus two
  gpt-image-2 generations; 72 s.
- **Result:** both look like the same character as the reference (outfit, colours, hair), strict profile.
  Normalized at 128 px together with `Personaje.png`: 1 + 4 + 6 frames, reference height exactly 128 each,
  one 128×160 cell, feet on the same row (test: `pipeline.test.ts`).

| File | Request | Output | Defects |
|---|---|---|---|
| `hero-idle-pixel.png` | pixel art, «reposo», 4 frames, 2×2, ~64 art px, side view, #FF00FF, + reference | 1254×1254 | Pixel period 3.0 → ≈190 art px tall, not 64: the model copies the detail level of the reference image instead of the requested size (the tool warns "big downscale" at 128 px). Background `244..248, 3..7, 247..249` with noise. The idle motion is tiny: frame 4 ≈ frame 1 (flagged as duplicates, which is right for a loop). Characters sit left of the cell centre in the left column. |
| `hero-run-pixel.png` | pixel art, «correr», 6 frames, 3×2, ~64 art px, side view, #FF00FF, + reference | 1536×1024 | **Redrew the guide's cell borders** as faint darker-magenta lines (`≈202,4,202`, ΔE≈19 from the key, just over the default tolerance 18): before the fix they survived background removal and became a 290-px-tall extra "frame". Fixed in `bg` (`keyShade`: a lighter/darker shade of a chroma key is background). Period 3.0 (≈150 art px). Bottom row close to the top row but not duplicated. Heights 117–129 px at 128 (crouch frames are legitimately shorter). |

## Third batch: jump, single sprite, Andean tiles, and two informal prompts

- **Inputs:** `manifest-hero-2.json` (exact manifest). Guided items use `buildSpritePrompt` / `buildTilePrompt`
  (Spanish, pixel art, magenta key, character reference). The two `casual-*` items use an informal prompt on
  purpose (“crea una hoja de sprites… 8 cuadros en una sola fila… Fondo blanco”, reference only, no guide), to
  match Alex's older course assets; they now live in `samples/real/Reposo.png` and `samples/real/Saltar.png`.
- **Date / cost:** 2026-10-31, one `batch` session of 6 images, 15,091 codex text tokens (~2,500 per image) plus
  six gpt-image-2 generations; 214 s.
- **Drive:** guided ones in `…/Mis assets/Visuales/bien-generados/`, informal ones next to `Correr.png`.

| File | Request | Output | Defects |
|---|---|---|---|
| `hero-jump-pixel.png` | pixel art, «saltar», 6 frames, 3×2, + reference | 1536×1024 | Faint guide borders again (removed by `keyShade`). Heights 113–151 px at period 3: most frames are crouched, so the median (default reference) made the character ≈15 % bigger than in idle; the tool now warns (`warn.heightSpread`) and offers **Measure the tallest frames** (`ScalePolicy.reference = 'tallest'`, 90th percentile), which matches the idle size. Frame 6 ≈ frame 1 (crouch), flagged as duplicates. |
| `hero-single-pixel.png` | single sprite, «reposo», guide 1×1, + reference | 1254×1254 | Period 8 → ≈137 art px (asked 64). Clean, centred, feet near the baseline. |
| `andes-grass-pixel.png` | seamless top-down puna grass (ichu), 32×32 art px | 1254×1254 | Finer than 32 art px; seamless. |
| `andes-earth-pixel.png` | seamless top-down red Andean earth with pebbles, 32×32 art px | 1254×1254 | The texture is internally a 2×2 repeat of one pattern (visible repetition), seamless. |
| `casual-Reposo` → `samples/real/Reposo.png` | informal: idle, 8 frames in one row, white bg | 1536×1024 | No guide: 8 frames side by side with tiny gaps, white background; detection still finds 8. Idle motion almost nil: 3 duplicate groups. |
| `casual-Saltar` → `samples/real/Saltar.png` | informal: jump, 8 frames in one row, white bg | 1536×1024 | Draws the jump **arc** in place (the character rises across the strip); aligning the feet removes it, which is what a game wants (physics moves the body). Period 5; heights 93–151 px at 128 → height-spread warning. |

Known limit: separate generations do not keep the character's proportions exactly. At 128 px `hero-run` comes
out slightly bigger than `hero-idle` (the AI drew a bigger head while running); **Relative size** (e.g. 0.9)
fixes it by eye in **All together**.

## Prompts

Each item's text is the output of `buildSpritePrompt` / `buildTilePrompt` (the wrapper only appends one
"Landscape 3:2 / Square 1:1 format" line). Regenerate them with the same options to reproduce.

### knight-walk-pixel

Reference: `guides/guide-3x2-magenta.png`

```text
Create ONE sprite sheet image of a knight in steel armor with a blue cape and a sword at the belt for a "walk" animation: 6 frames in a grid of 3 columns × 2 rows, exactly like the attached guide image.

Layout:
- One frame per cell, in reading order (left to right, top to bottom), same cell grid and aspect ratio as the guide.
- Character centered horizontally in its cell, feet (or lowest point) resting on the baseline drawn in the guide.
- Nothing touches or crosses the cell borders; keep a clear margin around the character.
- The guide is only a template: do not draw its lines or numbers in the result.

Consistency:
- The same character in every frame: same scale, same height, same palette, same proportions.
- Strict side view (profile), facing right, in every frame.

Animation:
  - Frame 1: contact: near leg forward with the heel touching the ground, legs at their widest, arms (if any) swinging opposite to the legs
  - Frame 2: down: weight drops onto the near leg, knee bent, body at its lowest
  - Frame 3: passing: far leg swings past the straight near leg, body upright
  - Frame 4: contact: far leg forward with the heel touching the ground, legs at their widest, arms (if any) swinging opposite to the legs
  - Frame 5: down: weight drops onto the far leg, knee bent, body at its lowest
  - Frame 6: passing: near leg swings past the straight far leg, body upright
  - The animation loops: frame 6 flows smoothly back into frame 1.

Style: true pixel art. The character is about 32 art pixels tall; every art pixel is a square block of the same size on one grid. Crisp hard edges, no anti-aliasing, no blur, no gradients, limited palette (about 16 colors).

Background: one flat solid color, exactly #FF00FF (pure magenta), filling every cell edge to edge. No gradients, shadows, floor, ground line, scenery, text or labels. Do not use magenta, pink or purple anywhere on the character, its outline or effects.
```

### slime-idle-cartoon

Reference: `guides/guide-2x2-magenta.png`

```text
Create ONE sprite sheet image of a cute green slime with big eyes for a "idle" animation: 4 frames in a grid of 2 columns × 2 rows, exactly like the attached guide image.

Layout:
- One frame per cell, in reading order (left to right, top to bottom), same cell grid and aspect ratio as the guide.
- Character centered horizontally in its cell, feet (or lowest point) resting on the baseline drawn in the guide.
- Nothing touches or crosses the cell borders; keep a clear margin around the character.
- The guide is only a template: do not draw its lines or numbers in the result.

Consistency:
- The same character in every frame: same scale, same height, same palette, same proportions.
- Strict side view (profile), facing right, in every frame.

Animation:
  - Frame 1: relaxed neutral stance
  - Frame 2: breathing in: the body rises or stretches very slightly
  - Frame 3: top of the breath: the highest point of the subtle rise
  - Frame 4: breathing out: settling back towards the neutral stance
  - The animation loops: frame 4 flows smoothly back into frame 1.

Style: clean 2D cartoon / vector style, flat colors with simple cel shading, clear dark outline, sharp edges, no blur, no painterly texture.

Background: one flat solid color, exactly #FF00FF (pure magenta), filling every cell edge to edge. No gradients, shadows, floor, ground line, scenery, text or labels. Do not use magenta, pink or purple anywhere on the character, its outline or effects.
```

### wizard-single-pixel-large

Reference: `guides/guide-1x1-magenta.png`

```text
Create ONE game sprite image of an old wizard with a long white beard, a blue robe and a wooden staff, idle pose, with the layout of the attached guide image (a single cell).

Layout:
- Character centered horizontally in its cell, feet (or lowest point) resting on the baseline drawn in the guide.
- Nothing touches or crosses the cell borders; keep a clear margin around the character.
- The guide is only a template: do not draw its lines or numbers in the result.
- Front view, facing the viewer.

Style: true pixel art. The character is about 64 art pixels tall; every art pixel is a square block of the same size on one grid. Crisp hard edges, no anti-aliasing, no blur, no gradients, limited palette (about 16 colors).

Background: one flat solid color, exactly #FF00FF (pure magenta), filling every cell edge to edge. No gradients, shadows, floor, ground line, scenery, text or labels. Do not use magenta, pink or purple anywhere on the character, its outline or effects.
```

### fox-run-cartoon

Reference: `guides/guide-3x2-green.png`

```text
Crea UNA sola imagen de hoja de sprites de un zorro naranja con la punta de la cola blanca con la animación «correr»: 6 cuadros en una cuadrícula de 3 columnas × 2 filas, exactamente como la imagen guía adjunta.

Disposición:
- Un cuadro por celda, en orden de lectura (de izquierda a derecha y de arriba abajo), con la misma cuadrícula y proporción que la guía.
- Personaje centrado horizontalmente en su celda, con los pies (o su punto más bajo) apoyados en la línea base dibujada en la guía.
- Nada toca ni cruza los bordes de la celda; deja un margen libre alrededor del personaje.
- La guía es solo una plantilla: no dibujes sus líneas ni sus números en el resultado.

Coherencia:
- El mismo personaje en todos los cuadros: misma escala, misma altura, misma paleta, mismas proporciones.
- Vista lateral estricta (de perfil), mirando a la derecha, en todos los cuadros.

Animación:
  - Cuadro 1: contacto: la pierna cercana pisa adelante, cuerpo inclinado hacia delante, brazos (si tiene) opuestos a las piernas
  - Cuadro 2: bajada: la rodilla de la pierna cercana se flexiona al aterrizar, cuerpo en su punto más bajo
  - Cuadro 3: impulso: la pierna cercana empuja hacia atrás, la rodilla de la pierna lejana sube adelante
  - Cuadro 4: contacto: la pierna lejana pisa adelante, cuerpo inclinado hacia delante, brazos (si tiene) opuestos a las piernas
  - Cuadro 5: bajada: la rodilla de la pierna lejana se flexiona al aterrizar, cuerpo en su punto más bajo
  - Cuadro 6: impulso: la pierna lejana empuja hacia atrás, la rodilla de la pierna cercana sube adelante
  - La animación es un ciclo: el cuadro 6 enlaza suavemente con el cuadro 1.

Estilo: dibujo 2D limpio tipo cartoon / vectorial, colores planos con sombreado simple, contorno oscuro bien marcado, bordes nítidos, sin desenfoque ni textura pictórica.

Fondo: un único color sólido y plano, exactamente #00FF00 (verde puro), que llene cada celda de borde a borde. Sin degradados, sombras, suelo, línea de suelo, escenario, texto ni etiquetas. No uses verde brillante ni lima en ninguna parte del personaje, su contorno o sus efectos.
```

### grass-seamless-pixel

```text
Create ONE square, seamless texture of short green grass for a 2D game tile.
- Tileable on both axes: the left edge continues into the right edge and the top edge into the bottom edge, with no visible seam.
- View: straight top-down, as seen from directly above.
- Fill the whole square evenly with the material: no border, no frame, no vignette, no standout objects or focal points, no transitions to other materials.
- Flat, even lighting: no cast shadows and no light coming from one side.
- Style: true pixel art, exactly 32×32 art pixels; every art pixel is a square block of the same size. Crisp hard edges, no anti-aliasing, no blur, limited palette (8 to 16 colors).
- No text, no labels.
```

### dirt-seamless-pixel

```text
Create ONE square, seamless texture of brown dirt with small pebbles for a 2D game tile.
- Tileable on both axes: the left edge continues into the right edge and the top edge into the bottom edge, with no visible seam.
- View: straight top-down, as seen from directly above.
- Fill the whole square evenly with the material: no border, no frame, no vignette, no standout objects or focal points, no transitions to other materials.
- Flat, even lighting: no cast shadows and no light coming from one side.
- Style: true pixel art, exactly 32×32 art pixels; every art pixel is a square block of the same size. Crisp hard edges, no anti-aliasing, no blur, limited palette (8 to 16 colors).
- No text, no labels.
```
