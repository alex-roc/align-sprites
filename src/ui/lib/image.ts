// Main-thread image helpers: File/Blob → RGBAImage and RGBAImage → canvas / PNG download.
import type { RGBAImage } from '../../core/types.ts';

/** Refuse absurd images before they blow up the worker (≈ 36 MP). */
const MAX_PIXELS = 36_000_000;

export class ImageTooLargeError extends Error {}

export async function blobToRGBA(blob: Blob): Promise<RGBAImage> {
  const bmp = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  try {
    if (bmp.width * bmp.height > MAX_PIXELS) throw new ImageTooLargeError(`${bmp.width}x${bmp.height}`);
    const canvas = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('2D canvas not available');
    ctx.drawImage(bmp, 0, 0);
    const d = ctx.getImageData(0, 0, bmp.width, bmp.height);
    return { width: d.width, height: d.height, data: d.data };
  } finally {
    bmp.close();
  }
}

export function toImageData(img: RGBAImage): ImageData {
  return new ImageData(img.data as Uint8ClampedArray<ArrayBuffer>, img.width, img.height);
}

export function drawRGBA(canvas: HTMLCanvasElement, img: RGBAImage): void {
  canvas.width = img.width;
  canvas.height = img.height;
  canvas.getContext('2d')?.putImageData(toImageData(img), 0, 0);
}

export function rgbaToCanvas(img: RGBAImage): HTMLCanvasElement {
  const c = document.createElement('canvas');
  drawRGBA(c, img);
  return c;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), type);
  });
}

export function rgbaToPngBlob(img: RGBAImage): Promise<Blob> {
  return canvasToBlob(rgbaToCanvas(img));
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const rgbToHex = (c: readonly number[]): string =>
  '#' + [c[0], c[1], c[2]].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
