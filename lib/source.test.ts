import { describe, expect, it } from 'vitest';
import { sourceLabel, sourceProps } from './source';

describe('visit source', () => {
  it('keeps only the referring host, and treats own site and empty as direct', () => {
    expect(sourceProps('https://www.reddit.com/r/puzzles/comments/abc', '', 'riddlerr.com')).toEqual({ referrer: 'reddit.com' });
    expect(sourceProps('https://riddlerr.com/results', '', 'riddlerr.com')).toEqual({ referrer: 'direct' });
    expect(sourceProps('', '', 'riddlerr.com')).toEqual({ referrer: 'direct' });
    expect(sourceProps('not a url', '', 'riddlerr.com')).toEqual({ referrer: 'direct' });
  });

  it('reads UTM tags, capped', () => {
    const p = sourceProps('', `?utm_source=newsletter&utm_medium=email&utm_campaign=${'x'.repeat(100)}&other=1`, 'riddlerr.com');
    expect(p.utm_source).toBe('newsletter');
    expect(p.utm_medium).toBe('email');
    expect(p.utm_campaign).toHaveLength(60);
    expect(p).not.toHaveProperty('other');
  });

  it('labels a visit by utm_source, else referrer', () => {
    expect(sourceLabel({ referrer: 'reddit.com', utm_source: 'tw' })).toBe('utm: tw');
    expect(sourceLabel({ referrer: 'reddit.com' })).toBe('reddit.com');
    expect(sourceLabel({})).toBe('unknown');
  });
});
