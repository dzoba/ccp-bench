export function cosine(a: number[], b: number[]) {
  if (
    !a.length ||
    a.length !== b.length ||
    [...a, ...b].some((n) => !Number.isFinite(n))
  )
    throw new Error('Invalid embedding dimensions or values');
  const norm = (v: number[]) => Math.sqrt(v.reduce((n, x) => n + x * x, 0));
  const denominator = norm(a) * norm(b);
  if (!denominator) throw new Error('Zero embedding vector');
  return Math.max(
    -1,
    Math.min(1, a.reduce((n, x, i) => n + x * b[i]!, 0) / denominator),
  );
}
export function centroid(vectors: number[][]) {
  if (!vectors.length || vectors.some((v) => v.length !== vectors[0]!.length))
    throw new Error('Incompatible embeddings');
  return vectors[0]!.map(
    (_, i) => vectors.reduce((n, v) => n + v[i]!, 0) / vectors.length,
  );
}
export function combinedDivergence(
  cosineDistance: number,
  judgeDisagreementRate: number,
) {
  if (
    cosineDistance < 0 ||
    cosineDistance > 2 ||
    judgeDisagreementRate < 0 ||
    judgeDisagreementRate > 1
  )
    throw new Error('Invalid divergence range');
  return 0.5 * (cosineDistance / 2) + 0.5 * judgeDisagreementRate;
}
