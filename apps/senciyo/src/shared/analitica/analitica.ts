import posthog from 'posthog-js';
import * as amplitude from '@amplitude/analytics-browser';
import mixpanel from 'mixpanel-browser';

import {
  EVENTOS_ANALITICA,
  type EntidadImportacion,
  type EntornoAnalitica,
  type ErroresRangoImportacion,
  type OrigenCliente,
  type OrigenProducto,
  type OrigenVenta,
  type ResultadoImportacion,
} from './eventosAnalitica';
import type { ContextoIdentidadAnalitica } from './identidadAnalitica';

type PropiedadesAnalitica = Record<string, unknown>;
const amplitudeApiKey = import.meta.env.VITE_PUBLIC_AMPLITUDE_API_KEY?.trim();
const mixpanelToken = import.meta.env.VITE_PUBLIC_MIXPANEL_TOKEN?.trim();

type PosthogConEstado = typeof posthog & {
  __loaded?: boolean;
  resetGroups?: () => void;
};

type MixpanelConSuperProps = typeof mixpanel & {
  register?: (properties: Record<string, unknown>) => void;
  unregister?: (propertyName: string) => void;
};

const esNavegador = (): boolean => typeof window !== 'undefined';

let contextoIdentidadActual: ContextoIdentidadAnalitica | null = null;
let firmaContextoIdentidadActual: string | null = null;

const esHostLocal = (): boolean => {
  if (!esNavegador()) {
    return false;
  }
  return ['localhost', '127.0.0.1'].includes(window.location.hostname);
};

const posthogDisponible = (): boolean => {
  const cliente = posthog as PosthogConEstado;
  return cliente.__loaded === true;
};

const puedeCapturarEventos = (): boolean => {
  if (!esNavegador()) {
    return false;
  }

  if (import.meta.env.MODE === 'development') {
    return false;
  }

  if (esHostLocal()) {
    return false;
  }

  return posthogDisponible();
};

const amplitudeDisponible = (): boolean => {
  if (!esNavegador()) {
    return false;
  }

  if (!import.meta.env.PROD) {
    return false;
  }

  if (esHostLocal()) {
    return false;
  }

  return Boolean(amplitudeApiKey);
};

const mixpanelDisponible = (): boolean => {
  if (!esNavegador()) {
    return false;
  }

  if (!import.meta.env.PROD) {
    return false;
  }

  if (esHostLocal()) {
    return false;
  }

  return Boolean(mixpanelToken);
};

let mixpanelInicializado = false;
const asegurarMixpanelInicializado = (): void => {
  if (!mixpanelDisponible() || mixpanelInicializado) {
    return;
  }

  mixpanel.init(mixpanelToken as string, {
    track_pageview: false,
    persistence: 'localStorage',
    ignore_dnt: true,
  });

  mixpanelInicializado = true;
};

const construirPropiedadesBase = (propiedades?: PropiedadesAnalitica): PropiedadesAnalitica => {
  const propiedadesBase: PropiedadesAnalitica = {
    ruta_actual: esNavegador() ? window.location.pathname : '',
    timestamp_cliente: new Date().toISOString(),
  };

  if (contextoIdentidadActual?.companyId) {
    propiedadesBase.company_id = contextoIdentidadActual.companyId;
  }

  if (contextoIdentidadActual?.companyName) {
    propiedadesBase.company_name = contextoIdentidadActual.companyName;
  }

  if (typeof contextoIdentidadActual?.companyConfigured === 'boolean') {
    propiedadesBase.company_configured = contextoIdentidadActual.companyConfigured;
  }

  if (contextoIdentidadActual?.establecimientoId) {
    propiedadesBase.establecimiento_id = contextoIdentidadActual.establecimientoId;
  }

  if (contextoIdentidadActual?.userRole) {
    propiedadesBase.user_role = contextoIdentidadActual.userRole;
  }

  if (contextoIdentidadActual?.entornoSunat) {
    propiedadesBase.entorno_sunat = contextoIdentidadActual.entornoSunat;
  }

  if (contextoIdentidadActual?.entorno) {
    propiedadesBase.entorno = contextoIdentidadActual.entorno;
  }

  if (!propiedades) {
    return propiedadesBase;
  }

  return {
    ...propiedadesBase,
    ...propiedades,
  };
};

const construirFirmaContexto = (contexto: ContextoIdentidadAnalitica | null): string | null => {
  if (!contexto) {
    return null;
  }

  return JSON.stringify(contexto);
};

const construirPropiedadesUsuario = (contexto: ContextoIdentidadAnalitica): Record<string, unknown> => ({
  user_role: contexto.userRole,
  user_status: contexto.userStatus,
  entorno: contexto.entorno,
  entorno_sunat: contexto.entornoSunat,
  company_configured: contexto.companyConfigured,
  company_id: contexto.companyId,
  company_name: contexto.companyName,
  establecimiento_id: contexto.establecimientoId,
});

const limpiarValoresIndefinidos = (propiedades: Record<string, unknown>): Record<string, unknown> => {
  return Object.fromEntries(
    Object.entries(propiedades).filter(([, valor]) => valor !== undefined),
  );
};

function establecerContextoAnalitico(contexto: ContextoIdentidadAnalitica | null): void {
  contextoIdentidadActual = contexto;
}

export function obtenerContextoAnaliticoActual(): ContextoIdentidadAnalitica | null {
  return contextoIdentidadActual;
}

export function resetearIdentidadAnalitica(): void {
  establecerContextoAnalitico(null);

  const clientePosthog = posthog as PosthogConEstado;
  if (posthogDisponible()) {
    clientePosthog.resetGroups?.();
    posthog.reset();
  }

  if (amplitudeDisponible()) {
    amplitude.reset();
  }

  if (mixpanelDisponible()) {
    asegurarMixpanelInicializado();
    mixpanel.reset();
  }

  firmaContextoIdentidadActual = null;
}

export function sincronizarIdentidadAnalitica(contexto: ContextoIdentidadAnalitica | null): void {
  const nuevaFirma = construirFirmaContexto(contexto);
  if (nuevaFirma === firmaContextoIdentidadActual) {
    return;
  }

  firmaContextoIdentidadActual = nuevaFirma;
  establecerContextoAnalitico(contexto);

  if (!contexto) {
    resetearIdentidadAnalitica();
    return;
  }

  const propiedadesUsuario = limpiarValoresIndefinidos(construirPropiedadesUsuario(contexto));
  const posthogIdentidadHabilitada = puedeCapturarEventos();

  if (posthogIdentidadHabilitada) {
    posthog.identify(contexto.userId, propiedadesUsuario);

    if (contexto.companyId) {
      posthog.group('company', contexto.companyId, limpiarValoresIndefinidos({
        company_id: contexto.companyId,
        company_name: contexto.companyName,
        entorno_sunat: contexto.entornoSunat,
        entorno: contexto.entorno,
        company_configured: contexto.companyConfigured,
      }));
    } else {
      (posthog as PosthogConEstado).resetGroups?.();
    }
  }

  if (amplitudeDisponible()) {
    amplitude.setUserId(contexto.userId);

    const identify = new amplitude.Identify();
    Object.entries(propiedadesUsuario).forEach(([key, value]) => {
      if (value !== undefined) {
        identify.set(key, value as string | number | boolean);
      }
    });
    amplitude.identify(identify);

    if (contexto.companyId) {
      amplitude.setGroup('company', contexto.companyId);
    }
  }

  if (mixpanelDisponible()) {
    asegurarMixpanelInicializado();
    mixpanel.identify(contexto.userId);

    const mixpanelClient = mixpanel as MixpanelConSuperProps;
    mixpanelClient.register?.(propiedadesUsuario);

    if (!contexto.companyId) {
      mixpanelClient.unregister?.('company_id');
      mixpanelClient.unregister?.('company_name');
    }

    if (!contexto.establecimientoId) {
      mixpanelClient.unregister?.('establecimiento_id');
    }
  }
}

function capturarEvento(nombreEvento: string, propiedades?: PropiedadesAnalitica): void {
  const posthogHabilitado = puedeCapturarEventos();
  const amplitudeHabilitado = amplitudeDisponible();
  const mixpanelHabilitado = mixpanelDisponible();

  if (!posthogHabilitado && !amplitudeHabilitado && !mixpanelHabilitado) {
    return;
  }

  const propiedadesEvento = construirPropiedadesBase(propiedades);

  if (posthogHabilitado) {
    posthog.capture(nombreEvento, propiedadesEvento);
  }

  if (amplitudeHabilitado) {
    amplitude.track(nombreEvento, propiedadesEvento);
  }

  if (mixpanelHabilitado) {
    asegurarMixpanelInicializado();
    mixpanel.track(nombreEvento, propiedadesEvento);
  }
}

export function registrarRegistroUsuarioCompletado(entrada: { entorno: EntornoAnalitica }): void {
  capturarEvento(EVENTOS_ANALITICA.REGISTRO_USUARIO_COMPLETADO, entrada);
}

export function registrarVentaCompletada(entrada: { entorno: EntornoAnalitica; origenVenta: OrigenVenta }): void {
  capturarEvento(EVENTOS_ANALITICA.VENTA_COMPLETADA, entrada);
}

export function registrarPrimeraVentaCompletada(entrada: {
  entorno: EntornoAnalitica;
  origenVenta: OrigenVenta;
}): void {
  capturarEvento(EVENTOS_ANALITICA.PRIMERA_VENTA_COMPLETADA, entrada);
}

export function registrarProductoCreadoExitoso(entrada: {
  entorno: EntornoAnalitica;
  origen: OrigenProducto;
}): void {
  capturarEvento(EVENTOS_ANALITICA.PRODUCTO_CREADO_EXITOSO, entrada);
}

export function registrarClienteCreadoExitoso(entrada: {
  entorno: EntornoAnalitica;
  origen: OrigenCliente;
}): void {
  capturarEvento(EVENTOS_ANALITICA.CLIENTE_CREADO_EXITOSO, entrada);
}

export function registrarImportacionCompletada(entrada: {
  entorno: EntornoAnalitica;
  entidad: EntidadImportacion;
  resultado: ResultadoImportacion;
  erroresRango: ErroresRangoImportacion;
}): void {
  capturarEvento(EVENTOS_ANALITICA.IMPORTACION_COMPLETADA, entrada);
}

export function registrarRucActualizadoExitoso(entrada: {
  entorno: EntornoAnalitica;
  veniaDeRucDemo: true;
}): void {
  capturarEvento(EVENTOS_ANALITICA.RUC_ACTUALIZADO_EXITOSO, entrada);
}
