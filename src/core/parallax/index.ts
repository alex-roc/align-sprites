// Parallax backgrounds (Tiles tab): looping layers at the game height + per-engine exports.
export { ALREADY_LOOPS, LOOP_WARN, bandFor, bestLoop, findSeam, floatingArea, floatingCount, loopScore, makeLoop } from './loop.ts';
export {
  buildParallax, defaultFactors, layerRoles, wantsCutout,
  type LoopInfo, type ParallaxInput, type ParallaxLayer, type ParallaxOptions, type ParallaxResult,
} from './build.ts';
export { parallaxExport, parallaxGdevelop, parallaxGeneric, parallaxGodot, parallaxKaplay } from './export.ts';
