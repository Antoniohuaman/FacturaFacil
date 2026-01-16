import type { IndicadoresData, IndicadoresFilters } from '../models/indicadores';
import { resolveFallbackIndicadores } from './fixtures';
import type { IndicadoresApiResponseDTO } from './types';
import { mapIndicadoresResponse } from './mapper';
import { resolveIndicadoresFromDevLocal } from '../integration/devLocalIndicadoresAdapter';
import { getBusinessDayRangeUtc } from '@/shared/time/businessTime';

const INDICADORES_API_URL = (import.meta.env.VITE_INDICADORES_API_URL ?? '').trim();

const buildQueryParams = (filters: IndicadoresFilters) => {
  const startRange = getBusinessDayRangeUtc(filters.dateRange.startDate);
  const endRange = getBusinessDayRangeUtc(filters.dateRange.endDate);
  const params = new URLSearchParams({
    startDate: startRange.startUtc,
    endDate: endRange.endUtc,
    establishmentId: filters.establishmentId ?? 'Todos',
  });
  return params.toString();
};

const resolveEndpoint = (filters: IndicadoresFilters) => {
  if (!INDICADORES_API_URL) {
    throw new Error('No se ha configurado VITE_INDICADORES_API_URL');
  }
  try {
    const url = new URL(INDICADORES_API_URL);
    url.search = buildQueryParams(filters);
    return url.toString();
  } catch {
    throw new Error('VITE_INDICADORES_API_URL no es una URL válida');
  }
};

export const hasIndicadoresApi = () => INDICADORES_API_URL.length > 0;

type FetchSource = 'api' | 'dev-local' | 'fallback';

interface FetchOptions {
  signal?: AbortSignal;
}

export const fetchIndicadoresFromApi = async (
  filters: IndicadoresFilters,
  options?: FetchOptions
): Promise<IndicadoresData> => {
  const endpointUrl = resolveEndpoint(filters);
  const response = await fetch(endpointUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    },
    signal: options?.signal
  });

  if (!response.ok) {
    throw new Error(`Indicadores API respondió ${response.status}`);
  }

  const payload = await response.json() as IndicadoresApiResponseDTO;
  return mapIndicadoresResponse(payload);
};

export const fetchIndicadoresFromFixtures = (filters: IndicadoresFilters) => resolveFallbackIndicadores(filters);

export const fetchIndicadores = async (
  filters: IndicadoresFilters,
  options?: FetchOptions
): Promise<{ data: IndicadoresData; source: FetchSource }> => {
  try {
    const data = await fetchIndicadoresFromApi(filters, options);
    return { data, source: 'api' };
  } catch (error) {
    console.warn('[indicadores-negocio] No se pudo obtener datos reales, intentando dev-local.', error);
    try {
      const devLocal = await resolveIndicadoresFromDevLocal(filters);
      return { data: devLocal, source: 'dev-local' };
    } catch (devLocalError) {
      console.warn('[indicadores-negocio] No se pudo construir indicadores dev-local, usando fixtures.', devLocalError);
    }
    const data = await fetchIndicadoresFromFixtures(filters);
    return { data, source: 'fallback' };
  }
};
