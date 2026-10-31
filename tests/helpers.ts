// Test helpers: load the unfake WASM core synchronously in Node, write debug PNGs.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { decode, encode } from 'fast-png';
import { unfakeFromBytes, type UnfakeCore } from '../src/core/pixel/unfake.ts';
import type { RGBAImage } from '../src/core/types.ts';

const wasmPath = fileURLToPath(new URL('../src/vendor/unfake/unfake_wasm_bg.wasm', import.meta.url));

export function loadUnfake(): UnfakeCore {
  return unfakeFromBytes(new Uint8Array(readFileSync(wasmPath)));
}

/** Write a PNG under tests/out/ for eyeballing (ignored by git). */
export function debugPng(name: string, img: RGBAImage): void {
  const dir = fileURLToPath(new URL('./out/', import.meta.url));
  mkdirSync(dir, { recursive: true });
  writeFileSync(dir + name + '.png', encode({ width: img.width, height: img.height, data: new Uint8Array(img.data.buffer), channels: 4 }));
}

/** Load a PNG from disk as straight RGBA8 (expands grey/RGB/16-bit). Path relative to the repo root. */
export function loadPng(relPath: string): RGBAImage {
  const d = decode(readFileSync(fileURLToPath(new URL('../' + relPath, import.meta.url))));
  const n = d.width * d.height;
  const data = new Uint8ClampedArray(n * 4);
  const ch = d.channels;
  const src = d.data as ArrayLike<number>;
  const div = d.depth === 16 ? 257 : 1;
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 3; k++) data[i * 4 + k] = src[i * ch + (ch >= 3 ? k : 0)] / div;
    data[i * 4 + 3] = ch === 4 || ch === 2 ? src[i * ch + ch - 1] / div : 255;
  }
  return { width: d.width, height: d.height, data };
}
