import { describe, expect, it } from 'vitest';
import { hrefFor, parseHash, worldTool } from '../src/ui/lib/routes.ts';

describe('hash routes', () => {
  it('parses the tabs, with sprites as the default', () => {
    expect(parseHash('')).toEqual({ tab: 'sprites', section: undefined });
    expect(parseHash('#/items')).toEqual({ tab: 'items', section: undefined });
    expect(parseHash('#/kit')).toEqual({ tab: 'kit', section: undefined });
    expect(parseHash('#/nope')).toEqual({ tab: 'sprites', section: undefined });
  });

  it('keeps the World tool in the route', () => {
    expect(parseHash('#/world/parallax')).toEqual({ tab: 'world', section: 'parallax' });
    expect(worldTool('parallax')).toBe('parallax');
    expect(worldTool(undefined)).toBe('sheet');
    expect(worldTool('nope')).toBe('sheet');
    expect(hrefFor('world', 'terrain')).toBe('#/world/terrain');
  });

  it('still opens World from old #/tiles links, in the app and in the guide', () => {
    expect(parseHash('#/tiles')).toEqual({ tab: 'world', section: undefined });
    expect(parseHash('#/guide/tiles')).toEqual({ tab: 'guide', section: 'world' });
    expect(parseHash('#/guide/parallax')).toEqual({ tab: 'guide', section: 'parallax' });
  });

  it('ignores sections on tabs that have none', () => {
    expect(parseHash('#/items/x')).toEqual({ tab: 'items', section: undefined });
  });
});
