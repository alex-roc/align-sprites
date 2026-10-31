// Prompts and guide images for the other asset types: tile atlas, top-down 4 directions, effects, items,
// parallax layers and video clips. Same structure as the sprite prompt (index.ts): one image, flat key
// background, exact grid from an attached guide, "the guide is only a template".
import { createImage } from '../image.ts';
import type { ArtMode, RGBA8, RGBAImage } from '../types.ts';
import {
  GUIDE_LINE_RGBA,
  KEY_HEX,
  KEY_RGBA,
  drawNumber,
  fillRect,
  gridRows,
  type KeyColor,
  type Lang,
} from './index.ts';

// ---------------------------------------------------------------- shared text

const KEY_NAME: Record<Lang, Record<KeyColor, string>> = {
  en: { magenta: 'pure magenta', green: 'pure green' },
  es: { magenta: 'magenta puro', green: 'verde puro' },
};

const KEY_AVOID: Record<Lang, Record<KeyColor, string>> = {
  en: { magenta: 'magenta, pink or purple', green: 'bright green or lime' },
  es: { magenta: 'magenta, rosado ni morado', green: 'verde brillante ni lima' },
};

/** Picks the English or Spanish text: keeps both versions of a line next to each other. */
const pick = (lang: Lang) => (en: string, es: string): string => (lang === 'en' ? en : es);

function pos(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/** "Style:" line: pixel art or cartoon. `unit` says what the art-pixel size refers to ("each tile is 32×32"). */
function style(lang: Lang, mode: ArtMode, unit = ''): string {
  const s = pick(lang);
  return mode === 'pixel'
    ? s(
        `Style: true pixel art${unit ? `, ${unit}` : ''}. Every art pixel is a square block of the same size on one grid. Crisp hard edges, no anti-aliasing, no blur, no gradients, limited palette (about 16 colors).`,
        `Estilo: pixel art auténtico${unit ? `, ${unit}` : ''}. Cada píxel de arte es un bloque cuadrado del mismo tamaño sobre una sola cuadrícula. Bordes nítidos, sin antialiasing, sin desenfoque, sin degradados, paleta limitada (unos 16 colores).`,
      )
    : s(
        'Style: clean 2D cartoon / vector style, flat colors with simple cel shading, clear dark outline, sharp edges, no blur, no painterly texture.',
        'Estilo: dibujo 2D limpio tipo cartoon / vectorial, colores planos con sombreado simple, contorno oscuro bien marcado, bordes nítidos, sin desenfoque ni textura pictórica.',
      );
}

/** "Background:" line for a flat key colour; `where` says what the colour fills and `extra` adds what to leave out. */
function keyBackground(lang: Lang, key: KeyColor, where: string, extra: string): string {
  const s = pick(lang);
  const hex = KEY_HEX[key];
  const name = KEY_NAME[lang][key];
  const avoid = KEY_AVOID[lang][key];
  return s(
    `Background: one flat solid color, exactly ${hex} (${name}), ${where}. No gradients, ${extra}. Do not use ${avoid} anywhere in the artwork.`,
    `Fondo: un único color sólido y plano, exactamente ${hex} (${name}), ${where}. Sin degradados, ${extra}. No uses ${avoid} en ninguna parte del dibujo.`,
  );
}

/** Light note on empty trailing cells of a grid. */
function emptyCells(lang: Lang, empty: number): string[] {
  const s = pick(lang);
  if (empty <= 0) return [];
  return [
    empty > 1
      ? s(`- Leave the last ${empty} cells empty (plain background).`, `- Deja vacías las últimas ${empty} celdas (solo fondo).`)
      : s('- Leave the last cell empty (plain background).', '- Deja vacía la última celda (solo fondo).'),
  ];
}

// ---------------------------------------------------------------- tile atlas

export interface AtlasPromptOptions {
  lang: Lang;
  mode: ArtMode;
  /** The environment ("Andean mountains with grass and rock"). */
  theme: string;
  cols: number;
  rows: number;
  /** Pixel mode: tile size in art pixels. */
  tileSize: number;
  view: 'side' | 'top-down';
  key: KeyColor;
  /** True when the student attaches an existing tile or tileset as a style reference. */
  withReference: boolean;
}

/** Gap between tiles (and around the sheet) in the atlas guide, as a fraction of the tile size. */
export const ATLAS_GUTTER = 1 / 8;

export function buildAtlasPrompt(o: AtlasPromptOptions): string {
  const s = pick(o.lang);
  const cols = pos(o.cols, 1, 32), rows = pos(o.rows, 1, 32);
  const T = pos(o.tileSize, 1, 1024);
  const n = cols * rows;
  const side = o.view === 'side';
  const L: string[] = [
    s(
      `Create ONE tileset sheet image for a 2D game: ${o.theme}. It has ${cols} columns × ${rows} rows (${n} square tiles), laid out exactly like the attached guide image.`,
      `Crea UNA sola imagen de hoja de tiles (tileset) para un juego 2D: ${o.theme}. Tiene ${cols} columnas × ${rows} filas (${n} tiles cuadrados), con la disposición exacta de la imagen guía adjunta.`,
    ),
  ];
  if (o.withReference) {
    L.push(
      s(
        'Two images are attached: the guide (the grid of tile cells on the flat key colour) and a style reference. Match its palette, line style and level of detail. Take only the style from it, not its layout or background.',
        'Se adjuntan dos imágenes: la guía (la cuadrícula de celdas de tile sobre el color clave plano) y una referencia de estilo. Copia su paleta, su estilo de línea y su nivel de detalle. Toma de ella solo el estilo, no su disposición ni su fondo.',
      ),
    );
  }
  L.push(
    '',
    s('Layout:', 'Disposición:'),
    s(
      '- One tile per cell, in reading order (left to right, top to bottom), on the exact grid of the guide: same positions, same sizes.',
      '- Un tile por celda, en orden de lectura (de izquierda a derecha y de arriba abajo), sobre la cuadrícula exacta de la guía: mismas posiciones, mismos tamaños.',
    ),
    s(
      '- Between tiles, and around the whole sheet, leave a gap of plain background like the guide. Tiles never touch each other, even the ones that connect in the game.',
      '- Entre los tiles, y alrededor de toda la hoja, deja un espacio de fondo liso como en la guía. Los tiles nunca se tocan, ni siquiera los que se conectan en el juego.',
    ),
    s(
      '- Each tile is a perfect square with straight, hard edges, filled from edge to edge.',
      '- Cada tile es un cuadrado perfecto de bordes rectos y duros, relleno de borde a borde.',
    ),
    s(
      '- The guide is only a template: do not draw its lines or numbers in the result.',
      '- La guía es solo una plantilla: no dibujes sus líneas ni sus números en el resultado.',
    ),
    '',
    s('Tile set:', 'Contenido del tileset:'),
  );
  if (side) {
    L.push(
      s(
        `- Ground and platform pieces for a side-view platformer: the surface tile (top-left corner, top, top-right corner), the solid fill underneath, left and right walls, inner corners, and a floating platform made of 3 pieces (left end, middle, right end). Use the remaining cells for variations of the fill and the surface, and a few decorations.`,
        `- Piezas de suelo y plataformas para un juego de plataformas de vista lateral: el tile de superficie (esquina superior izquierda, superior, esquina superior derecha), el relleno sólido de debajo, paredes izquierda y derecha, esquinas interiores y una plataforma flotante de 3 piezas (extremo izquierdo, centro, extremo derecho). Usa las celdas restantes para variaciones del relleno y de la superficie, y unas pocas decoraciones.`,
      ),
    );
  } else {
    L.push(
      s(
        `- Ground pieces for a top-down game: the main ground, variations of it, a path, and the edges and corners where the ground meets another material (water, cliff or rock). Use the remaining cells for a few decorations.`,
        `- Piezas de suelo para un juego de vista cenital: el suelo principal, variaciones, un camino y los bordes y esquinas donde el suelo se encuentra con otro material (agua, acantilado o roca). Usa las celdas restantes para unas pocas decoraciones.`,
      ),
    );
  }
  L.push(
    s(
      '- Tiles that connect must match exactly along the edges they share: the right edge of a tile continues into the left edge of the next one, and the same for top and bottom. Fill tiles repeat seamlessly on both axes.',
      '- Los tiles que se conectan deben coincidir exactamente en los bordes que comparten: el borde derecho de un tile continúa en el izquierdo del siguiente, e igual arriba y abajo. Los tiles de relleno se repiten sin costuras en ambos ejes.',
    ),
    s(
      '- Terrain tiles are fully opaque: no transparency, no holes and no background color inside them. Only decoration tiles (plants, rocks, signs) may show the background color around their shape.',
      '- Los tiles de terreno son totalmente opacos: sin transparencia, sin huecos y sin color de fondo dentro. Solo las decoraciones (plantas, rocas, carteles) pueden mostrar el color de fondo alrededor de su forma.',
    ),
  );
  if (side) {
    L.push(
      s(
        '- SOLID TOPS: on every ground tile where characters stand, the walkable surface touches the top edge of the tile. The top row of pixels is solid ground (grass, rock or snow), fully opaque, with no empty strip above the surface and no grass blades or snow hanging over the edge. Otherwise the characters float above the ground in the game.',
        '- SUPERFICIES SÓLIDAS: en todo tile de suelo donde se para el personaje, la superficie por la que se camina toca el borde superior del tile. La fila de píxeles de arriba es suelo sólido (pasto, roca o nieve), totalmente opaco, sin franja vacía sobre la superficie ni briznas o nieve que sobresalgan del borde. Si no, en el juego los personajes flotan sobre el suelo.',
      ),
    );
  }
  L.push(
    s(
      `- Consistent lighting and palette: ${side ? 'light from the top-left on every tile, ' : 'flat even light, '}the same palette and the same contrast across the whole sheet.`,
      `- Iluminación y paleta coherentes: ${side ? 'luz desde arriba a la izquierda en todos los tiles, ' : 'luz plana y uniforme, '}la misma paleta y el mismo contraste en toda la hoja.`,
    ),
    '',
    style(o.lang, o.mode, o.mode === 'pixel' ? s(`each tile is exactly ${T}×${T} art pixels`, `cada tile mide exactamente ${T}×${T} píxeles de arte`) : ''),
    '',
    keyBackground(
      o.lang,
      o.key,
      s('filling the gaps between tiles and the margin around the sheet', 'que llene los espacios entre los tiles y el margen alrededor de la hoja'),
      s('shadows, text or labels', 'sombras, texto ni etiquetas'),
    ),
  );
  return L.join('\n');
}

// ---------------------------------------------------------------- top-down 4 directions

export type Direction = 'down' | 'left' | 'right' | 'up';

/** Row order of the sheet: RPG Maker order (down, left, right, up) or the 3-row variant that mirrors the side view. */
export function directionRows(threeRows: boolean): Direction[] {
  return threeRows ? ['down', 'right', 'up'] : ['down', 'left', 'right', 'up'];
}

export interface DirectionsPromptOptions {
  lang: Lang;
  mode: ArtMode;
  /** What the character is ("a young farmer with a straw hat"). */
  subject: string;
  /** Frames per row (the walk cycle). */
  frames: number;
  /** 3 rows (down, side facing right, up: the side row is mirrored in game) or 4 rows (down, left, right, up). */
  threeRows: boolean;
  /** Pixel mode: character height in art pixels. */
  artHeight: number;
  key: KeyColor;
  withReference: boolean;
}

const DIR_TEXT: Record<Lang, Record<Direction, string>> = {
  en: {
    down: 'facing down (towards the viewer, front)',
    left: 'facing left (profile)',
    right: 'facing right (profile)',
    up: 'facing up (away from the viewer, back)',
  },
  es: {
    down: 'mirando hacia abajo (hacia el espectador, de frente)',
    left: 'mirando a la izquierda (de perfil)',
    right: 'mirando a la derecha (de perfil)',
    up: 'mirando hacia arriba (de espaldas al espectador)',
  },
};

export function buildDirectionsPrompt(o: DirectionsPromptOptions): string {
  const s = pick(o.lang);
  const frames = pos(o.frames, 2, 16);
  const dirs = directionRows(o.threeRows);
  const rows = dirs.length;
  const L: string[] = [
    s(
      `Create ONE sprite sheet image of ${o.subject} for a top-down RPG walk animation: ${rows} rows (one per direction) × ${frames} columns (frames of the walk), exactly like the attached guide image.`,
      `Crea UNA sola imagen de hoja de sprites de ${o.subject} para una animación de caminar en un RPG de vista cenital: ${rows} filas (una por dirección) × ${frames} columnas (cuadros de la caminata), exactamente como la imagen guía adjunta.`,
    ),
  ];
  if (o.withReference) {
    L.push(
      s(
        'Two images are attached: the guide (the grid on the flat key colour) and the character reference. Use the reference character exactly: same design, colors, proportions and outfit. Take only the character from it, not its background or size.',
        'Se adjuntan dos imágenes: la guía (la cuadrícula sobre el color clave plano) y la referencia del personaje. Usa exactamente el personaje de la referencia adjunta: mismo diseño, colores, proporciones y vestimenta. Toma de ella solo el personaje, no su fondo ni su tamaño.',
      ),
    );
  }
  L.push(
    '',
    s(
      'Rows, from top to bottom (the small arrow in the corner of each guide cell shows where the character faces):',
      'Filas, de arriba abajo (la flecha pequeña en la esquina de cada celda de la guía indica hacia dónde mira el personaje):',
    ),
    ...dirs.map((d, i) => `  - ${s('Row', 'Fila')} ${i + 1}: ${DIR_TEXT[o.lang][d]}`),
  );
  if (o.threeRows) {
    L.push(
      s(
        '  The game mirrors the profile row to make the character face left, so avoid details that break when flipped: no text, nothing held in only one hand, no asymmetric logos.',
        '  El juego refleja la fila de perfil para que el personaje mire a la izquierda, así que evita detalles que se rompen al voltearlos: sin texto, sin nada sostenido solo en una mano, sin logotipos asimétricos.',
      ),
    );
  }
  L.push(
    '',
    s('Layout:', 'Disposición:'),
    s(
      `- Each row is the same walk cycle of ${frames} frames, one frame per cell, from left to right, same cell grid and aspect ratio as the guide.`,
      `- Cada fila es el mismo ciclo de caminata de ${frames} cuadros, un cuadro por celda, de izquierda a derecha, con la misma cuadrícula y proporción que la guía.`,
    ),
    s(
      '- Character centered horizontally in its cell, feet resting on the baseline drawn in the guide.',
      '- Personaje centrado horizontalmente en su celda, con los pies apoyados en la línea base dibujada en la guía.',
    ),
    s(
      '- Nothing touches or crosses the cell borders; keep a clear margin around the character.',
      '- Nada toca ni cruza los bordes de la celda; deja un margen libre alrededor del personaje.',
    ),
    s(
      '- The guide is only a template: do not draw its lines, numbers or arrows in the result.',
      '- La guía es solo una plantilla: no dibujes sus líneas, números ni flechas en el resultado.',
    ),
    '',
    s('Consistency:', 'Coherencia:'),
    s(
      '- The same character in every cell of every row: same scale, same height, same palette, same proportions and outfit seen from each direction.',
      '- El mismo personaje en todas las celdas de todas las filas: misma escala, misma altura, misma paleta, mismas proporciones y vestimenta vistas desde cada dirección.',
    ),
    s(
      '- Classic top-down RPG view: the camera is slightly above the character (like Pokémon or Zelda), the same camera angle in every row.',
      '- Vista de RPG cenital clásico: la cámara está un poco por encima del personaje (como en Pokémon o Zelda), con el mismo ángulo en todas las filas.',
    ),
    '',
    s(
      `Walk cycle (the same in every row). Spread these key poses evenly over the ${frames} frames${frames > 4 ? ' and fill the gaps with smooth in-betweens' : ''}:`,
      `Ciclo de caminata (el mismo en todas las filas). Reparte estas poses clave de forma uniforme en los ${frames} cuadros${frames > 4 ? ' y completa los huecos con intermedios suaves' : ''}:`,
    ),
    s(
      '  - contact: left foot forward touching the ground, arms (if any) swinging opposite to the legs',
      '  - contacto: pie izquierdo adelante tocando el suelo, brazos (si tiene) opuestos a las piernas',
    ),
    s('  - passing: legs together, body upright', '  - paso: piernas juntas, cuerpo erguido'),
    s('  - contact: right foot forward touching the ground, arms opposite to the legs', '  - contacto: pie derecho adelante tocando el suelo, brazos opuestos a las piernas'),
    s('  - passing: legs together, body upright', '  - paso: piernas juntas, cuerpo erguido'),
    s(`  - The walk loops: frame ${frames} flows smoothly back into frame 1.`, `  - La caminata es un ciclo: el cuadro ${frames} enlaza suavemente con el cuadro 1.`),
    '',
    style(
      o.lang,
      o.mode,
      o.mode === 'pixel'
        ? s(`the character is about ${pos(o.artHeight, 8, 256)} art pixels tall`, `el personaje mide unos ${pos(o.artHeight, 8, 256)} píxeles de arte de alto`)
        : '',
    ),
    '',
    keyBackground(
      o.lang,
      o.key,
      s('filling every cell edge to edge', 'que llene cada celda de borde a borde'),
      s('shadows, floor, ground line, scenery, text or labels', 'sombras, suelo, línea de suelo, escenario, texto ni etiquetas'),
    ),
  );
  return L.join('\n');
}

// ---------------------------------------------------------------- effects

export type EffectKind = 'explosion' | 'hit' | 'magic' | 'smoke' | 'projectile';
export const EFFECT_KINDS: readonly EffectKind[] = ['explosion', 'hit', 'magic', 'smoke', 'projectile'];

export interface EffectPromptOptions {
  lang: Lang;
  mode: ArtMode;
  kind: EffectKind;
  /** Look of the effect ("orange fire", "blue ice magic"). */
  description: string;
  frames: number;
  cols: number;
  /** Pixel mode: size of the effect at its biggest, in art pixels. */
  artSize: number;
  key: KeyColor;
}

const EFFECT_NAME: Record<Lang, Record<EffectKind, string>> = {
  en: { explosion: 'explosion', hit: 'hit spark', magic: 'magic spell', smoke: 'smoke puff', projectile: 'projectile' },
  es: { explosion: 'explosión', hit: 'chispa de golpe', magic: 'hechizo mágico', smoke: 'bocanada de humo', projectile: 'proyectil' },
};

/** What each effect does from the first to the last frame. Projectiles loop, the rest play once. */
const EFFECT_LIFE: Record<Lang, Record<EffectKind, string>> = {
  en: {
    explosion:
      'Frame 1: a small bright flash at the center. Next frames: it expands quickly into a fireball that reaches its biggest size around the middle of the animation. Then it breaks up into smoke, sparks and debris that shrink and thin out. Last frame: only a few small sparks, almost empty.',
    hit: 'Frame 1: a tiny bright spark. Frame 2 or 3: the biggest size, a sharp star or slash-shaped burst with a few short lines flying outwards. Then the burst shrinks and thins out. Last frame: only one or two tiny dots, almost empty.',
    magic:
      'Frame 1: a small point of magic appears at the center. It grows into the spell (a circle, rune, swirl or sparkles), pulsing once at its biggest size around the middle. Then it breaks into small particles that shrink and disappear. Last frame: almost empty.',
    smoke:
      'Frame 1: a small dense puff at the center. It grows and rises, splitting into rounder puffs that get lighter in color and thinner. Last frame: a few pale, small puffs, almost empty.',
    projectile:
      'A projectile flying to the right: pointed nose on the right, a short trail behind it. It has the same size and position in every frame; only the flicker of the flame or trail and a small rotation change between frames.',
  },
  es: {
    explosion:
      'Cuadro 1: un pequeño destello brillante en el centro. Cuadros siguientes: se expande rápido en una bola de fuego que alcanza su mayor tamaño hacia la mitad de la animación. Luego se deshace en humo, chispas y escombros que se encogen y se adelgazan. Último cuadro: solo unas pocas chispas pequeñas, casi vacío.',
    hit: 'Cuadro 1: una chispa diminuta y brillante. Cuadro 2 o 3: el mayor tamaño, un estallido en forma de estrella o tajo con unas pocas líneas cortas que salen disparadas. Luego el estallido se encoge y se adelgaza. Último cuadro: solo uno o dos puntos diminutos, casi vacío.',
    magic:
      'Cuadro 1: un pequeño punto de magia aparece en el centro. Crece hasta formar el hechizo (un círculo, una runa, un remolino o destellos) y pulsa una vez en su mayor tamaño hacia la mitad. Luego se deshace en partículas pequeñas que se encogen y desaparecen. Último cuadro: casi vacío.',
    smoke:
      'Cuadro 1: una pequeña bocanada densa en el centro. Crece y sube, se divide en bocanadas más redondas que se aclaran y se adelgazan. Último cuadro: unas pocas bocanadas pálidas y pequeñas, casi vacío.',
    projectile:
      'Un proyectil que vuela hacia la derecha: punta hacia la derecha y una estela corta detrás. Tiene el mismo tamaño y la misma posición en todos los cuadros; entre cuadros solo cambian el parpadeo de la llama o la estela y un pequeño giro.',
  },
};

export function buildEffectPrompt(o: EffectPromptOptions): string {
  const s = pick(o.lang);
  const frames = pos(o.frames, 1, 64);
  const cols = pos(Math.min(o.cols, frames), 1, 16);
  const rows = gridRows(frames, cols);
  const empty = cols * rows - frames;
  const name = EFFECT_NAME[o.lang][o.kind];
  const what = o.description.trim() ? `${o.description} (${name})` : name;
  const loop = o.kind === 'projectile';
  const L: string[] = [
    s(
      `Create ONE sprite sheet image of a game visual effect, ${what}: ${frames} frames in a grid of ${cols} columns × ${rows} rows, exactly like the attached guide image.`,
      `Crea UNA sola imagen de hoja de sprites de un efecto visual de juego, ${what}: ${frames} cuadros en una cuadrícula de ${cols} columnas × ${rows} filas, exactamente como la imagen guía adjunta.`,
    ),
    '',
    s('Layout:', 'Disposición:'),
    s(
      '- One frame per cell, in reading order (left to right, top to bottom), same cell grid and aspect ratio as the guide.',
      '- Un cuadro por celda, en orden de lectura (de izquierda a derecha y de arriba abajo), con la misma cuadrícula y proporción que la guía.',
    ),
    ...emptyCells(o.lang, empty),
    s(
      '- The effect is centered on the cross drawn in each cell: its center is at the same point in every frame. There is no ground and no feet line.',
      '- El efecto está centrado en la cruz dibujada en cada celda: su centro está en el mismo punto en todos los cuadros. No hay suelo ni línea de pies.',
    ),
    s(
      '- At its biggest the effect fills about 80% of the cell. Nothing touches or crosses the cell borders.',
      '- En su mayor tamaño el efecto ocupa cerca del 80 % de la celda. Nada toca ni cruza los bordes de la celda.',
    ),
    s(
      '- The guide is only a template: do not draw its lines, cross or numbers in the result.',
      '- La guía es solo una plantilla: no dibujes sus líneas, su cruz ni sus números en el resultado.',
    ),
    '',
    s(loop ? 'Animation (it loops):' : 'Animation (it plays once, it grows and fades):', loop ? 'Animación (en ciclo):' : 'Animación (se reproduce una vez, crece y se desvanece):'),
    `  ${EFFECT_LIFE[o.lang][o.kind]}`,
    s(
      `  Spread the changes evenly over the ${frames} frames; each frame clearly different from its neighbours.`,
      `  Reparte los cambios de forma uniforme en los ${frames} cuadros; cada cuadro claramente distinto de sus vecinos.`,
    ),
    ...(loop ? [s(`  Frame ${frames} flows smoothly back into frame 1.`, `  El cuadro ${frames} enlaza suavemente con el cuadro 1.`)] : []),
    '',
    s('Hard edges (important):', 'Bordes duros (importante):'),
    s(
      '- No glow, halo, soft light, blur, haze or semi-transparency around the effect. The background color is removed afterwards, and soft glows turn into a dirty fringe.',
      '- Sin resplandor, halo, luz suave, desenfoque, neblina ni semitransparencia alrededor del efecto. El color de fondo se quita después y los resplandores suaves se convierten en un borde sucio.',
    ),
    s(
      '- Draw solid shapes with hard edges, in flat bands of color (bright core, middle color, dark edge). Every pixel of the effect is fully opaque.',
      '- Dibuja formas sólidas de bordes duros, en bandas planas de color (núcleo brillante, color medio, borde oscuro). Cada píxel del efecto es totalmente opaco.',
    ),
    '',
    style(o.lang, o.mode, o.mode === 'pixel' ? s(`the effect is about ${pos(o.artSize, 8, 256)} art pixels wide at its biggest`, `el efecto mide unos ${pos(o.artSize, 8, 256)} píxeles de arte de ancho en su mayor tamaño`) : ''),
    '',
    keyBackground(
      o.lang,
      o.key,
      s('filling every cell edge to edge', 'que llene cada celda de borde a borde'),
      s('shadows, floor, scenery, text or labels', 'sombras, suelo, escenario, texto ni etiquetas'),
    ),
  ];
  return L.join('\n');
}

// ---------------------------------------------------------------- items and icons

export interface ItemsPromptOptions {
  lang: Lang;
  mode: ArtMode;
  /** The items, comma separated ("gold coin, red potion, iron key, green gem"). */
  items: string;
  cols: number;
  rows: number;
  /** Pixel mode: size of each item in art pixels. */
  artSize: number;
  key: KeyColor;
  /** True when the student attaches an existing item or style as a reference. */
  withReference: boolean;
}

/** Share of the cell the item may fill: the inner square drawn in the guide. */
export const ITEMS_SAFE = 0.7;

export function buildItemsPrompt(o: ItemsPromptOptions): string {
  const s = pick(o.lang);
  const cols = pos(o.cols, 1, 16), rows = pos(o.rows, 1, 16);
  const n = cols * rows;
  const L: string[] = [
    s(
      `Create ONE image with a sheet of ${n} separate game items (icons): ${o.items}. They are laid out in a grid of ${cols} columns × ${rows} rows, exactly like the attached guide image.`,
      `Crea UNA sola imagen con una hoja de ${n} objetos de juego (íconos) separados: ${o.items}. Están dispuestos en una cuadrícula de ${cols} columnas × ${rows} filas, exactamente como la imagen guía adjunta.`,
    ),
  ];
  if (o.withReference) {
    L.push(
      s(
        'Two images are attached: the guide (the grid on the flat key colour) and a style reference. Match its palette, line style and level of detail. Take only the style from it, not its layout or background.',
        'Se adjuntan dos imágenes: la guía (la cuadrícula sobre el color clave plano) y una referencia de estilo. Copia su paleta, su estilo de línea y su nivel de detalle. Toma de ella solo el estilo, no su disposición ni su fondo.',
      ),
    );
  }
  L.push(
    '',
    s('Layout:', 'Disposición:'),
    s(
      '- One item per cell, in reading order (left to right, top to bottom), same cell grid and aspect ratio as the guide. If the list has fewer items than cells, leave the last cells empty.',
      '- Un objeto por celda, en orden de lectura (de izquierda a derecha y de arriba abajo), con la misma cuadrícula y proporción que la guía. Si la lista tiene menos objetos que celdas, deja vacías las últimas celdas.',
    ),
    s(
      '- Each item is centered in its cell and stays inside the inner square of the guide, so there are clear gaps of background between items. Nothing touches or crosses the cell borders.',
      '- Cada objeto está centrado en su celda y se queda dentro del cuadrado interior de la guía, así que quedan espacios libres de fondo entre los objetos. Nada toca ni cruza los bordes de la celda.',
    ),
    s(
      '- The same scale for all: every item fills about the same area of its square (a long key and a round coin both fit it).',
      '- La misma escala para todos: cada objeto ocupa más o menos la misma área de su cuadrado (una llave larga y una moneda redonda caben igual).',
    ),
    s(
      '- Each cell holds a single object, alone: no hands, no stands, no text or numbers.',
      '- Cada celda tiene un solo objeto, solo: sin manos, sin soportes, sin texto ni números.',
    ),
    s(
      '- The guide is only a template: do not draw its lines, inner squares or numbers in the result.',
      '- La guía es solo una plantilla: no dibujes sus líneas, sus cuadrados interiores ni sus números en el resultado.',
    ),
    '',
    s('Consistency:', 'Coherencia:'),
    s(
      '- The same view for all (front, flat icon view), light from the top-left, the same outline style and the same palette family across the whole set.',
      '- La misma vista para todos (de frente, vista plana de ícono), luz desde arriba a la izquierda, el mismo estilo de contorno y la misma familia de paleta en todo el conjunto.',
    ),
    '',
    style(o.lang, o.mode, o.mode === 'pixel' ? s(`each item is about ${pos(o.artSize, 8, 256)} art pixels wide`, `cada objeto mide unos ${pos(o.artSize, 8, 256)} píxeles de arte de ancho`) : ''),
    '',
    keyBackground(
      o.lang,
      o.key,
      s('filling every cell edge to edge', 'que llene cada celda de borde a borde'),
      s('shadows on the background (no drop shadow under the items), glow, floor, text or labels', 'sombras sobre el fondo (sin sombra proyectada bajo los objetos), resplandor, suelo, texto ni etiquetas'),
    ),
  );
  return L.join('\n');
}

// ---------------------------------------------------------------- parallax layers

export type ParallaxLayer = 'far' | 'mid' | 'near';
export const PARALLAX_LAYERS: readonly ParallaxLayer[] = ['far', 'mid', 'near'];
export type ParallaxAspect = '16:9' | '2:1' | '3:1';
export const PARALLAX_ASPECTS: readonly ParallaxAspect[] = ['16:9', '2:1', '3:1'];

export interface ParallaxPromptOptions {
  lang: Lang;
  mode: ArtMode;
  layer: ParallaxLayer;
  /** The scenery ("Andean mountains at dawn"). */
  theme: string;
  aspect: ParallaxAspect;
  /** Pixel mode: image height in art pixels. */
  artHeight: number;
  key: KeyColor;
  /** True when the far layer (or the previous one) is attached as a style reference. */
  withReference: boolean;
}

/** Where the content of each layer starts, as a fraction of the image height from the top (0 = fills everything). */
export const PARALLAX_TOP: Record<ParallaxLayer, number> = { far: 0, mid: 0.4, near: 0.65 };

const LAYER_NAME: Record<Lang, Record<ParallaxLayer, string>> = {
  en: { far: 'FAR layer (sky and distant landscape)', mid: 'MIDDLE layer (hills, trees or buildings)', near: 'NEAR layer (foreground)' },
  es: { far: 'capa LEJANA (cielo y paisaje distante)', mid: 'capa INTERMEDIA (colinas, árboles o edificios)', near: 'capa CERCANA (primer plano)' },
};

export function buildParallaxPrompt(o: ParallaxPromptOptions): string {
  const s = pick(o.lang);
  const far = o.layer === 'far';
  const L: string[] = [
    s(
      `Create ONE wide background image: the ${LAYER_NAME.en[o.layer]} of a parallax scrolling background for a 2D game: ${o.theme}. Aspect ratio ${o.aspect} (wide), like the attached guide image.`,
      `Crea UNA sola imagen de fondo panorámica: la ${LAYER_NAME.es[o.layer]} de un fondo con parallax para un juego 2D: ${o.theme}. Proporción ${o.aspect} (panorámica), como la imagen guía adjunta.`,
    ),
  ];
  if (o.withReference) {
    L.push(
      s(
        'Two images are attached: the guide and the layer already made (the reference). Keep exactly its style, palette family, light direction and horizon height, so both layers look like one scene. This layer is closer to the viewer: more contrast and more detail.',
        'Se adjuntan dos imágenes: la guía y la capa ya hecha (la referencia). Mantén exactamente su estilo, su familia de paleta, la dirección de la luz y la altura del horizonte, para que las capas parezcan una sola escena. Esta capa está más cerca del espectador: más contraste y más detalle.',
      ),
    );
  }
  L.push('', s('Layout:', 'Disposición:'));
  if (far) {
    L.push(
      s(
        '- The image is fully opaque from the top edge to the bottom edge: sky and distant landscape (far mountains, horizon), no transparent or flat-key areas.',
        '- La imagen es totalmente opaca de borde superior a borde inferior: cielo y paisaje distante (montañas lejanas, horizonte), sin zonas transparentes ni de color clave.',
      ),
      s(
        '- Low contrast, light and hazy colors, like far away things look. No foreground objects and no characters.',
        '- Poco contraste, colores claros y brumosos, como se ve lo que está lejos. Sin objetos en primer plano ni personajes.',
      ),
    );
  } else {
    const mid = o.layer === 'mid';
    L.push(
      mid
        ? s(
            '- Only the middle landscape (hills, trees, ruins or buildings), rising from the bottom edge up to about the dashed line of the guide. Everything above that is plain background: the sky is in another layer.',
            '- Solo el paisaje intermedio (colinas, árboles, ruinas o edificios), que sube desde el borde inferior hasta cerca de la línea punteada de la guía. Todo lo que queda encima es fondo liso: el cielo está en otra capa.',
          )
        : s(
            '- Only the nearest elements (big trees, rocks, plants, grass, fences), rising from the bottom edge up to about the dashed line of the guide; a few taller elements may go above it. Everything else is plain background.',
            '- Solo los elementos más cercanos (árboles grandes, rocas, plantas, pasto, cercas), que suben desde el borde inferior hasta cerca de la línea punteada de la guía; unos pocos elementos más altos pueden pasar de ella. Todo lo demás es fondo liso.',
          ),
      s(
        '- The shapes continue down to the bottom edge with no gaps of background under them.',
        '- Las formas siguen hasta el borde inferior, sin huecos de fondo debajo de ellas.',
      ),
      mid
        ? s('- Medium contrast and medium detail, a bit more saturated than the far layer.', '- Contraste y detalle medios, un poco más saturado que la capa lejana.')
        : s(
            '- The strongest contrast and the most detail of all layers: the darkest and most saturated colors.',
            '- El mayor contraste y el mayor detalle de todas las capas: los colores más oscuros y saturados.',
          ),
    );
  }
  L.push(
    '',
    s('Seamless:', 'Sin costuras:'),
    s(
      '- Horizontally seamless: when the image is repeated side by side, its left edge continues exactly into its right edge. The shapes and colors at the left and right edges match at the same heights (the ticks in the guide mark them).',
      '- Continua en horizontal: cuando la imagen se repite lado a lado, su borde izquierdo continúa exactamente en su borde derecho. Las formas y los colores en los bordes izquierdo y derecho coinciden a las mismas alturas (las marcas de la guía las señalan).',
    ),
    s(
      '- Nothing is cut at the left or right edge unless it continues on the other side. No vignette, no frame, no border.',
      '- Nada queda cortado en el borde izquierdo o derecho si no continúa en el lado opuesto. Sin viñeta, sin marco, sin borde.',
    ),
    s(
      '- The guide is only a template: do not draw its lines, ticks or dashes in the result.',
      '- La guía es solo una plantilla: no dibujes sus líneas, marcas ni guiones en el resultado.',
    ),
    '',
    style(o.lang, o.mode, o.mode === 'pixel' ? s(`the image is about ${pos(o.artHeight, 32, 1024)} art pixels tall`, `la imagen mide unos ${pos(o.artHeight, 32, 1024)} píxeles de arte de alto`) : ''),
    '',
  );
  if (far) {
    L.push(s('No text, no labels.', 'Sin texto ni etiquetas.'));
  } else {
    L.push(
      keyBackground(
        o.lang,
        o.key,
        s('everywhere there is no landscape', 'en todo lugar donde no hay paisaje'),
        s('sky, clouds, fog, shadows, text or labels', 'cielo, nubes, niebla, sombras, texto ni etiquetas'),
      ),
    );
  }
  return L.join('\n');
}

// ---------------------------------------------------------------- video clip

export interface VideoPromptOptions {
  lang: Lang;
  mode: ArtMode;
  /** What the character is ("a knight with a blue cape"). */
  subject: string;
  /** The motion ("running", "walking", "idle breathing", "sword attack"). */
  action: string;
  /** Clip length in seconds. */
  seconds: number;
  view: 'side' | 'top-down' | 'front' | 'three-quarter';
  key: KeyColor;
  /** True when the character image is attached as the first frame (image-to-video). */
  withFirstFrame: boolean;
}

const VIDEO_VIEW: Record<Lang, Record<VideoPromptOptions['view'], string>> = {
  en: {
    side: 'strict side view (profile), facing right',
    'top-down': 'top-down view as in classic RPGs, facing down (towards the viewer)',
    front: 'front view, facing the viewer',
    'three-quarter': 'three-quarter view, facing down-right',
  },
  es: {
    side: 'vista lateral estricta (de perfil), mirando a la derecha',
    'top-down': 'vista cenital como en los RPG clásicos, mirando hacia abajo (hacia el espectador)',
    front: 'vista frontal, mirando al espectador',
    'three-quarter': 'vista tres cuartos, mirando abajo a la derecha',
  },
};

/** Text prompt for a video model (Veo, Kling, Sora, Hailuo, Runway…): a short looping clip on a flat key background. */
export function buildVideoPrompt(o: VideoPromptOptions): string {
  const s = pick(o.lang);
  const seconds = pos(o.seconds, 2, 4);
  const hex = KEY_HEX[o.key];
  const L: string[] = [
    s(
      `A ${seconds}-second looping video of ${o.subject} doing a "${o.action}" motion in place, seen in ${VIDEO_VIEW.en[o.view]}.`,
      `Un video en ciclo de ${seconds} segundos de ${o.subject} haciendo el movimiento «${o.action}» en el sitio, en ${VIDEO_VIEW.es[o.view]}.`,
    ),
  ];
  if (o.withFirstFrame) {
    L.push(
      s(
        'The attached image is the first frame: keep the character exactly as in it (same design, colors, proportions and outfit) in every frame.',
        'La imagen adjunta es el primer cuadro: mantén al personaje exactamente como en ella (mismo diseño, colores, proporciones y vestimenta) en todos los cuadros.',
      ),
    );
  }
  L.push(
    '',
    s('Action and camera:', 'Acción y cámara:'),
    s(
      '- The character stays in place, like on a treadmill: the legs and body move, but the character does not travel across the frame.',
      '- El personaje se queda en el sitio, como en una caminadora: las piernas y el cuerpo se mueven, pero el personaje no avanza por el encuadre.',
    ),
    s(
      '- Completely static camera: no pan, no zoom, no tilt, no shake, no cuts.',
      '- Cámara totalmente fija: sin paneo, sin zoom, sin inclinación, sin temblor, sin cortes.',
    ),
    s(
      '- The full body is always visible and centered, with a clear margin around it: the character fills about 60% of the frame height.',
      '- El cuerpo completo siempre es visible y está centrado, con un margen libre alrededor: el personaje ocupa cerca del 60 % de la altura del encuadre.',
    ),
    '',
    s('Loop:', 'Ciclo:'),
    s(
      '- The clip starts and ends in the same pose, so it repeats seamlessly. Constant speed, smooth motion.',
      '- El clip empieza y termina en la misma pose, así que se repite sin saltos. Velocidad constante, movimiento fluido.',
    ),
    s(
      '- No motion blur, no speed lines, no dust, no particles.',
      '- Sin desenfoque de movimiento, sin líneas de velocidad, sin polvo, sin partículas.',
    ),
    '',
    o.mode === 'pixel'
      ? s(
          'Style: retro pixel art look, big square pixels, crisp hard edges, limited palette, flat colors, no smooth shading.',
          'Estilo: aspecto de pixel art retro, píxeles grandes y cuadrados, bordes nítidos, paleta limitada, colores planos, sin sombreado suave.',
        )
      : s(
          'Style: clean 2D cartoon look, flat colors with simple cel shading, clear dark outline, sharp edges.',
          'Estilo: aspecto de dibujo 2D limpio tipo cartoon, colores planos con sombreado simple, contorno oscuro bien marcado, bordes nítidos.',
        ),
    '',
    s(
      `Background: one flat solid color, exactly ${hex} (${KEY_NAME.en[o.key]}), edge to edge, like a green screen. No floor, no ground line, no shadows, no scenery, no gradient, no vignette, no text. Even, flat lighting with no cast shadows. Do not use ${KEY_AVOID.en[o.key]} anywhere on the character.`,
      `Fondo: un único color sólido y plano, exactamente ${hex} (${KEY_NAME.es[o.key]}), de borde a borde, como una pantalla verde. Sin suelo, sin línea de suelo, sin sombras, sin escenario, sin degradado, sin viñeta, sin texto. Iluminación uniforme y plana, sin sombras proyectadas. No uses ${KEY_AVOID.es[o.key]} en ninguna parte del personaje.`,
    ),
    '',
    s(
      'Negative prompt (if your tool has the field): camera movement, zoom, shadows, floor, motion blur, speed lines, text, subtitles, logos, other characters, scene changes.',
      'Prompt negativo (si tu herramienta tiene el campo): movimiento de cámara, zoom, sombras, suelo, desenfoque de movimiento, líneas de velocidad, texto, subtítulos, logotipos, otros personajes, cambios de escena.',
    ),
  );
  return L.join('\n');
}

// ---------------------------------------------------------------- forms (UI state)

/** Options of each prompt kind beyond the sprite sheet and the seamless texture. */
export interface AssetPromptMap {
  atlas: AtlasPromptOptions;
  directions: DirectionsPromptOptions;
  effects: EffectPromptOptions;
  items: ItemsPromptOptions;
  parallax: ParallaxPromptOptions;
  video: VideoPromptOptions;
}
export type AssetPromptKind = keyof AssetPromptMap;
/** What the form keeps: the options without the language (it comes from the shared language selector). */
export type AssetPromptForm<K extends AssetPromptKind> = Omit<AssetPromptMap[K], 'lang'>;

export const ASSET_PROMPT_DEFAULTS: { [K in AssetPromptKind]: AssetPromptForm<K> } = {
  atlas: { mode: 'pixel', theme: '', cols: 6, rows: 4, tileSize: 32, view: 'side', key: 'magenta', withReference: false },
  directions: { mode: 'pixel', subject: '', frames: 4, threeRows: false, artHeight: 32, key: 'magenta', withReference: false },
  effects: { mode: 'pixel', kind: 'explosion', description: '', frames: 8, cols: 4, artSize: 32, key: 'magenta' },
  items: { mode: 'pixel', items: '', cols: 4, rows: 2, artSize: 32, key: 'magenta', withReference: false },
  parallax: { mode: 'pixel', layer: 'far', theme: '', aspect: '16:9', artHeight: 180, key: 'magenta', withReference: false },
  video: { mode: 'cartoon', subject: '', action: 'run', seconds: 3, view: 'side', key: 'green', withFirstFrame: true },
};

// ---------------------------------------------------------------- guide images

/** 7×7 arrow pointing down; the other directions are derived from it. */
const ARROW_DOWN = ['..###..', '..###..', '..###..', '#######', '.#####.', '..###..', '...#...'];

function arrowGlyph(d: Direction): string[] {
  const up = [...ARROW_DOWN].reverse();
  const right = ARROW_DOWN[0].split('').map((_, x) => ARROW_DOWN.map((row) => row[x]).join(''));
  if (d === 'down') return ARROW_DOWN;
  if (d === 'up') return up;
  if (d === 'right') return right;
  return right.map((row) => row.split('').reverse().join(''));
}

function drawArrow(img: RGBAImage, d: Direction, x: number, y: number, scale: number, c: RGBA8): void {
  arrowGlyph(d).forEach((row, gy) => {
    for (let gx = 0; gx < row.length; gx++) if (row[gx] === '#') fillRect(img, x + gx * scale, y + gy * scale, scale, scale, c);
  });
}

function strokeRect(img: RGBAImage, x: number, y: number, w: number, h: number, t: number, c: RGBA8): void {
  fillRect(img, x, y, w, t, c);
  fillRect(img, x, y + h - t, w, t, c);
  fillRect(img, x, y, t, h, c);
  fillRect(img, x + w - t, y, t, h, c);
}

export interface SheetGuideOptions {
  cols: number;
  rows: number;
  /** Cell size in px (e.g. 256). */
  cell: number;
  key: KeyColor;
  /** Gap in px between cells and around the sheet. Default 0. */
  gutter?: number;
  /** Feet baseline at this fraction of the cell height (0 = none, the default). */
  baseline?: number;
  /** Cross marking the centre of each cell. */
  cross?: boolean;
  /** Inner square at this fraction of the cell (0 = none): the area an item must stay in. */
  safe?: number;
  /** One arrow per row, in the cell's top-right corner: the direction the character faces. */
  arrows?: Direction[];
  /** Number the cells within each row (1..cols) instead of across the whole sheet. */
  numberByRow?: boolean;
}

/**
 * Guide for the sheets beyond the sprite grid (atlas, directions, effects, items). Same colours as
 * `makeGuideImage`: key + a slightly different shade of it for all guide marks, so removing the key erases them.
 */
export function makeSheetGuide(o: SheetGuideOptions): RGBAImage {
  const cols = Math.max(1, Math.round(o.cols));
  const rows = Math.max(1, Math.round(o.rows));
  const cell = Math.max(16, Math.round(o.cell));
  const gut = Math.max(0, Math.round(o.gutter ?? 0));
  const img = createImage(cols * cell + (cols + 1) * gut, rows * cell + (rows + 1) * gut, KEY_RGBA[o.key]);
  const ink = GUIDE_LINE_RGBA[o.key];
  const line = Math.max(1, Math.round(cell / 128));
  const digit = Math.max(1, Math.round(cell / 64));
  const arrow = Math.max(2, Math.round(cell / 32));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = gut + c * (cell + gut), y = gut + r * (cell + gut);
      strokeRect(img, x, y, cell, cell, line, ink);
      if (o.baseline && o.baseline > 0 && o.baseline < 1) {
        const inset = Math.round(cell * 0.1);
        fillRect(img, x + inset, y + Math.round(cell * o.baseline - line / 2), cell - 2 * inset, line, ink);
      }
      if (o.cross) {
        const arm = Math.round(cell * 0.06);
        const cx = x + Math.round(cell / 2), cy = y + Math.round(cell / 2);
        fillRect(img, cx - arm, cy - Math.floor(line / 2), 2 * arm + line, line, ink);
        fillRect(img, cx - Math.floor(line / 2), cy - arm, line, 2 * arm + line, ink);
      }
      if (o.safe && o.safe > 0 && o.safe < 1) {
        const inset = Math.round((cell * (1 - o.safe)) / 2);
        strokeRect(img, x + inset, y + inset, cell - 2 * inset, cell - 2 * inset, line, ink);
      }
      const pad = line + digit * 2;
      drawNumber(img, o.numberByRow ? c + 1 : r * cols + c + 1, x + pad, y + pad, digit, ink);
      const dir = o.arrows?.[r];
      if (dir) drawArrow(img, dir, x + cell - pad - 7 * arrow, y + pad, arrow, ink);
    }
  }
  return img;
}

export interface ParallaxGuideOptions {
  aspect: ParallaxAspect;
  layer: ParallaxLayer;
  key: KeyColor;
  /** Image width in px. Default 1536. */
  width?: number;
}

const ASPECT_RATIO: Record<ParallaxAspect, number> = { '16:9': 16 / 9, '2:1': 2, '3:1': 3 };

/**
 * Guide for a parallax layer: key colour, a border, a dashed line where the layer's content starts (mid and near)
 * and matching ticks on the left and right edges that mark the heights where the loop must connect.
 */
export function makeParallaxGuide(o: ParallaxGuideOptions): RGBAImage {
  const w = Math.max(64, Math.round(o.width ?? 1536));
  const h = Math.round(w / ASPECT_RATIO[o.aspect]);
  const img = createImage(w, h, KEY_RGBA[o.key]);
  const ink = GUIDE_LINE_RGBA[o.key];
  const line = Math.max(2, Math.round(w / 512));
  strokeRect(img, 0, 0, w, h, line, ink);
  const top = PARALLAX_TOP[o.layer];
  if (top > 0) {
    const y = Math.round(h * top);
    const dash = line * 12, gap = line * 8;
    for (let x = 0; x < w; x += dash + gap) fillRect(img, x, y, dash, line, ink);
  }
  const tick = Math.round(w / 24);
  for (const f of [0.25, 0.5, 0.75]) {
    const y = Math.round(h * f);
    fillRect(img, 0, y, tick, line, ink);
    fillRect(img, w - tick, y, tick, line, ink);
  }
  return img;
}
