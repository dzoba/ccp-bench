import type { Model } from '@ccp-bench/schema';
import { AnthropicProvider } from './anthropic';
import { GoogleProvider } from './google';
import { MockProvider } from './mock';
import { OpenAICompatibleProvider } from './openai-compatible';
import type { Provider } from './types';

const endpoints: Record<string, [string, string]> = {
  openrouter: ['https://openrouter.ai/api/v1', 'OPENROUTER_API_KEY'],
  openai: ['https://api.openai.com/v1', 'OPENAI_API_KEY'],
  deepseek: ['https://api.deepseek.com', 'DEEPSEEK_API_KEY'],
  moonshot: ['https://api.moonshot.ai/v1', 'MOONSHOT_API_KEY'],
  zhipu: ['https://api.z.ai/api/paas/v4', 'ZHIPU_API_KEY'],
  minimax: ['https://api.minimax.io/v1', 'MINIMAX_API_KEY'],
  together: ['https://api.together.xyz/v1', 'TOGETHER_API_KEY'],
  fireworks: ['https://api.fireworks.ai/inference/v1', 'FIREWORKS_API_KEY'],
  vllm: ['http://localhost:8000/v1', 'VLLM_API_KEY'],
  mistral: ['https://api.mistral.ai/v1', 'MISTRAL_API_KEY'],
  xai: ['https://api.x.ai/v1', 'XAI_API_KEY'],
};
export function createProvider(model: Model, timeout?: number): Provider {
  const endpoint = model.endpoint;
  if (endpoint.provider === 'mock') return new MockProvider();
  const keyName =
    endpoint.key_env ??
    (endpoint.provider === 'anthropic'
      ? 'ANTHROPIC_API_KEY'
      : endpoint.provider === 'google'
        ? 'GOOGLE_API_KEY'
        : endpoints[endpoint.provider]?.[1]);
  const key = keyName ? process.env[keyName] : undefined;
  if (!key && endpoint.provider !== 'vllm')
    throw new Error(
      `Missing credential ${keyName ?? `${endpoint.provider} key_env`}`,
    );
  if (endpoint.provider === 'anthropic')
    return new AnthropicProvider(key!, timeout);
  if (endpoint.provider === 'google') return new GoogleProvider(key!, timeout);
  const url =
    endpoint.base_url ??
    (endpoint.provider === 'vllm' ? process.env.VLLM_BASE_URL : undefined) ??
    endpoints[endpoint.provider]?.[0];
  if (!url) throw new Error(`Configure base_url for ${endpoint.provider}`);
  return new OpenAICompatibleProvider(
    endpoint.provider,
    url.replace(/\/$/, ''),
    key ?? '',
    timeout,
  );
}
export async function verifyModels(
  models: Model[],
  factory = createProvider,
): Promise<void> {
  const lists = new Map<string, string[]>();
  for (const model of models) {
    const provider = factory(model);
    let ids = lists.get(provider.cache_identity);
    if (!ids) {
      ids = await provider.listModels();
      lists.set(provider.cache_identity, ids);
    }
    if (!ids.includes(model.endpoint.model))
      throw new Error(
        `Model ${model.endpoint.model} is unavailable on ${provider.id}. Current models:\n${ids.join('\n')}`,
      );
  }
}
