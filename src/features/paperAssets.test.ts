import { describe, expect, it } from 'vitest';
import { PAPER_PAGE_COUNT, paperPageUrl } from './paperAssets';

describe('paperPageUrl', () => {
  it('pads the page number to two digits', () => {
    expect(paperPageUrl(3)).toBe('/docs/paper-pages/page-03.webp');
    expect(paperPageUrl(PAPER_PAGE_COUNT)).toBe('/docs/paper-pages/page-14.webp');
  });
});
