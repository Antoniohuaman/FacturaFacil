import posthog from 'posthog-js';

import {
  EVENTOS_ANALITICA,
  type DisparadorProduccion,
  type EntornoAnalitica,
  type FlujoBloqueo,
  type ModuloPrincipal,
  type MotivoBloqueo,
  type OrigenCliente,
  type OrigenProducto,
  type OrigenVenta,
} from './eventosAnalitica';

type PropiedadesAnalitica = Record<string, unknown>;

type PosthogConEstado = typeof posthog & {
  __loaded?: boolean;
};

const CODIGO_ERROR_LONGITUD_MAXIMA = 50;
const LLAVE_INICIO_VENTA_PREFIJO = 'analitica_venta_iniciada_';

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

const normalizarCodigoError = (codigoError: string): string => {
  const limpio = codigoError
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_:-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, CODIGO_ERROR_LONGITUD_MAXIMA);

  return limpio || 'error_desconocido';
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

const construirClaveInicioVenta = (origen: OrigenVenta): string => `${LLAVE_INICIO_VENTA_PREFIJO}${origen}`;

const guardarInicioVenta = (origen: OrigenVenta): void => {
  if (!esNavegador()) {
    return;
  }

  window.sessionStorage.setItem(construirClaveInicioVenta(origen), String(Date.now()));
};

const obtenerDuracionVentaMs = (origen: OrigenVenta): number | null => {
  if (!esNavegador()) {
    return null;
  }

  const clave = construirClaveInicioVenta(origen);
  const rawInicio = window.sessionStorage.getItem(clave);
  window.sessionStorage.removeItem(clave);

  if (!rawInicio) {
    return null;
  }

  const inicio = Number(rawInicio);
  if (!Number.isFinite(inicio)) {
    return null;
  }

  const duracionMs = Date.now() - inicio;
  return duracionMs >= 0 ? duracionMs : null;
};

function capturarEvento(nombreEvento: string, propiedades?: PropiedadesAnalitica): void {
  if (!puedeCapturarEventos()) {
    return;
  }

  posthog.capture(nombreEvento, construirPropiedadesBase(propiedades));
}

export function registrarInicioSesionExitoso(entrada?: { entorno: EntornoAnalitica }): void {
  capturarEvento(EVENTOS_ANALITICA.INICIO_SESION_EXITOSO, entrada);
}

export function registrarVentaIniciada(entrada: { entorno: EntornoAnalitica; origen: OrigenVenta }): void {
  guardarInicioVenta(entrada.origen);
  capturarEvento(EVENTOS_ANALITICA.VENTA_INICIADA, entrada);
}

export function registrarVentaCompletada(entrada: { entorno: EntornoAnalitica; origen: OrigenVenta }): void {
  const duracionMs = obtenerDuracionVentaMs(entrada.origen);
  capturarEvento(EVENTOS_ANALITICA.VENTA_COMPLETADA, {
    ...entrada,
    ...(duracionMs !== null ? { duracion_ms: duracionMs } : {}),
  });
}

export function registrarPrimeraVentaCompletada(entrada: {
  entorno: EntornoAnalitica;
  origen: OrigenVenta;
}): void {
  capturarEvento(EVENTOS_ANALITICA.PRIMERA_VENTA_COMPLETADA, entrada);
}

export function registrarRucActualizadoExitoso(entrada: {
  entorno: EntornoAnalitica;
  veniaDeRucDemo: true;
}): void {
  capturarEvento(EVENTOS_ANALITICA.RUC_ACTUALIZADO_EXITOSO, entrada);
}

export function registrarPaseAProduccionIniciado(entrada: {
  entorno: 'demo';
  disparador: DisparadorProduccion;
}): void {
  capturarEvento(EVENTOS_ANALITICA.PASE_A_PRODUCCION_INICIADO, entrada);
}

export function registrarPaseAProduccionCompletado(entrada: {
  entorno: 'produccion';
  limpiezaRealizada: boolean;
  docsDemoEliminadosRango: '0' | '1-10' | '11-50' | '51+';
}): void {
  capturarEvento(EVENTOS_ANALITICA.PASE_A_PRODUCCION_COMPLETADO, entrada);
}

export function registrarCertificadoDigitalActivado(entrada: { entorno: 'produccion' }): void {
  capturarEvento(EVENTOS_ANALITICA.CERTIFICADO_DIGITAL_ACTIVADO, entrada);
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
  entidad: 'productos' | 'clientes' | 'precios';
  resultado: 'exito' | 'con_errores';
  erroresRango: '0' | '1-5' | '6-20' | '21+';
}): void {
  capturarEvento(EVENTOS_ANALITICA.IMPORTACION_COMPLETADA, entrada);
}

export function registrarCajaAbiertaExitoso(entrada: {
  entorno: EntornoAnalitica;
  origen: 'bloqueo' | 'modulo_caja';
}): void {
  capturarEvento(EVENTOS_ANALITICA.CAJA_ABIERTA_EXITOSO, entrada);
}

export function registrarCajaCerradaExitoso(entrada: { entorno: EntornoAnalitica }): void {
  capturarEvento(EVENTOS_ANALITICA.CAJA_CERRADA_EXITOSO, entrada);
}

export function registrarModuloVisitado(entrada: {
  entorno: EntornoAnalitica;
  modulo: ModuloPrincipal;
}): void {
  capturarEvento(EVENTOS_ANALITICA.MODULO_VISITADO, entrada);
}

export function registrarBloqueoMostrado(entrada: {
  entorno: EntornoAnalitica;
  flujo: FlujoBloqueo;
  motivo: MotivoBloqueo;
}): void {
  capturarEvento(EVENTOS_ANALITICA.BLOQUEO_MOSTRADO, entrada);
}

export function registrarErrorCritico(entrada: {
  entorno: EntornoAnalitica;
  flujo: FlujoBloqueo;
  codigoError: string;
}): void {
  capturarEvento(EVENTOS_ANALITICA.ERROR_CRITICO, {
    entorno: entrada.entorno,
    flujo: entrada.flujo,
    codigoError: normalizarCodigoError(entrada.codigoError),
  });
}
