// Deterministic items sheet: 8 hand-drawn pixel items of very different sizes, upscaled and laid out loosely on white,
// like an AI "icon sheet". (The app example public/examples/items.png is a real Codex sheet made with the items prompt.)
import { alphaBBox, blit, crop, createImage, resizeNearest } from '../../src/core/image.ts';
import type { RGBA8, RGBAImage, Rect } from '../../src/core/types.ts';

const COLORS: Record<string, RGBA8> = {
  o: [40, 30, 44, 255],
  y: [250, 200, 40, 255], Y: [200, 140, 20, 255], w: [255, 240, 200, 255],
  r: [220, 50, 60, 255], R: [150, 30, 50, 255],
  b: [60, 120, 230, 255], B: [30, 60, 150, 255], c: [120, 220, 240, 255],
  n: [150, 90, 50, 255], N: [100, 60, 40, 255],
  s: [200, 208, 222, 255], S: [120, 130, 150, 255],
};

const ART: { name: string; rows: string[] }[] = [
  { name: 'coin', rows: [
    '...oooooo...', '..oyyyyyyo..', '.oyywwwyyYo.', 'oyywyyyyyYYo', 'oywyyYYyyyYo', 'oywyyYyyyyYo',
    'oywyyYyyyyYo', 'oyyyyYYyyyYo', 'oyyyyyyyyYYo', '.oyyyyyyYYo.', '..oYYYYYYo..', '...oooooo...' ] },
  { name: 'heart', rows: [
    '..ooo...ooo..', '.orrrooorrro.', 'orwwrrrrrrrRo', 'orwrrrrrrrrRo', 'orrrrrrrrrrRo', 'orrrrrrrrrRRo',
    '.orrrrrrrrRo.', '..orrrrrrRo..', '...orrrrRRo..', '....orrRRo...', '.....orRo....', '......oo.....' ] },
  { name: 'potion', rows: [
    '..oooooo..', '..onnnno..', '...oooo...', '...ocwo...', '...occo...', '..occcco..', '.obbbbbbo.',
    'obbcbbbbBo', 'obcbbbbbBo', 'obbbbbbbBo', 'obbbbbbBBo', '.obbbbBBo.', '..oBBBBo..', '...oooo...' ] },
  { name: 'key', rows: [
    '.oooo...........', 'oyyyyo..........', 'oyooyoooooooooo.', 'oyooyyyyyyyyyYo.',
    'oyyyyoooooYooYo.', '.oooo....oYoooo.', '.........ooo....' ] },
  { name: 'gem', rows: [
    '...oooooo...', '..occwwcco..', '.occwccccBo.', 'occwcccccBBo', 'obccccccccBo', 'obbccccccBBo',
    '.obbbccccBo.', '..obbbccBo..', '...obbbBo...', '....obBo....', '.....oo.....' ] },
  { name: 'sword', rows: [
    '...o...', ...Array<string>(13).fill('..osSo.'), '.ooooo.', 'oyyyyyo', '.ooNoo.',
    '...nNo.', '...nNo.', '...nNo.', '..oYYo.', '..oooo.' ] },
  { name: 'star', rows: [
    '......o......', '.....oyo.....', '.....oyo.....', '....oyyyo....', 'ooooyywyyoooo', 'oyyyyyyyyyyyo',
    '.oyyyyyyyyYo.', '..oyyyyyyYo..', '...oyyyyYYo..', '..oyyyyyYYYo.', '..oyyYooYYYo.', '.oyYYo..oYYo.', '.ooo......ooo.' ] },
  { name: 'mushroom', rows: [
    '....oooooo....', '..ooRRrrrrro..', '.orrwwrrrwwro.', 'orrwwwrrrwwrro', 'orrrwrrrrrrrro', 'orrrrrrwwrrrRo',
    'oRRRRRRRRRRRRo', '.oooonwwnoooo.', '....onwwnNo...', '....onwwnNo...', '....onwwnNo...', '....oNNNNNo...', '.....ooooo....' ] },
];

function draw(rows: string[]): RGBAImage {
  const w = Math.max(...rows.map((r) => r.length));
  const img = createImage(w, rows.length);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = COLORS[row[x]];
      if (c) img.data.set(c, (y * w + x) * 4);
    }
  });
  return crop(img, alphaBBox(img)!);
}

/** Art-px size of every item (opaque width × height), in sheet order. */
export const ITEM_ART = ART.map((a) => {
  const img = draw(a.rows);
  return { name: a.name, w: img.width, h: img.height };
});

export interface ItemsSheet {
  img: RGBAImage;
  /** Where every item sits in the sheet (px), reading order. */
  rects: Rect[];
  /** Art pixels → sheet px. */
  up: number;
}

/** 3 columns × 3 rows (the last cell empty) of items ×`up`, on white. */
export function makeItemsSheet(up = 8, gap = 56): ItemsSheet {
  const cols = 3;
  const cell = Math.max(...ITEM_ART.map((a) => Math.max(a.w, a.h))) * up + gap;
  const rows = Math.ceil(ART.length / cols);
  const img = createImage(cols * cell, rows * cell, [255, 255, 255, 255]);
  const rects: Rect[] = [];
  ART.forEach((a, i) => {
    const big = resizeNearest(draw(a.rows), ITEM_ART[i].w * up, ITEM_ART[i].h * up);
    // Centred in its cell with a small deterministic wobble, like drawings that are not aligned to any grid.
    const x = (i % cols) * cell + Math.floor((cell - big.width) / 2) + ((i * 7) % 5) * 3;
    const y = Math.floor(i / cols) * cell + Math.floor((cell - big.height) / 2) + ((i * 5) % 4) * 3;
    blit(img, big, x, y, 'over');
    rects.push({ x, y, w: big.width, h: big.height });
  });
  return { img, rects, up };
}
