import {
  SamplingSchema,
  type GenerateResponse,
  type Item,
  type Model,
  type Prices,
  type RunConfig,
} from '@ccp-bench/schema';

export function samplingFor(model: Model, config: RunConfig) {
  return SamplingSchema.parse({ ...model.recommended, ...config.sampling });
}
export function responseCost(
  response: GenerateResponse,
  model: Model,
  prices: Prices,
): number {
  if (response.provider_cost !== undefined) return response.provider_cost;
  const price = prices[model.key];
  if (!price) throw new Error(`Missing prices for ${model.key}`);
  return (
    (response.usage.input * price.input_per_million +
      response.usage.output * price.output_per_million) /
    1e6
  );
}
export function estimateRun(
  config: RunConfig,
  models: Model[],
  items: Item[],
  prices: Prices,
) {
  const rows = models.map((model) => {
    const price = prices[model.key];
    if (!price) throw new Error(`Missing prices for ${model.key}`);
    const prompts = items.flatMap((item) =>
      config.languages.flatMap((lang) =>
        item.prompts[lang] ? [item.prompts[lang]!] : [],
      ),
    );
    const calls = prompts.length * config.samples_per_item;
    const estimatedInput =
      prompts.reduce(
        (n, prompt) =>
          n +
          Math.ceil(Buffer.byteLength(prompt + config.system_prompt) / 3) +
          20,
        0,
      ) * config.samples_per_item;
    const outputCap = calls * samplingFor(model, config).max_tokens;
    return {
      model_key: model.key,
      calls,
      estimated_input_tokens: estimatedInput,
      maximum_output_tokens: outputCap,
      projected_usd:
        (estimatedInput * price.input_per_million +
          calls * 600 * price.output_per_million) /
        1e6,
      token_cap_estimate_usd:
        (estimatedInput * price.input_per_million +
          outputCap * price.output_per_million) /
        1e6,
    };
  });
  return {
    rows,
    calls: rows.reduce((n, r) => n + r.calls, 0),
    projected_usd: rows.reduce((n, r) => n + r.projected_usd, 0),
    token_cap_estimate_usd: rows.reduce(
      (n, r) => n + r.token_cap_estimate_usd,
      0,
    ),
    assumptions:
      'Input tokens estimated from UTF-8 bytes plus chat overhead; projection uses 600 output tokens per response. Token-cap estimate uses configured output maximum. Retries, provider price changes, and judging are additional.',
  };
}
