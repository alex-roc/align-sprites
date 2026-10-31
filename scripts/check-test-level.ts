// Browser check of the Kit's test level: loads the hero + the Andes tileset examples, opens the level, and checks that
// a canvas renders and the character moves while a key is held. Needs a dev server:
//   node scripts/check-test-level.ts [http://localhost:5194/align-sprites/]
// Screenshots go to .playwright-mcp/kit/ (ignored).
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:5194/align-sprites/';
const out = fileURLToPath(new URL('../.playwright-mcp/kit/', import.meta.url));
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const fail = (msg: string): never => {
  console.error('FAIL:', msg, errors.length ? `\npage errors: ${errors.join(' | ')}` : '');
  process.exit(1);
};

await page.goto(base + '#/sprites');
await page.evaluate(() => localStorage.setItem('align-sprites.settings', JSON.stringify({ mode: 'pixel', targetHeight: 56 })));
await page.reload();
await page.getByRole('button', { name: /Character \+ idle, run and jump/ }).click();
await page.goto(base + '#/tiles');
await page.getByRole('button', { name: /Andean mountains tileset/ }).click();
await page.waitForTimeout(4000); // the atlas is normalized in the worker
await page.goto(base + '#/kit');

await page.getByRole('heading', { name: 'Test level' }).waitFor({ timeout: 60_000 });
await page.screenshot({ path: out + 'kit.png', fullPage: true });
await page.getByRole('button', { name: 'Play' }).click();
const canvas = page.locator('.level-host canvas');
await canvas.waitFor({ timeout: 30_000 });
await page.waitForFunction(() => document.querySelectorAll('.level-host canvas').length === 1 && !document.body.textContent?.includes('Loading the level'));
const box = await canvas.boundingBox();
if (!box || box.width < 100) fail('canvas has no size');
await page.waitForTimeout(800); // let the character fall onto the floor
const before = await canvas.screenshot({ path: out + 'level-0.png' });
await page.getByLabel('Show the collision box').check();
await page.waitForTimeout(200);
await canvas.screenshot({ path: out + 'level-boxes.png' });
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(1200);
await page.keyboard.up('ArrowRight');
const after = await canvas.screenshot({ path: out + 'level-1.png' });
if (before.equals(after)) fail('the screen did not change while ArrowRight was held');
await page.keyboard.press('Space');
await page.waitForTimeout(250);
await canvas.screenshot({ path: out + 'level-jump.png' });
await page.keyboard.press('Escape');
await page.waitForFunction(() => document.querySelectorAll('.level-host canvas').length === 0);
if (errors.length) fail('console errors');
console.log(`OK: canvas ${Math.round(box.width)}x${Math.round(box.height)} rendered, moved with ArrowRight, closed with Esc`);
await browser.close();
