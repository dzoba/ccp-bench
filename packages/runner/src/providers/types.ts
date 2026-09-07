import type { GenerateRequest, GenerateResponse } from '@ccp-bench/schema';
export interface Provider {
  id: string;
  cache_identity: string;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  listModels(): Promise<string[]>;
}
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retry_after_ms?: number,
    readonly filtered = false,
    readonly raw?: unknown,
  ) {
    super(message);
  }
}
export const isTruncated = (response: GenerateResponse): boolean =>
  ['length', 'max_tokens', 'MAX_TOKENS', 'max_output_tokens'].includes(
    response.finish_reason,
  );
