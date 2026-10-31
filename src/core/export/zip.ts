// ZIP packing (fflate). PNGs are already deflated: store them; deflate the text files.
import { zipSync, strToU8, type Zippable } from 'fflate';
import type { ExportFile } from '../types.ts';

export function zipFiles(files: ExportFile[]): Uint8Array {
  const tree: Zippable = {};
  for (const f of files) {
    const isPng = f.path.toLowerCase().endsWith('.png');
    const data = typeof f.data === 'string' ? strToU8(f.data) : f.data;
    tree[f.path] = [data, { level: isPng ? 0 : 6 }];
  }
  return zipSync(tree);
}
