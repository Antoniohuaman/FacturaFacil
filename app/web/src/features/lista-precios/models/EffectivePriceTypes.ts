export type EffectivePriceSource = 'explicit' | 'global-rule' | 'none';

export interface EffectivePriceResult {
  value?: number;
  source: EffectivePriceSource;
}

export type EffectivePriceMatrix = Record<string, Record<string, Record<string, EffectivePriceResult>>>;

