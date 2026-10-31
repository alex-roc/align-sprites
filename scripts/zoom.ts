// Dev helper: nearest-neighbour zoom of a PNG for inspection. node scripts/zoom.ts in.png out.png 4
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from '../src/core/export/index.ts';
import { resizeNearest } from '../src/core/image.ts';
const [inp, out, z = '4'] = process.argv.slice(2);
const img = decodePng(new Uint8Array(readFileSync(inp)));
writeFileSync(out, encodePng(resizeNearest(img, img.width * +z, img.height * +z)));
