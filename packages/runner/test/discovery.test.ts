import { expect, it } from 'vitest';
import { cosine, centroid, combinedDivergence } from '../src/discover/math';
it('combines normalized semantic distance and material-claim disagreements without treating them as truth scores', () => {
  expect(cosine([1, 0], [1, 0])).toBe(1);
  expect(cosine([1, 0], [0, 1])).toBe(0);
  expect(cosine([1, 0], [-1, 0])).toBe(-1);
  expect(
    centroid([
      [1, 0],
      [0, 1],
    ]),
  ).toEqual([0.5, 0.5]);
  expect(combinedDivergence(1, 0.5)).toBe(0.5);
  expect(combinedDivergence(0, 0)).toBe(0);
  expect(combinedDivergence(2, 1)).toBe(1);
  expect(() => cosine([0, 0], [1, 0])).toThrow('Zero');
  expect(() => cosine([1], [1, 0])).toThrow('dimensions');
});
