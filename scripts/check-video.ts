// End-to-end check of "video to frames": drops samples/video/hero-run-magenta.webm in the Sprites tab, finds the loop,
// adds the frames and waits for the processed asset. Screenshots go to .playwright-mcp/video/.
//   with a dev server running (pnpm dev):   PORT=5173 node scripts/check-video.ts
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = new URL('../', import.meta.url);
const out = fileURLToPath(new URL('.playwright-mcp/video/', root));
mkdirSync(out, { recursive: true });
const port = process.env.PORT ?? '5173';
const video = fileURLToPath(new URL('samples/video/hero-run-magenta.webm', root));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto(`http://localhost:${port}/align-sprites/#/sprites`);
await page.setInputFiles('input[type=file]', video);

const dialog = page.locator('dialog.video-dialog');
await dialog.waitFor();
await page.waitForFunction(() => document.querySelectorAll('.video-thumbs canvas').length === 8, null, { timeout: 30_000 });
await page.waitForTimeout(500);
await page.screenshot({ path: out + '1-dialog.png' });

await dialog.getByRole('button', { name: /find the loop/i }).click();
await dialog.locator('[role=status]').waitFor({ timeout: 60_000 });
const note = await dialog.locator('[role=status]').innerText();
console.log('loop:', note);
await page.waitForTimeout(2500);
await page.screenshot({ path: out + '2-loop.png' });

await dialog.getByRole('button', { name: /^add \d+ frames/i }).click();
await dialog.waitFor({ state: 'detached' });
await page.waitForSelector('.assetbar .asset');
await page.waitForFunction(() => /\d+ frames/.test(document.querySelector('.asset-kind')?.textContent ?? ''), null, { timeout: 30_000 });
console.log('asset:', await page.locator('.asset-name').inputValue(), '|', await page.locator('.asset-kind').innerText());
await page.waitForTimeout(2500);
await page.screenshot({ path: out + '3-asset.png' });
await browser.close();
