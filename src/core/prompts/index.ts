// Prompt templates and guide-grid image for generating sprites with chat image models (Gemini, ChatGPT…).
import { createImage } from '../image.ts';
import type { ArtMode, RGBA8, RGBAImage } from '../types.ts';

export type Lang = 'en' | 'es';
export type KeyColor = 'magenta' | 'green';

/** Exact chroma-key background colours requested in the prompts. */
export const KEY_RGBA: Record<KeyColor, RGBA8> = {
  magenta: [255, 0, 255, 255],
  green: [0, 255, 0, 255],
};

export const KEY_HEX: Record<KeyColor, string> = { magenta: '#FF00FF', green: '#00FF00' };

/** Shade used for the guide's lines and numbers: close enough to the key to be erased with it. */
export const GUIDE_LINE_RGBA: Record<KeyColor, RGBA8> = {
  magenta: [224, 0, 224, 255],
  green: [0, 224, 0, 255],
};

const KEY_NAME: Record<Lang, Record<KeyColor, string>> = {
  en: { magenta: 'pure magenta', green: 'pure green' },
  es: { magenta: 'magenta puro', green: 'verde puro' },
};

/** Colours the character must avoid for each key (they would be erased with the background). */
const KEY_AVOID: Record<Lang, Record<KeyColor, string>> = {
  en: { magenta: 'magenta, pink or purple', green: 'bright green or lime' },
  es: { magenta: 'magenta, rosado ni morado', green: 'verde brillante ni lima' },
};

/**
 * Key colour that will not collide with the subject's colours: green for pink/magenta/purple subjects,
 * magenta otherwise. The UI should switch (and tell the student) when it differs from the chosen key.
 */
export function suggestKey(subject: string): KeyColor {
  const s = normalize(subject);
  return /\b(magenta|pink|purple|violet|fuchsia|rosad[oa]s?|rosa|morad[oa]s?|violeta|fucsia|lila)\b/.test(s)
    ? 'green'
    : 'magenta';
}

export interface PromptOptions {
  lang: Lang;
  mode: ArtMode;
  /** What the character is ("a knight with a blue cape"). */
  subject: string;
  /** Animation name ("walk", "idle", "attack"...). */
  action: string;
  frames: number;
  cols: number;
  /** Pixel mode: character height in art pixels (e.g. 32). */
  artHeight: number;
  view: 'side' | 'top-down' | 'front' | 'three-quarter';
  key: KeyColor;
  /** True when the student also attaches a reference image of the character. */
  withReference: boolean;
}

/** Rows of the guide grid for `frames` frames laid out in `cols` columns. */
export function gridRows(frames: number, cols: number): number {
  return Math.max(1, Math.ceil(Math.max(1, frames) / Math.max(1, cols)));
}

// ---------------------------------------------------------------- action key poses

interface PoseSet {
  loop: boolean;
  en: string[];
  es: string[];
}

/** Two-beat cycle (walk/run): 4 poses for the near leg leading, then the same with the far leg. */
function legCycle(en: string[], es: string[]): PoseSet {
  const swap = (poses: string[], a: string, b: string): string[] =>
    poses.map((p) => p.replaceAll('{A}', a).replaceAll('{B}', b));
  return {
    loop: true,
    en: [...swap(en, 'near leg', 'far leg'), ...swap(en, 'far leg', 'near leg')],
    es: [...swap(es, 'pierna cercana', 'pierna lejana'), ...swap(es, 'pierna lejana', 'pierna cercana')],
  };
}

const POSES: Record<string, PoseSet> = {
  walk: legCycle(
    [
      'contact: {A} forward with the heel touching the ground, legs at their widest, arms (if any) swinging opposite to the legs',
      'down: weight drops onto the {A}, knee bent, body at its lowest',
      'passing: {B} swings past the straight {A}, body upright',
      'up: pushing off the {A}, body at its highest',
    ],
    [
      'contacto: {A} adelante con el talón tocando el suelo, piernas en su máxima apertura, brazos (si tiene) opuestos a las piernas',
      'bajada: el peso cae sobre la {A}, rodilla flexionada, cuerpo en su punto más bajo',
      'paso: la {B} pasa junto a la {A} estirada, cuerpo erguido',
      'subida: impulso sobre la {A}, cuerpo en su punto más alto',
    ],
  ),
  run: legCycle(
    [
      'contact: {A} strikes the ground in front, body leaning forward, arms (if any) pumping opposite to the legs',
      'down: {A} knee bends to absorb the landing, body at its lowest',
      'push: {A} drives back, {B} knee swings high forward',
      'flight: both feet off the ground, legs spread, body at its highest',
    ],
    [
      'contacto: la {A} pisa adelante, cuerpo inclinado hacia delante, brazos (si tiene) opuestos a las piernas',
      'bajada: la rodilla de la {A} se flexiona al aterrizar, cuerpo en su punto más bajo',
      'impulso: la {A} empuja hacia atrás, la rodilla de la {B} sube adelante',
      'vuelo: ambos pies en el aire, piernas abiertas, cuerpo en su punto más alto',
    ],
  ),
  idle: {
    loop: true,
    en: [
      'relaxed neutral stance',
      'breathing in: the body rises or stretches very slightly',
      'top of the breath: the highest point of the subtle rise',
      'breathing out: settling back towards the neutral stance',
    ],
    es: [
      'postura neutra y relajada',
      'inspiración: el cuerpo sube o se estira muy poco',
      'final de la inspiración: el punto más alto de esa leve subida',
      'espiración: vuelve hacia la postura neutra',
    ],
  },
  attack: {
    loop: false,
    en: [
      'ready stance',
      'anticipation: winding up, weapon or arm pulled back',
      'strike: fast swing at full extension',
      'follow-through: weapon or arm past the target',
      'recovery: returning to the ready stance',
    ],
    es: [
      'postura de guardia',
      'anticipación: carga el golpe, arma o brazo hacia atrás',
      'golpe: movimiento rápido en máxima extensión',
      'seguimiento: el arma o el brazo pasa más allá del objetivo',
      'recuperación: vuelve a la postura de guardia',
    ],
  },
  jump: {
    loop: false,
    en: [
      'crouch: knees bent, preparing to jump',
      'take-off: pushing off, legs extending',
      'rising: body stretched upwards',
      'peak: legs tucked at the highest point',
      'falling: legs reaching down for the ground',
      'landing: knees bent absorbing the impact',
    ],
    es: [
      'agachado: rodillas flexionadas, preparando el salto',
      'despegue: se impulsa, las piernas se estiran',
      'ascenso: cuerpo estirado hacia arriba',
      'cima: piernas recogidas en el punto más alto',
      'caída: las piernas buscan el suelo',
      'aterrizaje: rodillas flexionadas absorbiendo el impacto',
    ],
  },
  hurt: {
    loop: false,
    en: ['recoil: hit from the front, body bent backwards', 'flinch: eyes shut, leaning back', 'recovering to the neutral stance'],
    es: ['retroceso: golpeado de frente, cuerpo hacia atrás', 'mueca de dolor: ojos cerrados, inclinado atrás', 'se recupera hacia la postura neutra'],
  },
  death: {
    loop: false,
    en: ['hit: recoiling', 'staggering, losing balance', 'falling down', 'hitting the ground', 'lying still on the ground'],
    es: ['impacto: retrocede', 'se tambalea y pierde el equilibrio', 'cae', 'golpea el suelo', 'yace inmóvil en el suelo'],
  },
};

const ACTION_ALIASES: Record<string, string> = {
  walk: 'walk', walking: 'walk', caminar: 'walk', caminando: 'walk', andar: 'walk',
  run: 'run', running: 'run', correr: 'run', corriendo: 'run', carrera: 'run',
  idle: 'idle', reposo: 'idle', quieto: 'idle', espera: 'idle', respirar: 'idle',
  attack: 'attack', atacar: 'attack', ataque: 'attack', golpe: 'attack', slash: 'attack',
  jump: 'jump', jumping: 'jump', saltar: 'jump', salto: 'jump',
  hurt: 'hurt', hit: 'hurt', dano: 'hurt', herido: 'hurt',
  death: 'death', die: 'death', dying: 'death', morir: 'death', muerte: 'death',
};

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

/** "Frame k: pose" lines for a known action, or null for a free-form one. */
function frameLines(action: string, frames: number, lang: Lang): string[] | null {
  const id = ACTION_ALIASES[normalize(action)];
  const set = id ? POSES[id] : undefined;
  if (!set) return null;
  const poses = set[lang];
  const K = poses.length;
  const label = lang === 'en' ? 'Frame' : 'Cuadro';
  if (frames > K) {
    // More frames than key poses: list the keys and ask for in-betweens.
    const head =
      lang === 'en'
        ? `Spread these key poses evenly over the ${frames} frames and fill the gaps with smooth in-betweens:`
        : `Reparte estas poses clave de forma uniforme en los ${frames} cuadros y completa los huecos con intermedios suaves:`;
    return [head, ...poses.map((p) => `  - ${p}`)];
  }
  const out: string[] = [];
  for (let i = 0; i < frames; i++) {
    // Loops sample the cycle evenly; one-shot actions always keep the first and last pose.
    const k = set.loop || frames === 1 ? Math.floor((i * K) / frames) : Math.round((i * (K - 1)) / (frames - 1));
    out.push(`  - ${label} ${i + 1}: ${poses[k]}`);
  }
  return out;
}

function isLoop(action: string): boolean | undefined {
  const id = ACTION_ALIASES[normalize(action)];
  return id ? POSES[id].loop : undefined;
}

// ---------------------------------------------------------------- sprite prompt

const VIEW: Record<Lang, Record<PromptOptions['view'], string>> = {
  en: {
    side: 'strict side view (profile), facing right, in every frame',
    'top-down': 'top-down view as in classic RPGs, facing down (towards the viewer), in every frame',
    front: 'front view, facing the viewer, in every frame',
    'three-quarter': 'three-quarter view, facing down-right, in every frame',
  },
  es: {
    side: 'vista lateral estricta (de perfil), mirando a la derecha, en todos los cuadros',
    'top-down': 'vista cenital como en los RPG clásicos, mirando hacia abajo (hacia el espectador), en todos los cuadros',
    front: 'vista frontal, mirando al espectador, en todos los cuadros',
    'three-quarter': 'vista tres cuartos, mirando abajo a la derecha, en todos los cuadros',
  },
};

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function styleLine(mode: ArtMode, artHeight: number, lang: Lang): string {
  if (lang === 'en') {
    return mode === 'pixel'
      ? `Style: true pixel art. The character is about ${artHeight} art pixels tall; every art pixel is a square block of the same size on one grid. Crisp hard edges, no anti-aliasing, no blur, no gradients, limited palette (about 16 colors).`
      : 'Style: clean 2D cartoon / vector style, flat colors with simple cel shading, clear dark outline, sharp edges, no blur, no painterly texture.';
  }
  return mode === 'pixel'
    ? `Estilo: pixel art auténtico. El personaje mide unos ${artHeight} píxeles de arte de alto; cada píxel de arte es un bloque cuadrado del mismo tamaño sobre una sola cuadrícula. Bordes nítidos, sin antialiasing, sin desenfoque, sin degradados, paleta limitada (unos 16 colores).`
    : 'Estilo: dibujo 2D limpio tipo cartoon / vectorial, colores planos con sombreado simple, contorno oscuro bien marcado, bordes nítidos, sin desenfoque ni textura pictórica.';
}

/** Full prompt text to paste into the chat, together with the guide image (and the reference, if any). */
export function buildSpritePrompt(o: PromptOptions): string {
  const frames = Math.max(1, Math.round(o.frames));
  const cols = Math.max(1, Math.min(frames, Math.round(o.cols)));
  const rows = gridRows(frames, cols);
  const empty = cols * rows - frames;
  const hex = KEY_HEX[o.key];
  const keyName = KEY_NAME[o.lang][o.key];
  const avoid = KEY_AVOID[o.lang][o.key];
  const single = frames === 1;
  const poses = single ? null : frameLines(o.action, frames, o.lang);
  const loop = isLoop(o.action);
  const L: string[] = [];

  if (o.lang === 'en') {
    L.push(
      single
        ? `Create ONE game sprite image of ${o.subject}, ${o.action} pose, with the layout of the attached guide image (a single cell).`
        : `Create ONE sprite sheet image of ${o.subject} for a "${o.action}" animation: ${frames} frames in a grid of ${cols} columns × ${rows} rows, exactly like the attached guide image.`,
    );
    if (o.withReference) {
      L.push(
        'Two images are attached: the guide (the grid on the flat key colour) and the character reference. Use the reference character exactly: same design, colors, proportions and outfit. Take only the character from it, not its background or size.',
      );
    }
    L.push('', 'Layout:');
    if (!single) {
      L.push(
        `- One frame per cell, in reading order (left to right, top to bottom), same cell grid and aspect ratio as the guide.`,
      );
      if (empty > 0) L.push(`- Leave the last ${empty} cell${empty > 1 ? 's' : ''} empty (plain background).`);
    }
    L.push(
      '- Character centered horizontally in its cell, feet (or lowest point) resting on the baseline drawn in the guide.',
      '- Nothing touches or crosses the cell borders; keep a clear margin around the character.',
      '- The guide is only a template: do not draw its lines or numbers in the result.',
    );
    if (!single) {
      L.push(
        '',
        'Consistency:',
        '- The same character in every frame: same scale, same height, same palette, same proportions.',
        `- ${cap(VIEW.en[o.view])}.`,
        '',
        'Animation:',
      );
      if (poses) L.push(...poses);
      else {
        L.push(
          `  - ${frames} evenly timed key poses of the ${o.action} motion, from start to end; each frame clearly different from its neighbours.`,
        );
      }
      if (loop !== false) L.push(`  - The animation loops: frame ${frames} flows smoothly back into frame 1.`);
    } else {
      L.push(`- ${cap(VIEW.en[o.view].replace(', in every frame', ''))}.`);
    }
    L.push(
      '',
      styleLine(o.mode, o.artHeight, 'en'),
      '',
      `Background: one flat solid color, exactly ${hex} (${keyName}), filling every cell edge to edge. No gradients, shadows, floor, ground line, scenery, text or labels. Do not use ${avoid} anywhere on the character, its outline or effects.`,
    );
  } else {
    L.push(
      single
        ? `Crea UNA sola imagen de sprite de ${o.subject}, en pose de ${o.action}, con la disposición de la imagen guía adjunta (una sola celda).`
        : `Crea UNA sola imagen de hoja de sprites de ${o.subject} con la animación «${o.action}»: ${frames} cuadros en una cuadrícula de ${cols} columnas × ${rows} filas, exactamente como la imagen guía adjunta.`,
    );
    if (o.withReference) {
      L.push(
        'Se adjuntan dos imágenes: la guía (la cuadrícula sobre el color clave plano) y la referencia del personaje. Usa exactamente el personaje de la referencia adjunta: mismo diseño, colores, proporciones y vestimenta. Toma de ella solo el personaje, no su fondo ni su tamaño.',
      );
    }
    L.push('', 'Disposición:');
    if (!single) {
      L.push(
        '- Un cuadro por celda, en orden de lectura (de izquierda a derecha y de arriba abajo), con la misma cuadrícula y proporción que la guía.',
      );
      if (empty > 0) {
        L.push(empty > 1 ? `- Deja vacías las últimas ${empty} celdas (solo fondo).` : '- Deja vacía la última celda (solo fondo).');
      }
    }
    L.push(
      '- Personaje centrado horizontalmente en su celda, con los pies (o su punto más bajo) apoyados en la línea base dibujada en la guía.',
      '- Nada toca ni cruza los bordes de la celda; deja un margen libre alrededor del personaje.',
      '- La guía es solo una plantilla: no dibujes sus líneas ni sus números en el resultado.',
    );
    if (!single) {
      L.push(
        '',
        'Coherencia:',
        '- El mismo personaje en todos los cuadros: misma escala, misma altura, misma paleta, mismas proporciones.',
        `- ${cap(VIEW.es[o.view])}.`,
        '',
        'Animación:',
      );
      if (poses) L.push(...poses);
      else {
        L.push(
          `  - ${frames} poses clave del movimiento «${o.action}», repartidas de forma uniforme del inicio al final; cada cuadro claramente distinto de sus vecinos.`,
        );
      }
      if (loop !== false) L.push(`  - La animación es un ciclo: el cuadro ${frames} enlaza suavemente con el cuadro 1.`);
    } else {
      L.push(`- ${cap(VIEW.es[o.view].replace(', en todos los cuadros', ''))}.`);
    }
    L.push(
      '',
      styleLine(o.mode, o.artHeight, 'es'),
      '',
      `Fondo: un único color sólido y plano, exactamente ${hex} (${keyName}), que llene cada celda de borde a borde. Sin degradados, sombras, suelo, línea de suelo, escenario, texto ni etiquetas. No uses ${avoid} en ninguna parte del personaje, su contorno o sus efectos.`,
    );
  }
  return L.join('\n');
}

// ---------------------------------------------------------------- tile prompt

export interface TilePromptOptions {
  lang: Lang;
  mode: ArtMode;
  /** Terrain material ("grass", "dirt path", "water"). */
  material: string;
  /** Tile size in art pixels (pixel mode). */
  tileSize: number;
  view: 'top-down' | 'side';
}

/** Prompt for ONE seamless square texture of a terrain material (no transitions, no objects). */
export function buildTilePrompt(o: TilePromptOptions): string {
  const T = Math.max(1, Math.round(o.tileSize));
  if (o.lang === 'en') {
    const view =
      o.view === 'top-down'
        ? 'View: straight top-down, as seen from directly above.'
        : `View: side view, as the front face of ${o.material} in a 2D platformer.`;
    const style =
      o.mode === 'pixel'
        ? `Style: true pixel art, exactly ${T}×${T} art pixels; every art pixel is a square block of the same size. Crisp hard edges, no anti-aliasing, no blur, limited palette (8 to 16 colors).`
        : 'Style: clean 2D cartoon style, flat colors, simple shapes, no blur, no photographic texture.';
    return [
      `Create ONE square, seamless texture of ${o.material} for a 2D game tile.`,
      '- Tileable on both axes: the left edge continues into the right edge and the top edge into the bottom edge, with no visible seam.',
      `- ${view}`,
      '- Fill the whole square evenly with the material: no border, no frame, no vignette, no standout objects or focal points, no transitions to other materials.',
      '- Flat, even lighting: no cast shadows and no light coming from one side.',
      `- ${style}`,
      '- No text, no labels.',
    ].join('\n');
  }
  const view =
    o.view === 'top-down'
      ? 'Vista: cenital, vista directamente desde arriba.'
      : `Vista: lateral, como la cara frontal de ${o.material} en un juego de plataformas 2D.`;
  const style =
    o.mode === 'pixel'
      ? `Estilo: pixel art auténtico, exactamente ${T}×${T} píxeles de arte; cada píxel de arte es un bloque cuadrado del mismo tamaño. Bordes nítidos, sin antialiasing, sin desenfoque, paleta limitada (de 8 a 16 colores).`
      : 'Estilo: dibujo 2D limpio tipo cartoon, colores planos, formas simples, sin desenfoque ni textura fotográfica.';
  return [
    `Crea UNA sola textura cuadrada y continua (seamless) de ${o.material} para un tile de juego 2D.`,
    '- Repetible en ambos ejes: el borde izquierdo continúa en el derecho y el superior en el inferior, sin costuras visibles.',
    `- ${view}`,
    '- Llena todo el cuadrado de forma uniforme con el material: sin borde, sin marco, sin viñeta, sin objetos destacados ni puntos focales, sin transiciones a otros materiales.',
    '- Iluminación plana y uniforme: sin sombras proyectadas ni luz que venga de un lado.',
    `- ${style}`,
    '- Sin texto ni etiquetas.',
  ].join('\n');
}

// ---------------------------------------------------------------- guide image

export interface GuideOptions {
  cols: number;
  rows: number;
  /** Cell size in px of the guide image (e.g. 256). */
  cell: number;
  key: KeyColor;
  /** Draw a baseline ("feet line") at this fraction of the cell height. Default 0.9; 0 = no baseline. */
  baseline?: number;
}

/** 3×5 bitmap digits, one string per row ('#' = on). */
const DIGITS: string[][] = [
  ['###', '#.#', '#.#', '#.#', '###'],
  ['.#.', '##.', '.#.', '.#.', '###'],
  ['###', '..#', '###', '#..', '###'],
  ['###', '..#', '###', '..#', '###'],
  ['#.#', '#.#', '###', '..#', '..#'],
  ['###', '#..', '###', '..#', '###'],
  ['###', '#..', '###', '#.#', '###'],
  ['###', '..#', '.#.', '.#.', '.#.'],
  ['###', '#.#', '###', '#.#', '###'],
  ['###', '#.#', '###', '..#', '###'],
];

export function fillRect(img: RGBAImage, x: number, y: number, w: number, h: number, c: RGBA8): void {
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(img.width, x + w), y1 = Math.min(img.height, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * img.width + xx) * 4;
      img.data[i] = c[0];
      img.data[i + 1] = c[1];
      img.data[i + 2] = c[2];
      img.data[i + 3] = c[3];
    }
  }
}

export function drawNumber(img: RGBAImage, n: number, x: number, y: number, scale: number, c: RGBA8): void {
  let cx = x;
  for (const ch of String(n)) {
    const glyph = DIGITS[ch.charCodeAt(0) - 48];
    for (let gy = 0; gy < 5; gy++) {
      for (let gx = 0; gx < 3; gx++) {
        if (glyph[gy][gx] === '#') fillRect(img, cx + gx * scale, y + gy * scale, scale, scale, c);
      }
    }
    cx += 4 * scale;
  }
}

/**
 * Guide image: solid key colour (#FF00FF or #00FF00) with cell borders and a feet baseline drawn in a slightly
 * different shade of the same key (#E000E0 / #00E000) so background removal also erases the guides.
 * Small frame numbers in each cell's corner, same shade.
 */
export function makeGuideImage(o: GuideOptions): RGBAImage {
  const cols = Math.max(1, Math.round(o.cols));
  const rows = Math.max(1, Math.round(o.rows));
  const cell = Math.max(16, Math.round(o.cell));
  const img = createImage(cols * cell, rows * cell, KEY_RGBA[o.key]);
  const ink = GUIDE_LINE_RGBA[o.key];
  // Line width and digit scale grow with the cell so the guide survives the model's downscaling.
  const line = Math.max(1, Math.round(cell / 128));
  const digit = Math.max(1, Math.round(cell / 64));
  const baseline = o.baseline ?? 0.9;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cell, y = r * cell;
      fillRect(img, x, y, cell, line, ink);
      fillRect(img, x, y + cell - line, cell, line, ink);
      fillRect(img, x, y, line, cell, ink);
      fillRect(img, x + cell - line, y, line, cell, ink);
      if (baseline > 0 && baseline < 1) {
        const by = y + Math.round(cell * baseline - line / 2);
        const inset = Math.round(cell * 0.1);
        fillRect(img, x + inset, by, cell - 2 * inset, line, ink);
      }
      const pad = line + digit * 2;
      drawNumber(img, r * cols + c + 1, x + pad, y + pad, digit, ink);
    }
  }
  return img;
}
