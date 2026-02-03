export type BorradorEnProgreso<TDatos> = {
  version: number;
  actualizadoEnIso: string;
  expiraEnIso: string;
  datos: TDatos;
};

export type CrearClaveBorradorEnProgresoParams = {
  app: string;
  tenantId?: string | null;
  empresaId?: string | null;
  establecimientoId?: string | number | null;
  tipoDocumento: string;
  serie?: string | null;
  modo?: string | null;
};

const PREFIX = 'borrador_en_progreso';

const normalizarSegmento = (valor: string | number | null | undefined, fallback: string): string => {
  if (valor === null || valor === undefined) {
    return fallback;
  }
  const texto = String(valor).trim();
  return texto.length > 0 ? texto : fallback;
};

export const crearClaveBorradorEnProgreso = (params: CrearClaveBorradorEnProgresoParams): string => {
  const tenantSegmento = normalizarSegmento(params.tenantId ?? params.empresaId, 'sin_tenant');
  const establecimientoSegmento = normalizarSegmento(params.establecimientoId, 'sin_establecimiento');
  const tipoDocumentoSegmento = normalizarSegmento(params.tipoDocumento, 'sin_tipo');
  const serieSegmento = normalizarSegmento(params.serie, 'sin_serie');
  const modoSegmento = normalizarSegmento(params.modo, 'sin_modo');
  const appSegmento = normalizarSegmento(params.app, 'app');

  return `${PREFIX}:${appSegmento}:${tenantSegmento}:${establecimientoSegmento}:${tipoDocumentoSegmento}:${serieSegmento}:${modoSegmento}`;
};

const ahoraIso = (): string => new Date().toISOString();

const esFechaIsoValida = (valor: string | undefined | null): boolean => {
  if (!valor) return false;
  const time = Date.parse(valor);
  return Number.isFinite(time);
};

const leerRaw = (clave: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(clave);
  } catch (error) {
    console.error('[borradorEnProgreso] Error leyendo localStorage', error);
    return null;
  }
};

const escribirRaw = (clave: string, valor: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(clave, valor);
  } catch (error) {
    console.error('[borradorEnProgreso] Error escribiendo localStorage', error);
  }
};

const borrarRaw = (clave: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(clave);
  } catch (error) {
    console.error('[borradorEnProgreso] Error eliminando localStorage', error);
  }
};

export const leerBorradorEnProgreso = <T>(clave: string, versionEsperada: number): BorradorEnProgreso<T> | null => {
  const raw = leerRaw(clave);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as BorradorEnProgreso<T>;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    if (parsed.version !== versionEsperada) {
      return null;
    }

    if (!esFechaIsoValida(parsed.expiraEnIso)) {
      return null;
    }

    const expiraMs = Date.parse(parsed.expiraEnIso);
    if (Number.isFinite(expiraMs) && expiraMs < Date.now()) {
      borrarRaw(clave);
      return null;
    }

    if (!esFechaIsoValida(parsed.actualizadoEnIso)) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('[borradorEnProgreso] Error parseando JSON', error);
    return null;
  }
};

export const guardarBorradorEnProgreso = <T>(clave: string, borrador: BorradorEnProgreso<T>): void => {
  try {
    escribirRaw(clave, JSON.stringify(borrador));
  } catch (error) {
    console.error('[borradorEnProgreso] Error guardando borrador', error);
  }
};

export const limpiarBorradorEnProgreso = (clave: string): void => {
  borrarRaw(clave);
};

export const limpiarBorradoresEnProgresoPorPrefijo = (prefijo: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const total = window.localStorage.length;
    const claves: string[] = [];

    for (let i = 0; i < total; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(prefijo)) {
        claves.push(key);
      }
    }

    claves.forEach((key) => {
      window.localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('[borradorEnProgreso] Error limpiando por prefijo', error);
  }
};

export const crearMetaBorradorEnProgreso = (version: number, ttlDias: number): Omit<BorradorEnProgreso<unknown>, 'datos'> => {
  const ahora = new Date();
  const expira = new Date(ahora.getTime() + ttlDias * 24 * 60 * 60 * 1000);
  return {
    version,
    actualizadoEnIso: ahoraIso(),
    expiraEnIso: expira.toISOString(),
  };
};
