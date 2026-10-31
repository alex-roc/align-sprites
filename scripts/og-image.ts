// Builds public/og.png (1200×630 social preview) from tools/og/og.html: the real AI sheet next to the tool's own
// normalized run cycle. node scripts/og-image.ts   (needs the Playwright Chromium: pnpm exec playwright install chromium)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { autoBgOptions } from '../src/core/bg/index.ts';
import { decodePng, encodePng } from '../src/core/export/index.ts';
import { crop } from '../src/core/image.ts';
import { runBatch } from '../src/core/pipeline/index.ts';
import { unfakeFromBytes } from '../src/core/pixel/unfake.ts';

const root = new URL('../', import.meta.url);
const core = unfakeFromBytes(new Uint8Array(readFileSync(new URL('src/vendor/unfake/unfake_wasm_bg.wasm', root))));
const source = decodePng(new Uint8Array(readFileSync(new URL('public/examples/hero-run.png', root))));
const [r] = runBatch(core, [{
  name: 'hero-run', source, mode: 'pixel', bg: autoBgOptions(source, 'pixel'), segmentation: { kind: 'auto' },
  animations: [], cell: 'auto', scale: { kind: 'targetHeight', px: 64 },
}]);
const FRAMES = 4;
const { cell } = r.sheet;
for (let i = 0; i < FRAMES; i++) {
  writeFileSync(new URL(`tools/og/after-${i}.png`, root), encodePng(crop(r.sheet.image, { x: i * cell.w, y: 0, w: cell.w, h: cell.h })));
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(new URL(`tools/og/og.html?n=${FRAMES}`, root).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
await page.screenshot({ path: fileURLToPath(new URL('public/og.png', root)) });
await browser.close();
console.log('public/og.png', `cell ${cell.w}x${cell.h}`);
