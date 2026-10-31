// Seeded random test map for the terrain preview: blobby 0/1 regions (like painted terrain), not pure noise.

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** w×h cells, 1 = terrain B. Random fill smoothed by a majority rule, so it has islands, bays and diagonals. */
export function randomMap(seed: number, w: number, h: number, fill = 0.45): Uint8Array {
  const rnd = mulberry32(seed * 2654435761);
  let cells = new Uint8Array(w * h);
  for (let i = 0; i < cells.length; i++) cells[i] = rnd() < fill ? 1 : 0;
  for (let pass = 0; pass < 2; pass++) {
    const next = new Uint8Array(cells.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const xx = Math.min(w - 1, Math.max(0, x + dx));
            const yy = Math.min(h - 1, Math.max(0, y + dy));
            n += cells[yy * w + xx];
          }
        }
        next[y * w + x] = n >= 5 ? 1 : 0;
      }
    }
    cells = next;
  }
  return cells;
}
