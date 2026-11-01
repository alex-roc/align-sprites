// Hash routes (pure, no DOM: tested in Node): #/sprites, #/world, #/world/<tool>, #/items, #/kit, #/ai, #/guide, #/guide/<section>.
// Back/forward work for free. The old #/tiles (before World had its own name) still opens World.
export type TabId = 'sprites' | 'world' | 'items' | 'kit' | 'ai' | 'guide';
export const TABS: readonly TabId[] = ['sprites', 'world', 'items', 'kit', 'ai', 'guide'];

/** Tools of the World tab: tile sheet → atlas, terrain transitions, parallax background. */
export type WorldTool = 'sheet' | 'terrain' | 'parallax';
export const WORLD_TOOLS: readonly WorldTool[] = ['sheet', 'terrain', 'parallax'];

/** Old tab ids and guide sections that still resolve, so links shared before a rename keep working. */
const ALIASES: Record<string, TabId> = { tiles: 'world' };
const GUIDE_ALIASES: Record<string, string> = { tiles: 'world' };

export interface Route {
  tab: TabId;
  /** Guide section, or World tool. */
  section?: string;
}

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const tab = TABS.find((t) => t === parts[0]) ?? ALIASES[parts[0] ?? ''] ?? 'sprites';
  const section = tab === 'guide' ? (GUIDE_ALIASES[parts[1] ?? ''] ?? parts[1]) : tab === 'world' ? parts[1] : undefined;
  return { tab, section };
}

/** The World tool of a route section (the tile sheet when missing or unknown). */
export const worldTool = (section?: string): WorldTool => WORLD_TOOLS.find((t) => t === section) ?? 'sheet';

export const hrefFor = (tab: TabId, section?: string): string => `#/${tab}${section ? `/${section}` : ''}`;
