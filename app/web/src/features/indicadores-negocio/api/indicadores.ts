import type { IndicadoresData, IndicadoresFilters } from '../models/indicadores';
import { resolveFallbackIndicadores } from './fixtures';
import type { IndicadoresApiResponseDTO } from './types';
import { mapIndicadoresResponse } from './mapper';

const INDICADORES_API_URL = (import.meta.env.VITE_INDICADORES_API_URL ?? '').trim();

const buildQueryParams = (filters: IndicadoresFilters) => {
  const params = new URLSearchParams({
    startDate: filters.dateRange.startDate.toISOString(),
    endDate: filters.dateRange.endDate.toISOString(),
    establishmentId: filters.establishmentId ?? 'Todos'
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

type FetchSource = 'api' | 'fallback';

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
    console.warn('[indicadores-negocio] No se pudo obtener datos reales, usando fallback.', error);
    const data = await fetchIndicadoresFromFixtures(filters);
    return { data, source: 'fallback' };
  }
};
