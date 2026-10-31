// "Try an example" assets served from public/examples (copies of samples/real).
import type { MessageKey } from '../../i18n/index.ts';

export interface Example {
  id: string;
  /** Several files load together as one batch (same size for all). */
  files: string[];
  labelKey: MessageKey;
}

/** The type (sprite sheet or single sprite) is detected on upload like for any other image. */
export const EXAMPLES: Example[] = [
  // All made with the "Make with AI" prompts + guide images (samples/codex/README.md, second and third batch).
  { id: 'run', files: ['hero-run.png'], labelKey: 'upload.exampleRun' },
  { id: 'single', files: ['hero.png'], labelKey: 'upload.exampleSingle' },
  { id: 'hero', files: ['hero.png', 'hero-idle.png', 'hero-run.png', 'hero-jump.png'], labelKey: 'upload.exampleHero' },
];

export async function fetchExample(ex: Example): Promise<{ name: string; blob: Blob }[]> {
  return Promise.all(ex.files.map(async (file) => ({ name: file, blob: await fetchPublicImage(file) })));
}

/** Fetch any image shipped in public/examples. */
export async function fetchPublicImage(file: string): Promise<Blob> {
  const res = await fetch(`${import.meta.env.BASE_URL}examples/${file}`);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return res.blob();
}
