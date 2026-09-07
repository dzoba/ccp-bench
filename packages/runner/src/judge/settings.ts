import type { JudgeConfig, Model } from '@ccp-bench/schema';
export function judgeTokenLimit(model: Model, config: JudgeConfig): number {
  return config.max_tokens_by_model?.[model.key] ?? config.max_tokens;
}
