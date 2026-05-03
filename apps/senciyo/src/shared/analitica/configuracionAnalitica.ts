const HOSTS_LOCALES = new Set(['localhost', '127.0.0.1']);
const VALORES_PUBLICOS_DESHABILITADOS = new Set(['0', '1', 'true', 'false', 'null', 'undefined']);

export type ConfiguracionAnaliticaPublica = {
  amplitudeApiKey?: string;
  amplitudeReplaySampleRate: number;
  mixpanelToken?: string;
  posthogHost?: string;
  posthogKey?: string;
};

const normalizarCadenaPublica = (valor: string | undefined): string | undefined => {
  const valorNormalizado = valor?.trim();
  if (!valorNormalizado) {
    return undefined;
  }

  if (VALORES_PUBLICOS_DESHABILITADOS.has(valorNormalizado.toLowerCase())) {
    return undefined;
  }

  return valorNormalizado;
};

export const esHostLocalAnalitica = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return HOSTS_LOCALES.has(window.location.hostname);
};

export const esEntornoAnaliticaHabilitado = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return import.meta.env.PROD && !esHostLocalAnalitica();
};

export const normalizarSampleRateReplay = (valor: string | undefined): number => {
  const valorNormalizado = valor?.trim().toLowerCase();
  if (!valorNormalizado) {
    return 0;
  }

  const sampleRate = Number(valorNormalizado);
  if (!Number.isFinite(sampleRate)) {
    return 0;
  }

  return Math.min(1, Math.max(0, sampleRate));
};

export const obtenerConfiguracionAnaliticaPublica = (): ConfiguracionAnaliticaPublica => {
  return {
    amplitudeApiKey: normalizarCadenaPublica(import.meta.env.VITE_PUBLIC_AMPLITUDE_API_KEY as string | undefined),
    amplitudeReplaySampleRate: normalizarSampleRateReplay(
      import.meta.env.VITE_PUBLIC_AMPLITUDE_SESSION_REPLAY_SAMPLE_RATE as string | undefined,
    ),
    mixpanelToken: normalizarCadenaPublica(import.meta.env.VITE_PUBLIC_MIXPANEL_TOKEN as string | undefined),
    posthogHost: normalizarCadenaPublica(import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string | undefined),
    posthogKey: normalizarCadenaPublica(import.meta.env.VITE_PUBLIC_POSTHOG_KEY as string | undefined),
  };
};