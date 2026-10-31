import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { decodePng } from '../src/core/export/index.ts';
import { autoBgOptions, removeBackground } from '../src/core/bg/index.ts';
import { crop } from '../src/core/image.ts';
import { downscaleDominant } from '../src/core/pixel/dominant.ts';
import * as w from '../src/vendor/unfake/unfake_wasm.js';
import { loadUnfake } from './helpers.ts';

const core = loadUnfake();

describe('deterministic dominant downscale', () => {
  const src = decodePng(new Uint8Array(readFileSync('samples/codex/knight-walk-pixel.png')));
  const c = crop(removeBackground(src, autoBgOptions(src, 'pixel'), 'pixel'), { x: 0, y: 0, w: 512, h: 512 });
  const g = core.gridForScale(c, 7)!;

  it('is identical across calls', () => {
    const a = downscaleDominant(c, g), b = downscaleDominant(c, g);
    expect(Buffer.from(a.data).equals(Buffer.from(b.data))).toBe(true);
  });

  it('agrees with the WASM version where the WASM version agrees with itself (only ties differ)', () => {
    const ours = downscaleDominant(c, g, 0.05);
    const run = () => w.downscale_grid_packed(new Uint8Array(c.data.buffer), c.width, c.height, g.periodX, g.periodY, g.offsetX, g.offsetY, 3, 0.05);
    const runs = Array.from({ length: 6 }, run);
    const dv = new DataView(runs[0].buffer, runs[0].byteOffset);
    expect([ours.width, ours.height]).toEqual([dv.getUint32(0, true), dv.getUint32(4, true)]);
    let stable = 0, agree = 0;
    for (let i = 8; i < runs[0].length; i += 4) {
      const px = (r: Uint8Array) => r.subarray(i, i + 4).join();
      if (!runs.every((r) => px(r) === px(runs[0]))) continue; // a tie cell: WASM itself is not stable here
      stable++;
      if (px(runs[0]) === Array.from(ours.data.subarray(i - 8, i - 4)).join()) agree++;
    }
    expect(stable).toBeGreaterThan(100);
    expect(agree / stable).toBeGreaterThan(0.97);
  });
});
