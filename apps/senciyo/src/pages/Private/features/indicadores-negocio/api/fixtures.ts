import type { IndicadoresData, IndicadoresFilters } from '../models/indicadores';
import { createEmptyIndicadoresData } from '../models/defaults';

const NETWORK_DELAY_MS = 150;

export const resolveFallbackIndicadores = async (filters: IndicadoresFilters): Promise<IndicadoresData> => {
  void filters;
  await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));
  return createEmptyIndicadoresData();
};
