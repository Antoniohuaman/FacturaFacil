import posthog from 'posthog-js';
import * as amplitude from '@amplitude/analytics-browser';

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

type PropiedadesAnalitica = Record<string, unknown>;
const amplitudeApiKey = import.meta.env.VITE_PUBLIC_AMPLITUDE_API_KEY?.trim();

type PosthogConEstado = typeof posthog & {
  __loaded?: boolean;
};

const esNavegador = (): boolean => typeof window !== 'undefined';

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

const construirPropiedadesBase = (propiedades?: PropiedadesAnalitica): PropiedadesAnalitica => {
  const propiedadesBase: PropiedadesAnalitica = {
    ruta_actual: esNavegador() ? window.location.pathname : '',
    timestamp_cliente: new Date().toISOString(),
  };

  if (!propiedades) {
    return propiedadesBase;
  }

  return {
    ...propiedadesBase,
    ...propiedades,
  };
};

function capturarEvento(nombreEvento: string, propiedades?: PropiedadesAnalitica): void {
  const posthogHabilitado = puedeCapturarEventos();
  const amplitudeHabilitado = amplitudeDisponible();

  if (!posthogHabilitado && !amplitudeHabilitado) {
    return;
  }

  const propiedadesEvento = construirPropiedadesBase(propiedades);

  if (posthogHabilitado) {
    posthog.capture(nombreEvento, propiedadesEvento);
  }

  if (amplitudeHabilitado) {
    amplitude.track(nombreEvento, propiedadesEvento);
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
