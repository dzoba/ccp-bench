import { ProviderError } from './types';

export async function requestJson(
  url: string,
  init: RequestInit,
  timeout: number,
): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeout),
  });
  const text = await response.text();
  if (!response.ok) {
    const filtered =
      /content[_ -]?filter|content[_ -]?policy|safety|moderation|sensitive[_ -]?content/i.test(
        text,
      ) && [400, 403, 451].includes(response.status);
    const retry = response.headers.get('retry-after');
    const seconds = retry ? Number(retry) : NaN;
    const retryMs = Number.isFinite(seconds)
      ? seconds * 1000
      : retry
        ? Math.max(0, Date.parse(retry) - Date.now())
        : undefined;
    // Do not include raw error text, which may contain echoed prompts or credentials.
    throw new ProviderError(
      `HTTP ${response.status}${filtered ? ' content filter' : ''}`,
      response.status,
      retryMs,
      filtered,
      text,
    );
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ProviderError('Provider returned invalid JSON', 502);
  }
}
