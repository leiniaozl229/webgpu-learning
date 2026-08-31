import { describe, expect, it } from 'vitest';

import { doubleValuesOnGpu, parseNumberList } from './compute';

describe('parseNumberList', () => {
  it('accepts commas, Chinese commas and whitespace', () => {
    expect(parseNumberList('1, 2，3\n4')).toEqual([1, 2, 3, 4]);
  });

  it('rejects empty and non-finite values', () => {
    expect(() => parseNumberList('')).toThrow('至少输入一个数字');
    expect(() => parseNumberList('1, nope')).toThrow('无法转换');
    expect(() => parseNumberList('Infinity')).toThrow('无法转换');
  });

  it('validates the public GPU entry point before requesting a device', async () => {
    await expect(doubleValuesOnGpu(Array.from({ length: 257 }, () => 1))).rejects.toThrow('最多计算 256');
    await expect(doubleValuesOnGpu([1, Number.NaN])).rejects.toThrow('有限数字');
  });
});
