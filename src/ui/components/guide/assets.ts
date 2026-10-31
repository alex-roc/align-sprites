// Images of the guide (public/guide/). Natural sizes let the browser reserve the space before they load,
// so scrolling to a section does not land in the wrong place.
export const IMAGE_SIZES: Record<string, readonly [number, number]> = {
  'guide/fox-before.jpg': [640, 426],
  'guide/knight-before.jpg': [768, 512],
  'guide/knight-after.png': [768, 128],
  'guide/guide-3x2-magenta.png': [768, 512],
  'guide/terrain-blob47.png': [256, 192],
  'guide/terrain-dual16.png': [128, 128],
  'guide/terrain-map.png': [384, 224],
  'guide/tileset-atlas.png': [320, 256],
  'guide/tileset-before.jpg': [720, 480],
  'guide/wizard-before.jpg': [640, 640],
  'guide/wizard-after.png': [64, 64],
};

/** Same-height demo: trimmed frames in art pixels (one frame of the knight and the wizard samples). */
export const HEIGHT_DEMO = {
  raw: {
    knight: { src: 'guide/knight-native.png', w: 48, h: 58 },
    wizard: { src: 'guide/wizard-native.png', w: 49, h: 93 },
  },
  same: {
    knight: { src: 'guide/knight-48.png', w: 41, h: 48 },
    wizard: { src: 'guide/wizard-48.png', w: 26, h: 48 },
  },
} as const;

/** Wizard before/after comparison. */
export const COMPARE_ASSETS = {
  wizard: { before: 'guide/wizard-before.jpg', after: 'guide/wizard-after.png' },
} as const;
