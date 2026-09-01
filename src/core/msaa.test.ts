import { describe, expect, it } from 'vitest';

import { isMultisampled } from './msaa';

describe('MSAA sample count', () => {
  it('uses a resolve target only for multisampled attachments', () => {
    expect(isMultisampled(1)).toBe(false);
    expect(isMultisampled(4)).toBe(true);
  });
});
