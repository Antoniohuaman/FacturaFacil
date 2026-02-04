import { useCallback, useEffect, useRef } from 'react';
import {
  crearMetaBorradorEnProgreso,
  leerBorradorEnProgreso,
  guardarBorradorEnProgreso,
  limpiarBorradorEnProgreso,
  type BorradorEnProgreso,
} from './almacenamientoBorradorEnProgreso';

export type ConfiguracionBorradorEnProgreso<TEstado, TBorrador> = {
  habilitado: boolean;
  clave: string;
  version: number;
  ttlDias?: number;
  debounceMs?: number;
  extraerEstado: () => TEstado;
  convertirAStorage: (estado: TEstado) => TBorrador;
  aplicarDesdeStorage: (borrador: TBorrador) => void;
  debePersistir?: (estado: TEstado) => boolean;
  onRestaurado?: () => void;
};

export type ControlBorradorEnProgreso = {
  restaurar: () => void;
  limpiar: () => void;
  forzarGuardado: () => void;
};

const TTL_POR_DEFECTO_DIAS = 7;
const DEBOUNCE_POR_DEFECTO_MS = 400;

const construirBorrador = <TEstado, TBorrador>(
  estado: TEstado,
  version: number,
  ttlDias: number,
  convertirAStorage: (estado: TEstado) => TBorrador,
): BorradorEnProgreso<TBorrador> => {
  const meta = crearMetaBorradorEnProgreso(version, ttlDias);
  return {
    ...meta,
    datos: convertirAStorage(estado),
  };
};

export const useBorradorEnProgreso = <TEstado, TBorrador>(
  config: ConfiguracionBorradorEnProgreso<TEstado, TBorrador>,
): ControlBorradorEnProgreso => {
  const {
    habilitado,
    clave,
    version,
    ttlDias = TTL_POR_DEFECTO_DIAS,
    debounceMs = DEBOUNCE_POR_DEFECTO_MS,
    extraerEstado,
    convertirAStorage,
    aplicarDesdeStorage,
    debePersistir,
    onRestaurado,
  } = config;

  const restauradasPorClaveRef = useRef<Set<string>>(new Set());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const omitirGuardadoRef = useRef(false);
  const ultimoSnapshotRef = useRef<string | null>(null);
  const huboEdicionLocalRef = useRef(false);
  const ultimaClaveRef = useRef<string>(clave);
  const ultimaConfigRef = useRef({
    clave,
    habilitado,
    version,
    ttlDias,
    extraerEstado,
    convertirAStorage,
    debePersistir,
  });

  const limpiar = useCallback(() => {
    limpiarBorradorEnProgreso(clave);
  }, [clave]);

  const restaurar = useCallback(() => {
    if (!habilitado) return;
    if (restauradasPorClaveRef.current.has(clave)) return;
    const borrador = leerBorradorEnProgreso<TBorrador>(clave, version);
    if (!borrador) return;
    // Si hay un borrador real en storage, se prioriza restaurarlo incluso si hubo cambios locales
    // (muchos cambios iniciales son defaults/config y no ediciones explícitas del usuario).
    omitirGuardadoRef.current = true;
    aplicarDesdeStorage(borrador.datos);
    restauradasPorClaveRef.current.add(clave);
    onRestaurado?.();
  }, [aplicarDesdeStorage, clave, habilitado, onRestaurado, version]);

  const forzarGuardado = useCallback(() => {
    if (!habilitado) return;
    const estado = extraerEstado();
    if (debePersistir && !debePersistir(estado)) {
      limpiarBorradorEnProgreso(clave);
      return;
    }
    const borrador = construirBorrador(estado, version, ttlDias, convertirAStorage);
    guardarBorradorEnProgreso(clave, borrador);
  }, [clave, convertirAStorage, debePersistir, extraerEstado, habilitado, ttlDias, version]);

  useEffect(() => {
    restaurar();
  }, [restaurar]);

  useEffect(() => {
    if (ultimaClaveRef.current !== clave) {
      ultimaClaveRef.current = clave;
      ultimoSnapshotRef.current = null;
      huboEdicionLocalRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    ultimaConfigRef.current = {
      clave,
      habilitado,
      version,
      ttlDias,
      extraerEstado,
      convertirAStorage,
      debePersistir,
    };

    if (!habilitado) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    let estado: TEstado;
    try {
      estado = extraerEstado();
    } catch {
      return;
    }

    try {
      const snapshot = JSON.stringify(estado);
      if (ultimoSnapshotRef.current === null) {
        ultimoSnapshotRef.current = snapshot;
      } else if (snapshot !== ultimoSnapshotRef.current) {
        // Solo marcar edición local luego de que el borrador haya sido restaurado para esta clave.
        // Esto evita bloquear la restauración cuando el estado cambia por defaults/carga de contexto.
        if (!omitirGuardadoRef.current && restauradasPorClaveRef.current.has(clave)) {
          huboEdicionLocalRef.current = true;
        }
        ultimoSnapshotRef.current = snapshot;
      }
    } catch {
      // Si no se puede serializar, se omite el tracking de cambios locales.
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (omitirGuardadoRef.current) {
      omitirGuardadoRef.current = false;
      return;
    }

    // Evitar limpiar un borrador existente antes de que la restauración ocurra.
    if (debePersistir && !debePersistir(estado) && !restauradasPorClaveRef.current.has(clave)) {
      const existente = leerBorradorEnProgreso<TBorrador>(clave, version);
      if (existente) {
        return;
      }
    }

    if (debePersistir && !debePersistir(estado)) {
      limpiarBorradorEnProgreso(clave);
      return;
    }

    timeoutRef.current = setTimeout(() => {
      const estadoActual = extraerEstado();
      if (debePersistir && !debePersistir(estadoActual)) {
        limpiarBorradorEnProgreso(clave);
        return;
      }
      const borrador = construirBorrador(estadoActual, version, ttlDias, convertirAStorage);
      guardarBorradorEnProgreso(clave, borrador);
    }, debounceMs);
  }, [
    habilitado,
    clave,
    version,
    ttlDias,
    debounceMs,
    extraerEstado,
    convertirAStorage,
    debePersistir,
  ]);

  useEffect(() => {
    return () => {
      if (!timeoutRef.current) {
        return;
      }

      const {
        clave: claveActual,
        habilitado: habilitadoActual,
        version: versionActual,
        ttlDias: ttlDiasActual,
        extraerEstado: extraerEstadoActual,
        convertirAStorage: convertirAStorageActual,
        debePersistir: debePersistirActual,
      } = ultimaConfigRef.current;

      if (!habilitadoActual) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        return;
      }

      try {
        const estado = extraerEstadoActual();
        const puedePersistir = !debePersistirActual || debePersistirActual(estado);
        if (!puedePersistir) {
          limpiarBorradorEnProgreso(claveActual);
        } else {
          const borrador = construirBorrador(estado, versionActual, ttlDiasActual, convertirAStorageActual);
          guardarBorradorEnProgreso(claveActual, borrador);
        }
      } catch {
        // Si falla la extracción en el cleanup, se ignora.
      } finally {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  return {
    restaurar,
    limpiar,
    forzarGuardado,
  };
};
