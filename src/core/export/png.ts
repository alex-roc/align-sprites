// PNG encode/decode over fast-png. Decode always returns straight RGBA8.
import { decode, encode, convertIndexedToRgb } from 'fast-png';
import type { RGBAImage } from '../types.ts';

/** PNG encode (RGBA, 8 bit). */
export function encodePng(img: RGBAImage): Uint8Array {
  const data = new Uint8Array(img.data.buffer, img.data.byteOffset, img.data.byteLength);
  return encode({ width: img.width, height: img.height, data, channels: 4, depth: 8 });
}

/** PNG decode → straight RGBA8 (expands grey / grey+alpha / RGB / palette / 16-bit, honours tRNS). */
export function decodePng(bytes: Uint8Array): RGBAImage {
  const png = decode(bytes);
  const { width, height, depth } = png;
  const out = new Uint8ClampedArray(width * height * 4);
  const max = (1 << depth) - 1;
  let samples: ArrayLike<number>;
  let channels = png.channels;
  let maxSample = max;

  if (png.palette) {
    // Palette entries are RGB or RGBA depending on whether a tRNS chunk existed.
    samples = convertIndexedToRgb(png);
    channels = png.palette[0]?.length ?? 3;
    maxSample = 255;
  } else if (depth < 8) {
    // Sub-byte grey: rows are bit-packed and padded to a byte boundary.
    const unpacked = new Uint8Array(width * height * channels);
    const rowBytes = Math.ceil((width * channels * depth) / 8);
    for (let y = 0; y < height; y++) {
      for (let i = 0; i < width * channels; i++) {
        const bitPos = i * depth;
        const byte = png.data[y * rowBytes + (bitPos >> 3)] ?? 0;
        unpacked[y * width * channels + i] = (byte >> (8 - depth - (bitPos & 7))) & max;
      }
    }
    samples = unpacked;
  } else {
    samples = png.data;
  }

  const trns = png.palette ? undefined : png.transparency;
  const scale = (v: number): number => (maxSample === 255 ? v : Math.round((v * 255) / maxSample));
  for (let p = 0; p < width * height; p++) {
    const s = p * channels;
    const o = p * 4;
    if (channels <= 2) {
      const g = scale(samples[s] ?? 0);
      out[o] = out[o + 1] = out[o + 2] = g;
      out[o + 3] = channels === 2 ? scale(samples[s + 1] ?? 255) : trns && samples[s] === trns[0] ? 0 : 255;
    } else {
      out[o] = scale(samples[s] ?? 0);
      out[o + 1] = scale(samples[s + 1] ?? 0);
      out[o + 2] = scale(samples[s + 2] ?? 0);
      out[o + 3] =
        channels === 4
          ? scale(samples[s + 3] ?? 255)
          : trns && samples[s] === trns[0] && samples[s + 1] === trns[1] && samples[s + 2] === trns[2]
            ? 0
            : 255;
    }
  }
  return { width, height, data: out };
}
