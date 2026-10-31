// Tile tools (phase 2): atlas normalizer and terrain transition compositor.
export {
  detectTileGrid, gridCutsFor, normalizeTileAtlas, tileAtlasGodot, tileAtlasTiled,
  type TileGrid, type TileAtlasOptions, type TileAtlasResult,
} from './atlas.ts';
export {
  BLOB47_MASKS, BLOB_A_POS, DUAL16_POS, blobBits, blobMaskAt, blobPos, composeTransitions, defaultEdgeStyle, dualBits,
  godotTerrainTileSet, makeSeamlessTile, prepareTerrain, renderTerrainMap, seamScore, terrainExport,
  type TerrainKit,
} from './terrain.ts';
