import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { decode, encode } from 'fast-png';
import { unfakeFromBytes } from '../src/core/pixel/unfake.ts';
const core = unfakeFromBytes(new Uint8Array(readFileSync('/Users/alexojeda/dev/align-sprites/src/vendor/unfake/unfake_wasm_bg.wasm')));
const out = '/private/tmp/claude-501/-Users-alexojeda-dev-align-sprites/f8352cb7-2644-4201-ae6b-88aca0bdd68a/scratchpad/explore/';
mkdirSync(out, { recursive: true });
function load(p: string) {
  const d = decode(readFileSync(p));
  const n = d.width * d.height; const data = new Uint8ClampedArray(n * 4);
  const ch = d.channels; const src = d.data as any; const max = d.depth === 16 ? 257 : 1;
  for (let i = 0; i < n; i++) { for (let k = 0; k < 3; k++) data[i*4+k] = src[i*ch + (ch>=3?k:0)]/max; data[i*4+3] = ch===4||ch===2 ? src[i*ch+ch-1]/max : 255; }
  return { width: d.width, height: d.height, data };
}
for (const f of process.argv.slice(2)) {
  const img = load('/Users/alexojeda/dev/align-sprites/samples/real/' + f);
  const t = performance.now();
  const g = core.detectGrid(img);
  const ms = performance.now() - t;
  console.log(f, img.width, img.height, JSON.stringify(g), ms.toFixed(0) + 'ms');
  if (g) {
    const s = core.downscaleGrid(img, g, 'dominant');
    console.log('  native', s.width, s.height);
    writeFileSync(out + f.replace(/ /g,'_'), encode({ width: s.width, height: s.height, data: new Uint8Array(s.data.buffer), channels: 4 }));
  }
}
