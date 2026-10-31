// Test helpers: load the unfake WASM core synchronously in Node, write debug PNGs.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { encode } from 'fast-png';
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
