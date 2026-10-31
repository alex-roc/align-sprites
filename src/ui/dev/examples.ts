// "Try an example" assets served from public/examples (copies of samples/real).
import type { MessageKey } from '../../i18n/index.ts';

export interface Example {
  id: string;
  file: string;
  labelKey: MessageKey;
}

/** The type (sprite sheet or single sprite) is detected on upload like for any other image. */
export const EXAMPLES: Example[] = [
  { id: 'run', file: 'run-cycle.png', labelKey: 'upload.exampleRun' },
  { id: 'single', file: 'single-character.png', labelKey: 'upload.exampleSingle' },
];

export async function fetchExample(ex: Example): Promise<{ name: string; blob: Blob }> {
  const res = await fetch(`${import.meta.env.BASE_URL}examples/${ex.file}`);
  if (!res.ok) throw new Error(`${ex.file}: HTTP ${res.status}`);
  return { name: ex.file, blob: await res.blob() };
}

/** Fetch any image shipped in public/examples. */
export async function fetchPublicImage(file: string): Promise<Blob> {
  const res = await fetch(`${import.meta.env.BASE_URL}examples/${file}`);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return res.blob();
}
