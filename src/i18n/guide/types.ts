// Shape of the Guide tab content. en.ts is the source; es.ts must have exactly the same structure
// (tests/guide-i18n.test.ts compares keys, block types, list lengths and the non-translatable fields).
//
// Inline markup inside any string: `code`, **bold**, [label](#/guide/<section>) for links inside the guide.

export const SECTION_IDS = [
  'how-it-works', 'generate', 'normalize', 'godot', 'gdevelop', 'kaplay', 'other', 'world', 'items', 'kit', 'troubleshooting', 'glossary',
] as const;
export type SectionId = (typeof SECTION_IDS)[number];

/** Where an action button goes: hash routes of the other tabs. */
export type ActionTarget = 'sprites' | 'ai' | 'world' | 'items' | 'kit';

export interface DiagramStep { title: string; text: string }
export interface Legend { tone: 'key' | 'ground'; text: string }
export interface FigureItem { src: string; alt: string; caption: string; pixelated?: boolean; zoom?: number; backdrop?: 'checker' | 'plain' }

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h3'; id: string; text: string }
  | { type: 'ul'; items: string[] }
  /** Numbered steps: only where order matters. */
  | { type: 'steps'; items: string[] }
  | { type: 'callout'; title: string; text: string }
  | { type: 'code'; lang: 'gdscript' | 'js'; title: string; code: string }
  | { type: 'table'; head: string[]; rows: string[][] }
  | { type: 'dl'; items: { term: string; text: string }[] }
  | { type: 'figures'; items: FigureItem[] }
  /** A real AI sheet with the defects measured on it. */
  | { type: 'example'; item: FigureItem; title: string; facts: string[] }
  | { type: 'diagram'; steps: DiagramStep[]; legend: Legend[] }
  | { type: 'compare'; asset: 'wizard'; label: string; before: string; after: string; beforeAlt: string; afterAlt: string; caption: string }
  | { type: 'sameHeight'; label: string; raw: string; same: string; knight: string; wizard: string; ground: string; caption: string }
  | { type: 'actions'; items: { to: ActionTarget; label: string }[] };

export interface GuideSection {
  id: SectionId;
  /** Heading and index entry. */
  title: string;
  blocks: Block[];
}

export interface GuideContent {
  /** One-line lede above the first section. */
  lede: string;
  ui: {
    indexLabel: string;
    jumpTo: string;
    copy: string;
    copied: string;
  };
  sections: GuideSection[];
  reference: { text: string; link: string; href: string };
  /** Attribution at the very end (not in the index). Strings use the inline markup, links included. */
  credits: { title: string; lines: string[] };
}
