// Background detection and removal (chroma key). See dev-docs/architecture.md.
import { distanceTo } from '../color.ts';
import type { ArtMode, BgOptions, RGBA8, RGBAImage } from '../types.ts';

/**
 * Most common border colour (colours bucketed to 4 bits/channel, then averaged inside the winning bucket).
 * confidence = share of border pixels in that bucket (0..1). If the border is already mostly transparent,
 * returns color [0,0,0,0] with the share of transparent border pixels as confidence.
 */
export function detectBackground(img: RGBAImage): { color: RGBA8; confidence: number } {
  const { width: W, height: H, data } = img;
  if (W === 0 || H === 0) return { color: [0, 0, 0, 0], confidence: 1 };
  const counts = new Uint32Array(4096);
  const sums = new Float64Array(4096 * 3);
  let total = 0;
  let transparent = 0;
  const visit = (x: number, y: number) => {
    const i = (y * W + x) * 4;
    total++;
    if (data[i + 3] < 128) {
      transparent++;
      return;
    }
    const k = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    counts[k]++;
    sums[k * 3] += data[i];
    sums[k * 3 + 1] += data[i + 1];
    sums[k * 3 + 2] += data[i + 2];
  };
  for (let x = 0; x < W; x++) {
    visit(x, 0);
    if (H > 1) visit(x, H - 1);
  }
  for (let y = 1; y < H - 1; y++) {
    visit(0, y);
    if (W > 1) visit(W - 1, y);
  }
  if (transparent * 2 >= total) return { color: [0, 0, 0, 0], confidence: transparent / total };
  let best = 0;
  for (let k = 1; k < 4096; k++) if (counts[k] > counts[best]) best = k;
  const n = counts[best];
  return {
    color: [Math.round(sums[best * 3] / n), Math.round(sums[best * 3 + 1] / n), Math.round(sums[best * 3 + 2] / n), 255],
    confidence: n / total,
  };
}

const smoothstep = (inner: number, outer: number, d: number): number => {
  if (outer <= inner) return d > inner ? 1 : 0;
  const t = Math.min(1, Math.max(0, (d - inner) / (outer - inner)));
  return t * t * (3 - 2 * t);
};

/**
 * Returns a NEW image where background pixels are transparent.
 * - pixel mode: binary alpha (0 or 255) by ΔE <= tolerance.
 * - cartoon mode: if o.soft, alpha = smoothstep(inner, outer, ΔE); if o.despill, un-mix bg from edge pixels:
 *   c = (c - (1-α)·bg) / α, clamped.
 * Pixels already transparent in the input stay transparent. color 'auto' → detectBackground.
 */
export function removeBackground(img: RGBAImage, o: BgOptions, mode: ArtMode): RGBAImage {
  const { width: W, height: H } = img;
  const out: RGBAImage = { width: W, height: H, data: new Uint8ClampedArray(img.data) };
  const bg = o.color === 'auto' ? detectBackground(img).color : o.color;
  // Transparent background: nothing to remove.
  if (bg[3] === 0 || W === 0 || H === 0) return out;

  const soft = mode === 'cartoon' ? o.soft : undefined;
  const despill = mode === 'cartoon' && !!o.despill;
  // Pixels with ΔE < limit (soft) or <= limit (hard) can belong to the background region.
  const limit = soft ? Math.max(soft.outer, o.tolerance) : o.tolerance;
  const data = img.data;

  // Per-pixel passability: already-transparent pixels are background by definition.
  const dist = distanceTo(bg);
  const shade = o.strategy === 'global' ? keyShade(bg) : null;
  const dE = new Float32Array(W * H);
  const cand = new Uint8Array(W * H);
  for (let p = 0, i = 0; p < W * H; p++, i += 4) {
    if (data[i + 3] === 0) {
      dE[p] = 0;
      cand[p] = 1;
      continue;
    }
    let d = dist(data[i], data[i + 1], data[i + 2]);
    // A lighter or darker shade of a chroma key (guide lines the AI redrew, shaded key) is still the key.
    if (shade && d > o.tolerance && shade(data[i], data[i + 1], data[i + 2])) d = 0;
    dE[p] = d;
    cand[p] = soft ? (d < limit ? 1 : 0) : d <= limit ? 1 : 0;
  }

  // Flat pockets of background only on light backgrounds: on dark ones, pupils and outlines are flat dark too.
  const light = 0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2] >= LIGHT_BG;
  const flat = light ? { dE, minSize: o.minHole ?? 16 } : undefined;
  const zone = o.strategy === 'global' ? cand : floodZone(cand, W, H, o.strategy === 'flood+holes' ? (o.minHole ?? 16) : 0, flat);
  if (mode === 'pixel') peelHalo(data, zone, dE, W, H, bg, o.tolerance);

  for (let p = 0, i = 0; p < W * H; p++, i += 4) {
    if (!zone[p]) continue;
    const a = data[i + 3];
    if (a === 0) continue;
    const k = soft ? smoothstep(soft.inner, soft.outer, dE[p]) : 0;
    const alpha = Math.round(a * k);
    if (alpha === 0) {
      out.data[i] = out.data[i + 1] = out.data[i + 2] = out.data[i + 3] = 0;
      continue;
    }
    if (despill && k < 1) {
      if (unmixWithForeground(data, zone, W, H, p, bg, a, out.data)) continue;
      for (let c = 0; c < 3; c++) out.data[i + c] = (data[i + c] - (1 - k) * bg[c]) / k;
    }
    out.data[i + 3] = alpha;
  }
  return out;
}

/** Halo layers peeled in pixel mode (AI resampling blends the key into ~1-2 source px of outline). */
const HALO_PASSES = 2;

/**
 * Pixel mode: pixels next to the background that are a blend of the key colour and the nearby foreground
 * (e.g. dark magenta between a magenta background and a black outline) are too far from the key for the ΔE
 * tolerance, yet they are mostly background. Estimate their coverage α against the local "clearly foreground"
 * colour (projection as in unmixWithForeground); α < 0.5 joins the background zone. Mutates `zone`.
 */
function peelHalo(data: Uint8ClampedArray, zone: Uint8Array, dE: Float32Array, W: number, H: number, bg: RGBA8, tol: number): void {
  const solid = tol * 3;
  for (let pass = 0; pass < HALO_PASSES; pass++) {
    const add: number[] = [];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const p = y * W + x;
        if (zone[p] || data[p * 4 + 3] === 0) continue;
        // Only the band touching the background.
        let edge = false;
        for (let dy = -1; dy <= 1 && !edge; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx >= 0 && yy >= 0 && xx < W && yy < H && zone[yy * W + xx]) {
              edge = true;
              break;
            }
          }
        if (!edge) continue;
        let r = 0, g = 0, b = 0, n = 0;
        for (let dy = -MATTE_RADIUS; dy <= MATTE_RADIUS; dy++)
          for (let dx = -MATTE_RADIUS; dx <= MATTE_RADIUS; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
            const q = yy * W + xx;
            if (zone[q] || dE[q] < solid || data[q * 4 + 3] < 255) continue;
            r += data[q * 4];
            g += data[q * 4 + 1];
            b += data[q * 4 + 2];
            n++;
          }
        if (!n) continue;
        const F = [r / n, g / n, b / n];
        let num = 0, den = 0;
        for (let c = 0; c < 3; c++) {
          const fb = F[c] - bg[c];
          num += (data[p * 4 + c] - bg[c]) * fb;
          den += fb * fb;
        }
        if (den >= 1 && num / den < 0.5) add.push(p);
      }
    if (!add.length) return;
    for (const p of add) zone[p] = 1;
  }
}

/** Search radius (px) for the local foreground colour used by the edge matting. */
const MATTE_RADIUS = 3;

/**
 * Edge matting for antialiased pixels: the observed colour is c = α·F + (1-α)·B. B is the key colour and F is
 * estimated as the mean of nearby foreground pixels (outside the background zone). α is the projection of c−B
 * onto F−B, and the colour is un-mixed with that α. The ΔE ramp alone overestimates α along saturated
 * edges, which leaves a key-coloured fringe. Returns false (caller falls back) when no foreground is near.
 */
function unmixWithForeground(
  data: Uint8ClampedArray, zone: Uint8Array, W: number, H: number, p: number, bg: RGBA8, a0: number, out: Uint8ClampedArray,
): boolean {
  const x = p % W, y = (p - x) / W;
  let r = 0, g = 0, b = 0, n = 0;
  for (let dy = -MATTE_RADIUS; dy <= MATTE_RADIUS; dy++) {
    const yy = y + dy;
    if (yy < 0 || yy >= H) continue;
    for (let dx = -MATTE_RADIUS; dx <= MATTE_RADIUS; dx++) {
      const xx = x + dx;
      if (xx < 0 || xx >= W) continue;
      const q = yy * W + xx;
      if (zone[q] || data[q * 4 + 3] < 255) continue;
      r += data[q * 4];
      g += data[q * 4 + 1];
      b += data[q * 4 + 2];
      n++;
    }
  }
  if (!n) return false;
  const F = [r / n, g / n, b / n];
  const i = p * 4;
  let num = 0, den = 0;
  for (let c = 0; c < 3; c++) {
    const fb = F[c] - bg[c];
    num += (data[i + c] - bg[c]) * fb;
    den += fb * fb;
  }
  if (den < 1) return false;
  const alpha = Math.max(0, Math.min(1, num / den));
  if (alpha < 0.02) {
    out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0;
    return true;
  }
  for (let c = 0; c < 3; c++) {
    // Low α makes the un-mix unstable: lean on the local foreground colour instead.
    const unmixed = (data[i + c] - (1 - alpha) * bg[c]) / alpha;
    out[i + c] = alpha < 0.5 ? F[c] + (unmixed - F[c]) * alpha * 2 : unmixed;
  }
  out[i + 3] = Math.round(a0 * alpha);
  return true;
}

/** Luma from which a background counts as light (white, light grey, pastel) for the flat-pocket rule. */
const LIGHT_BG = 200;
/** ΔE under which a pixel is "the same flat colour" as the background (the AI paints the bg flat). */
const FLAT_DE = 3;
/** Share of flat pixels that makes an enclosed region a pocket of background (measured: bg pockets ≈0.87, painted whites ≤0.65). */
const FLAT_SHARE = 0.75;

/**
 * 4-connected flood over `cand` seeded from every border pixel. Interior candidate regions (not reached from the
 * border) are added when they are at least `minHole` px (any colour within tolerance: 'flood+holes'), or when they
 * are flat background (`flat`): at least FLAT_SHARE of their pixels within FLAT_DE of the bg and `flat.minSize` px.
 * The second rule clears the gap between the legs of a character on white, while painted whites (eyes, teeth,
 * highlights) are shaded and stay.
 */
function floodZone(cand: Uint8Array, W: number, H: number, minHole: number, flat?: { dE: Float32Array; minSize: number }): Uint8Array {
  const zone = new Uint8Array(W * H);
  const queue = new Int32Array(W * H);
  // Grows the already-enqueued seeds (queue[0..tail0)) over `cand`; returns the final count (region = queue[0..n)).
  const run = (tail0: number, mark: Uint8Array): number => {
    let head = 0, tail = tail0;
    while (head < tail) {
      const p = queue[head++];
      const x = p % W;
      if (x > 0 && cand[p - 1] && !mark[p - 1]) { mark[p - 1] = 1; queue[tail++] = p - 1; }
      if (x < W - 1 && cand[p + 1] && !mark[p + 1]) { mark[p + 1] = 1; queue[tail++] = p + 1; }
      if (p >= W && cand[p - W] && !mark[p - W]) { mark[p - W] = 1; queue[tail++] = p - W; }
      if (p < W * (H - 1) && cand[p + W] && !mark[p + W]) { mark[p + W] = 1; queue[tail++] = p + W; }
    }
    return tail;
  };

  let tail = 0;
  const seed = (p: number) => {
    if (cand[p] && !zone[p]) {
      zone[p] = 1;
      queue[tail++] = p;
    }
  };
  for (let x = 0; x < W; x++) {
    seed(x);
    seed((H - 1) * W + x);
  }
  for (let y = 0; y < H; y++) {
    seed(y * W);
    seed(y * W + W - 1);
  }
  run(tail, zone);

  if (minHole > 0 || flat) {
    // Label interior candidate regions; keep the large ones and the flat background pockets. `seen` marks visited pixels.
    const seen = new Uint8Array(W * H);
    for (let p = 0; p < W * H; p++) {
      if (!cand[p] || zone[p] || seen[p]) continue;
      seen[p] = 1;
      queue[0] = p;
      const size = run(1, seen);
      let keep = minHole > 0 && size >= minHole;
      if (!keep && flat && size >= flat.minSize) {
        let n = 0;
        for (let j = 0; j < size; j++) if (flat.dE[queue[j]] <= FLAT_DE) n++;
        keep = n >= size * FLAT_SHARE;
      }
      if (keep) for (let j = 0; j < size; j++) zone[queue[j]] = 1;
    }
  }
  return zone;
}

/** HSV hue (degrees), saturation and value of an sRGB colour. */
function hsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  let h = 0;
  if (delta > 0) {
    if (max === r) h = 60 * (((g - b) / delta + 6) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }
  return [h, max === 0 ? 0 : delta / max, max / 255];
}

/** Hue window (degrees), minimum saturation and value of a pixel that counts as a shade of the chroma key. */
const SHADE_HUE = 12;
const SHADE_SAT = 0.75;
const SHADE_VAL = 0.6;

/**
 * For a saturated chroma key (magenta, green…), a test "is this pixel a lighter or darker shade of the key?":
 * same hue (±SHADE_HUE), strongly saturated and not too dark. ΔE alone misses these: the guide lines the AI
 * redraws come out ≈ ΔE 19 from the key (e.g. 202,4,202 on 248,3,249), only because they are darker. The
 * prompt forbids the key hue on the character, and darker blends (outline + key) stay below SHADE_VAL.
 * Returns null for non-chroma backgrounds (white, grey, earth tones).
 */
export function keyShade(bg: RGBA8): ((r: number, g: number, b: number) => boolean) | null {
  const [h0, s0, v0] = hsv(bg[0], bg[1], bg[2]);
  if (s0 < 0.7 || v0 < 0.3) return null;
  return (r, g, b) => {
    const [h, sat, v] = hsv(r, g, b);
    const dh = Math.abs(h - h0);
    return Math.min(dh, 360 - dh) <= SHADE_HUE && sat >= SHADE_SAT && v >= SHADE_VAL;
  };
}

/**
 * Chroma keys (saturated, bright, away from skin/earth hues: green, cyan, blue, magenta, yellow) → 'global'
 * (also empties holes). White, black, greys and everything else → 'flood' (safe for cream/white/dark art).
 */
export function chooseStrategy(color: RGBA8): BgOptions['strategy'] {
  if (color[3] === 0) return 'flood';
  const r = color[0] / 255, g = color[1] / 255, b = color[2] / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const delta = max - min;
  if (max === 0 || delta / max < 0.7 || max < 0.3) return 'flood';
  let hue: number;
  if (max === r) hue = 60 * (((g - b) / delta + 6) % 6);
  else if (max === g) hue = 60 * ((b - r) / delta + 2);
  else hue = 60 * ((r - g) / delta + 4);
  // Reds/oranges (0-60°) overlap skin and earth tones: keep them on the safe strategy.
  return hue >= 60 && hue < 340 ? 'global' : 'flood';
}

/** Sensible BgOptions for an image: detected colour, strategy from the colour, mode-specific defaults. */
export function autoBgOptions(img: RGBAImage, mode: ArtMode): BgOptions {
  const { color } = detectBackground(img);
  const base = mode === 'cartoon' ? DEFAULT_BG_CARTOON : DEFAULT_BG;
  return { ...base, color, strategy: chooseStrategy(color) };
}

export const DEFAULT_BG: BgOptions = { color: 'auto', tolerance: 18, strategy: 'global', minHole: 16 };
export const DEFAULT_BG_CARTOON: BgOptions = { color: 'auto', tolerance: 18, strategy: 'global', soft: { inner: 10, outer: 40 }, despill: true };
