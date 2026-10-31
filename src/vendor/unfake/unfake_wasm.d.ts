// Minimal typings for the vendored wasm-bindgen glue (unfake.js, MIT).
export function content_adaptive_packed(rgba: Uint8Array, width: number, height: number, target_w: number, target_h: number): Uint8Array;
export function crop_offset(rgba: Uint8Array, width: number, height: number, scale: number): Uint32Array;
export function detect_auto(rgba: Uint8Array, width: number, height: number): number;
export function detect_grid(rgba: Uint8Array, width: number, height: number): Float64Array;
export function detect_runs(rgba: Uint8Array, width: number, height: number): number;
export function detect_tiled(rgba: Uint8Array, width: number, height: number): number;
export function downscale_grid_packed(
  rgba: Uint8Array, width: number, height: number,
  period_x: number, period_y: number, offset_x: number, offset_y: number,
  method: number, dom_threshold: number,
): Uint8Array;
export function downscale_rgba_packed(rgba: Uint8Array, width: number, height: number, scale: number, method: number, dom_threshold: number, align_grid: number): Uint8Array;
export function elastic_bounds_vec(rgba: Uint8Array, width: number, height: number, period_x: number, period_y: number, offset_x: number, offset_y: number): Float64Array;
export function grid_for_scale_vec(rgba: Uint8Array, width: number, height: number, scale: number): Float64Array;
export function morph_cleanup_packed(rgba: Uint8Array, width: number, height: number): Uint8Array;
export function quantize_packed(rgba: Uint8Array, width: number, height: number, max_colors: number, fixed: Uint8Array): Uint8Array;
export function initSync(opts: { module: BufferSource | WebAssembly.Module }): unknown;
export default function init(opts?: { module_or_path?: string | URL | Request | BufferSource | WebAssembly.Module }): Promise<unknown>;
