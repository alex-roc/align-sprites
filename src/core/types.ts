// Shared contracts for the processing core. Pure TypeScript: no DOM, so every
// module runs in a Web Worker and in Vitest (Node) alike.

/** Straight (non-premultiplied) RGBA8 image, row-major. */
export interface RGBAImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 'pixel' = pixel art (hard edges, palette, nearest). 'cartoon' = smooth 2D art (antialiased, vector-like). */
export type ArtMode = 'pixel' | 'cartoon';

export type RGBA8 = [number, number, number, number];

// ---------------------------------------------------------------- pixel grid

/** Pixel-art cell grid of an upscaled image. period = source px per art px (may be fractional). */
export interface PixelGrid {
  periodX: number;
  periodY: number;
  offsetX: number;
  offsetY: number;
}

export type DsMethod = 'nearest' | 'median' | 'mode' | 'dominant' | 'mean';

// ---------------------------------------------------------------- background

export interface BgOptions {
  /** Background colour, or 'auto' = most common border colour. */
  color: 'auto' | RGBA8;
  /** Colour distance threshold (ΔE in CIELab, ~0..100). Typical 12-25. */
  tolerance: number;
  /**
   * 'global' = every pixel close to bg becomes transparent (best for magenta/green keys, also empties holes).
   * 'flood' = only bg-coloured regions connected to the border.
   * 'flood+holes' = flood, plus enclosed bg-coloured holes larger than `minHole` px.
   */
  strategy: 'global' | 'flood' | 'flood+holes';
  minHole?: number;
  /** Cartoon only: soft alpha ramp between ΔE `inner` (fully transparent) and `outer` (fully opaque). */
  soft?: { inner: number; outer: number };
  /** Cartoon only: un-mix the background colour from semi-transparent edge pixels. */
  despill?: boolean;
}

// ---------------------------------------------------------------- segmentation

export interface FrameRegion {
  rect: Rect;
  row: number;
  col: number;
}

export type Segmentation =
  | { kind: 'grid'; rows: number; cols: number }
  | { kind: 'auto'; expected?: number }
  | { kind: 'single' }
  | { kind: 'manual'; regions: FrameRegion[] };

// ---------------------------------------------------------------- measure

export interface FrameMetrics {
  /** Bounding box of opaque pixels (alpha >= alphaMin) inside the frame image. */
  bbox: Rect;
  /** y of the feet: last row with >= minRowPx opaque pixels. */
  footY: number;
  /** Horizontal anchor (x). Default: weighted median of the alpha column histogram. */
  anchorX: number;
}

export type AnchorXMethod = 'medianColumn' | 'centroid' | 'bboxCenter';

// ---------------------------------------------------------------- pipeline

export type ScalePolicy =
  /** Pixel art: 1 art pixel = 1 output pixel. Cartoon: keep source size. */
  | { kind: 'native' }
  /** Reference character height in output px (shared by every asset in a batch); relative = per-asset multiplier (boss = 1.5). */
  | { kind: 'targetHeight'; px: number; relative?: number };

export interface AnimSpec {
  name: string;
  /** Indices into the detected frame list (reading order). */
  frames: number[];
  fps: number;
  loop: boolean;
  /** Mirror every frame horizontally around the anchor (e.g. a left-facing copy of a right-facing walk). */
  flipX?: boolean;
}

/** What one uploaded image is: a sheet with several frames, or a single sprite (one frame). */
export type SpriteKind = 'sheet' | 'single';

/** Manual per-frame nudge in output px, applied when packing (fixes a frame that "jumps"). */
export interface FrameOffset {
  dx: number;
  dy: number;
}

export interface CellSpec {
  w: number;
  h: number;
  /** Empty px kept below the feet. */
  padBottom: number;
}

export interface SpriteJob {
  name: string;
  source: RGBAImage;
  mode: ArtMode;
  bg: BgOptions;
  segmentation: Segmentation;
  /** Empty = one animation "default" with all frames. */
  animations: AnimSpec[];
  /** 'auto' = smallest multiple of 32 (each axis) that fits every frame. */
  cell: CellSpec | 'auto';
  scale: ScalePolicy;
  /** Pixel mode: max palette colours (shared across the batch). 0/undefined = no quantization. */
  maxColors?: number;
  anchorX?: AnchorXMethod;
  /** Pixel mode: override the detected source pixel period (source px per art px). */
  manualPeriod?: number;
  /** Per-frame nudges keyed by detected frame index. */
  frameOffsets?: Record<number, FrameOffset>;
  /**
   * Fixed palette shared by the batch (and the tiles of a kit). When set it wins over maxColors: every opaque
   * pixel is remapped to the nearest colour of this palette.
   */
  palette?: RGBA8[];
  /** Colour swap applied last, '#rrggbb' → '#rrggbb' (palette variants: enemies, teams). */
  colorMap?: Record<string, string>;
}

export interface PackedAnim {
  name: string;
  row: number;
  count: number;
  fps: number;
  loop: boolean;
}

export interface PackedSheet {
  image: RGBAImage;
  cell: { w: number; h: number };
  cols: number;
  rows: number;
  padBottom: number;
  anims: PackedAnim[];
  mode: ArtMode;
}

export interface SpriteDiag {
  grid?: PixelGrid;
  /** Output px per source px actually applied. */
  scale: number;
  /** Reference (median) character height in output px. */
  refHeight: number;
  metrics: FrameMetrics[];
  regions: FrameRegion[];
  palette?: RGBA8[];
  warnings: Warning[];
}

/** Warnings carry an i18n key + params so the UI can translate them. */
export interface Warning {
  key: string;
  params?: Record<string, string | number>;
}

export interface SpriteResult {
  name: string;
  sheet: PackedSheet;
  /** Each normalized frame (cell-sized), in sheet order. */
  frames: RGBAImage[];
  diag: SpriteDiag;
}

// ---------------------------------------------------------------- export

export interface ExportFile {
  path: string;
  data: Uint8Array | string;
}

export type ExportTarget = 'godot' | 'gdevelop' | 'kaplay' | 'generic';

// ---------------------------------------------------------------- tiles

export type TileLayout = 'blob47' | 'dual16';

export interface EdgeStyle {
  /** Erosion radius in px (how far B retreats from the cell border). */
  margin: number;
  blur: number;
  noiseAmp: number;
  /** Noise cells per tile (value-noise frequency). */
  noiseCells: number;
  seed: number;
  outline?: RGBA8 | 'auto';
}

export type GodotPeeringBit =
  | 'top_side'
  | 'top_right_corner'
  | 'right_side'
  | 'bottom_right_corner'
  | 'bottom_side'
  | 'bottom_left_corner'
  | 'left_side'
  | 'top_left_corner';

export interface TileInfo {
  col: number;
  row: number;
  /** Neighbour mask (blob: N=1 NE=2 E=4 SE=8 S=16 SW=32 W=64 NW=128; dual: TL=1 TR=2 BL=4 BR=8). */
  mask: number;
  /** Terrain of the tile centre for Godot: -1 none, 0, 1. */
  terrain: -1 | 0 | 1;
  bits: Partial<Record<GodotPeeringBit, 0 | 1>>;
}

export interface TileSetResult {
  atlas: RGBAImage;
  tiles: TileInfo[];
  tileSize: number;
  layout: TileLayout;
  cols: number;
  rows: number;
  warnings: Warning[];
}
