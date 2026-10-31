// The Kit's test level: a small platformer in the real Kaplay library, fed with the same sheet and anims the Kaplay
// export writes. Kaplay is loaded with a dynamic import() when a level opens, so it never weighs on the main bundle.
import { kaplayAnims, kaplayArea } from '../../../core/export/kaplay.ts';
import { isCenter, isStatic } from '../../../core/export/common.ts';
import { createImage } from '../../../core/image.ts';
import { levelLayout, tileTopInset, type GameResolution, type LevelAnims } from '../../../core/kit/level.ts';
import type { RGBAImage, SpriteResult } from '../../../core/types.ts';
import { rgbaToCanvas } from '../../lib/image.ts';

export type LevelActions = Record<keyof LevelAnims, { sprite: SpriteResult; anim: string | null }>;

export interface LevelConfig {
  /** The canvas is created here and removed by `stop`. */
  parent: HTMLElement;
  res: GameResolution;
  /** Integer zoom of the whole screen. */
  scale: number;
  /** What plays for each action: a sprite result and one of its animations (null for a static sprite). */
  actions: LevelActions;
  /** One tile of the ground (a plain one when the student has none). */
  tile: RGBAImage;
  pixelated: boolean;
}

export interface LevelHandle {
  stop: () => void;
  /** Draw the collision boxes. */
  setBoxes: (on: boolean) => void;
  /** Give the keyboard back to the game (after the student touched a checkbox). */
  focus: () => void;
}

const SKY: [number, number, number] = [124, 190, 224];

/** A flat ground tile for when the student has no tiles yet: one colour with a darker line per tile so the grid shows. */
export function plainTile(size: number): RGBAImage {
  const img = createImage(size, size, [138, 90, 43, 255]);
  for (let x = 0; x < size; x++) img.data.set([102, 66, 30, 255], ((size - 1) * size + x) * 4);
  for (let y = 0; y < size; y++) img.data.set([102, 66, 30, 255], (y * size + size - 1) * 4);
  return img;
}

/** `cols × rows` copies of a tile as one canvas (one Kaplay sprite per platform: a few big draws instead of hundreds). */
function strip(tile: RGBAImage, cols: number, rows: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = cols * tile.width;
  c.height = rows * tile.height;
  const ctx = c.getContext('2d')!;
  const t = rgbaToCanvas(tile);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) ctx.drawImage(t, x * tile.width, y * tile.height);
  return c;
}

/** Starts the level. The returned handle stops it; `stop` is safe to call before the library has loaded. */
export async function startLevel(cfg: LevelConfig): Promise<LevelHandle> {
  let stopped = false;
  let quit: (() => void) | null = null;
  const canvas = document.createElement('canvas');
  const stop = () => {
    stopped = true;
    quit?.();
    quit = null;
    canvas.remove();
  };
  const handle: LevelHandle = { stop, setBoxes: () => {}, focus: () => canvas.focus() };

  const { default: kaplay } = await import('kaplay');
  if (stopped) return handle;

  const { res, actions, tile } = cfg;
  const r = actions.idle.sprite;
  const { sheet } = r;
  const W = res.w, H = res.h, T = tile.width;
  const inset = tileTopInset(tile);
  cfg.parent.append(canvas);

  // The canvas is the game screen itself (1 canvas px = 1 game px) and CSS blows it up by a whole number:
  // positions between pixels can never show as uneven pixels.
  const k = kaplay({
    canvas, width: W, height: H, scale: 1, pixelDensity: 1, global: false, crisp: cfg.pixelated,
    texFilter: cfg.pixelated ? 'nearest' : 'linear', background: SKY, loadingScreen: false, touchToMouse: false, burp: false, debug: true,
  });
  quit = () => k.quit();
  canvas.style.width = `${W * cfg.scale}px`;
  canvas.style.height = `${H * cfg.scale}px`;
  canvas.style.imageRendering = cfg.pixelated ? 'pixelated' : 'auto';
  canvas.setAttribute('role', 'application');

  // Layout and feel, all in tiles/character heights so any resolution plays alike.
  const charH = Math.max(1, r.diag.refHeight || sheet.cell.h - sheet.padBottom);
  const jumpH = Math.max(1.6 * charH, 2.2 * T);
  const gravity = 14 * jumpH;
  const reach = Math.max(1, Math.floor((0.85 * jumpH) / T));
  const L = levelLayout(W, H, T, reach);
  const walk = charH * 2.5;

  // One Kaplay sprite per distinct sheet, with the same loadSprite options the exported .js uses.
  const sheets = [...new Set(Object.values(actions).map((a) => a.sprite))];
  const spriteKey = (sr: SpriteResult) => `player${sheets.indexOf(sr)}`;
  const assets = sheets.map((sr) =>
    k.loadSprite(
      spriteKey(sr),
      rgbaToCanvas(sr.sheet.image),
      isStatic(sr.sheet)
        ? undefined
        : { sliceX: sr.sheet.cols, sliceY: sr.sheet.rows, anims: Object.fromEntries(kaplayAnims(sr.sheet).map((x) => [x.name, { from: x.from, to: x.to, loop: x.loop, speed: x.speed }])) },
    ),
  );
  assets.push(k.loadSprite('floor', strip(tile, Math.ceil(L.width / T), L.floorRows)));
  L.platforms.forEach((p, i) => assets.push(k.loadSprite(`platform${i}`, strip(tile, p.len, 1))));
  await Promise.all(assets);
  if (stopped) return handle;

  k.setGravity(gravity);
  const solid = (name: string, x: number, top: number, w: number, h: number, oneWay: boolean) =>
    k.add([
      k.sprite(name), k.pos(x, top),
      k.area({ shape: new k.Rect(k.vec2(0, inset), w, h - inset) }),
      k.body({ isStatic: true }),
      ...(oneWay ? [k.platformEffector({ useOneWay: true })] : []),
    ]);
  solid('floor', 0, L.floorTop, L.width, L.floorRows * T, false);
  L.platforms.forEach((p, i) => solid(`platform${i}`, p.col * T, p.top, p.len * T, T, true));

  // Same origin and collision box as the exported snippet: anchor("bot") puts the feet padBottom px above pos.y.
  const centered = isCenter(sheet);
  const box = kaplayArea(sheet);
  const surface = L.floorTop + inset;
  const spawn = { x: Math.round(W * 0.2), y: surface + (centered ? 0 : sheet.padBottom) };
  const player = k.add([
    k.sprite(spriteKey(r), actions.idle.anim ? { anim: actions.idle.anim } : {}),
    k.pos(spawn.x, spawn.y - T),
    k.anchor(centered ? 'center' : 'bot'),
    box ? k.area({ shape: new k.Rect(k.vec2(box.x, box.y), box.w, box.h) }) : k.area(),
    k.body({ jumpForce: Math.sqrt(2 * gravity * jumpH) }),
  ]);

  const held = (keys: string[]) => keys.some((key) => k.isKeyDown(key as never));
  const jumpKeys = ['space', 'up', 'w'] as const;
  for (const key of jumpKeys) k.onKeyPress(key, () => player.isGrounded() && player.jump());

  // Changing action may mean changing sheet (one image per animation is the usual workflow): swap the sprite component.
  let playing = 'idle';
  let facing = false;
  k.onUpdate(() => {
    const dir = (held(['right', 'd']) ? 1 : 0) - (held(['left', 'a']) ? 1 : 0);
    const running = held(['shift']);
    if (dir) {
      player.move(dir * walk * (running ? 1.8 : 1), 0);
      facing = dir < 0;
    }
    const half = (box?.w ?? sheet.cell.w) / 2;
    player.pos.x = Math.min(L.width - half, Math.max(half, player.pos.x));
    if (player.pos.y > H + charH * 2) player.pos = k.vec2(spawn.x, spawn.y - T);
    const want = !player.isGrounded() ? 'jump' : dir ? (running ? 'run' : 'walk') : 'idle';
    if (want !== playing) {
      playing = want;
      const a = actions[want];
      player.use(k.sprite(spriteKey(a.sprite), a.anim ? { anim: a.anim } : {}));
    }
    player.flipX = facing;
    k.setCamPos(Math.round(Math.min(L.width - W / 2, Math.max(W / 2, player.pos.x))), H / 2);
  });

  handle.setBoxes = (on) => {
    k.debug.inspect = on;
  };
  canvas.focus();
  return handle;
}
