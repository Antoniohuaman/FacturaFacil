/* eslint-disable @typescript-eslint/no-explicit-any -- XLSX sheet_to_json retorna any[][] */
// gestion-inventario/utils/parseoArchivoImportacionStock.ts
//
// Parseo puro de archivos de importación de stock (Etapa 2, cierre de bloqueante 2 de la
// revisión). Extraído de `components/PanelImportacionStock.tsx` — un archivo que exporta un
// componente React solo puede exportar componentes (regla `react-refresh/only-export-components`),
// así que toda función/tipo/constante reutilizable vive aquí, sin JSX ni hooks, fácil de probar sin
// renderizar nada.
//
// Formato nuevo: CODIGO | PRODUCTO | UNIDAD | {almacén} | {almacén} (Costo) | ... — la columna de
// costo es OPCIONAL por almacén y coexiste con la de cantidad, nunca la reemplaza.
// Formato legacy: CODIGO | ALMACEN (opcional) | CANTIDAD | COSTO (opcional) — mismo criterio.
// Ambos formatos siguen leyendo exactamente igual un archivo antiguo sin columna de costo.

import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';

export type FilaParseada = {
  codigo: string;
  /** Clave: ID del almacén. Valor: stock final deseado, null = celda vacía (sin cambio). */
  cantidadPorAlmacen: Record<string, number | null>;
  /** Clave: ID del almacén. Valor: costo por unidad mínima declarado en el archivo, null = sin columna de costo o celda vacía (compatible con archivos antiguos sin costo). */
  costoPorAlmacen: Record<string, number | null>;
};

export type ResultadoParseo = {
  filas: FilaParseada[];
  codigosDuplicados: string[];
  columnasDesconocidas: string[];
  erroresPorFila: Array<{ codigo: string; columna: string; mensaje: string }>;
  esFormatoLegacy: boolean;
};

/** Encabezado de columna de almacén en la plantilla: "{codigo} - {nombre}" */
export const encabezadoAlmacen = (almacen: Almacen): string =>
  `${almacen.codigoAlmacen} - ${almacen.nombreAlmacen}`;

/** Encabezado de la columna de COSTO asociada a un almacén: "{codigo} - {nombre} (Costo)" — siempre junto a su columna de cantidad, nunca reemplazándola. */
export const encabezadoCostoAlmacen = (almacen: Almacen): string =>
  `${encabezadoAlmacen(almacen)} (Costo)`;

// Columnas informativas que no se procesan como almacenes
const COLUMNAS_INFORMATIVAS = new Set([
  'codigo', 'code', 'producto', 'product', 'nombre', 'name',
  'unidad', 'unit', 'stock_total_actual', 'stock total actual',
]);

export const esFormatoNuevo = (encabezados: string[]): boolean =>
  encabezados.some(h => {
    const n = h.toLowerCase().trim();
    return n === 'producto' || n === 'product' || n === 'nombre' || n === 'name';
  });

// ─── Parseo del formato nuevo ─────────────────────────────────────────────────

export function parsearFormatoNuevo(
  encabezadosCrudos: string[],
  filasCrudas: any[][],
  almacenes: Almacen[]
): ResultadoParseo {
  const encabezados = encabezadosCrudos.map(h => String(h ?? '').trim());

  const indCodigo = encabezados.findIndex(h => {
    const n = h.toLowerCase();
    return n === 'codigo' || n === 'code';
  });
  if (indCodigo === -1) {
    return {
      filas: [], codigosDuplicados: [], columnasDesconocidas: [],
      erroresPorFila: [{ codigo: '', columna: 'CODIGO', mensaje: 'No se encontró la columna CODIGO en el archivo.' }],
      esFormatoLegacy: false,
    };
  }

  const encabezadoAAlmacenId = new Map<string, string>();
  almacenes.forEach(w => encabezadoAAlmacenId.set(encabezadoAlmacen(w).toLowerCase(), w.id));
  // Columnas de COSTO — mapeadas por SU PROPIO encabezado ("{codigo} - {nombre} (Costo)"), nunca
  // confundidas con la columna de cantidad del mismo almacén.
  const encabezadoCostoAAlmacenId = new Map<string, string>();
  almacenes.forEach(w => encabezadoCostoAAlmacenId.set(encabezadoCostoAlmacen(w).toLowerCase(), w.id));

  const columnasAlmacen: Array<{ indice: number; almacenId: string }> = [];
  const columnasCosto: Array<{ indice: number; almacenId: string }> = [];
  const columnasDesconocidas: string[] = [];

  encabezados.forEach((h, indice) => {
    if (indice === indCodigo) return;
    const minuscula = h.toLowerCase();
    if (!h || COLUMNAS_INFORMATIVAS.has(minuscula)) return;
    const almacenIdCosto = encabezadoCostoAAlmacenId.get(minuscula);
    if (almacenIdCosto) {
      columnasCosto.push({ indice, almacenId: almacenIdCosto });
      return;
    }
    const almacenId = encabezadoAAlmacenId.get(minuscula);
    if (almacenId) {
      columnasAlmacen.push({ indice, almacenId });
    } else {
      columnasDesconocidas.push(h);
    }
  });

  const codigosVistos = new Set<string>();
  const codigosDuplicados: string[] = [];
  const erroresPorFila: ResultadoParseo['erroresPorFila'] = [];
  const filas: FilaParseada[] = [];

  for (const fila of filasCrudas) {
    const codigo = String(fila[indCodigo] ?? '').trim();
    if (!codigo) continue;

    const codigoUpper = codigo.toUpperCase();
    if (codigosVistos.has(codigoUpper)) {
      if (!codigosDuplicados.includes(codigo)) codigosDuplicados.push(codigo);
      continue;
    }
    codigosVistos.add(codigoUpper);

    const cantidadPorAlmacen: Record<string, number | null> = {};
    for (const { indice, almacenId } of columnasAlmacen) {
      const valorCrudo = fila[indice];
      if (valorCrudo === null || valorCrudo === undefined || String(valorCrudo).trim() === '') {
        cantidadPorAlmacen[almacenId] = null; // Celda vacía = sin cambio
        continue;
      }
      const parseado = parseFloat(String(valorCrudo));
      if (isNaN(parseado)) {
        erroresPorFila.push({ codigo, columna: encabezados[indice], mensaje: `"${valorCrudo}" no es un número válido` });
        cantidadPorAlmacen[almacenId] = null;
      } else {
        cantidadPorAlmacen[almacenId] = parseado;
      }
    }

    // Compatibilidad con archivos antiguos sin columna de costo: `columnasCosto` queda vacío y
    // `costoPorAlmacen` se llena solo de `null` — el comportamiento cuantitativo no cambia.
    const costoPorAlmacen: Record<string, number | null> = {};
    for (const { indice, almacenId } of columnasCosto) {
      const valorCrudo = fila[indice];
      if (valorCrudo === null || valorCrudo === undefined || String(valorCrudo).trim() === '') {
        costoPorAlmacen[almacenId] = null;
        continue;
      }
      const parseado = parseFloat(String(valorCrudo));
      if (isNaN(parseado)) {
        erroresPorFila.push({ codigo, columna: encabezados[indice], mensaje: `"${valorCrudo}" no es un costo válido` });
        costoPorAlmacen[almacenId] = null;
      } else {
        costoPorAlmacen[almacenId] = parseado;
      }
    }

    filas.push({ codigo, cantidadPorAlmacen, costoPorAlmacen });
  }

  return { filas, codigosDuplicados, columnasDesconocidas, erroresPorFila, esFormatoLegacy: false };
}

// ─── Parseo del formato legacy ────────────────────────────────────────────────

/**
 * Formato antiguo: CODIGO | ALMACEN (opcional) | CANTIDAD | COSTO (opcional, Etapa 2).
 * Se mantiene compatibilidad. '_ALL' = aplica a todos los almacenes del establecimiento.
 */
export function parsearFormatoLegacy(
  encabezadosCrudos: string[],
  filasCrudas: any[][],
  almacenes: Almacen[]
): ResultadoParseo {
  const encabezados = encabezadosCrudos.map(h => String(h ?? '').toLowerCase().trim());
  const indCodigo = encabezados.findIndex(h => h.includes('codigo') || h === 'code');
  const indAlmacen = encabezados.findIndex(h => h.includes('almacen'));
  const indCantidad = encabezados.findIndex(
    h => h.includes('cantidad') || (h.includes('stock') && !h.includes('_total')) || h === 'qty'
  );
  // Formato legacy CODIGO | ALMACEN | CANTIDAD | COSTO — columna OPCIONAL: ausente en archivos
  // antiguos, que siguen leyéndose exactamente igual (sin costo).
  const indCosto = encabezados.findIndex(h => h.includes('costo') || h === 'cost');

  if (indCodigo === -1 || indCantidad === -1) {
    return {
      filas: [], codigosDuplicados: [], columnasDesconocidas: [],
      erroresPorFila: [{ codigo: '', columna: 'CODIGO/CANTIDAD', mensaje: 'Formato antiguo: se requieren columnas CODIGO y CANTIDAD.' }],
      esFormatoLegacy: true,
    };
  }

  const codigoAAlmacenId = new Map<string, string>();
  almacenes.forEach(w => codigoAAlmacenId.set((w.codigoAlmacen ?? w.id).toUpperCase(), w.id));

  const clavesVistas = new Set<string>();
  const codigosDuplicados: string[] = [];
  const columnasDesconocidas: string[] = [];
  const erroresPorFila: ResultadoParseo['erroresPorFila'] = [];
  const filas: FilaParseada[] = [];

  for (const fila of filasCrudas) {
    const codigo = String(fila[indCodigo] ?? '').trim();
    if (!codigo) continue;

    const rawAlmacen = indAlmacen !== -1 ? String(fila[indAlmacen] ?? '').trim() : '';
    const rawCantidad = fila[indCantidad];
    const cantidad = parseFloat(String(rawCantidad ?? ''));

    if (isNaN(cantidad)) {
      erroresPorFila.push({ codigo, columna: 'CANTIDAD', mensaje: `"${rawCantidad}" no es un número válido` });
      continue;
    }

    let almacenId: string | null = null;
    if (rawAlmacen) {
      almacenId = codigoAAlmacenId.get(rawAlmacen.toUpperCase()) ?? null;
      if (!almacenId && !columnasDesconocidas.includes(rawAlmacen)) {
        columnasDesconocidas.push(rawAlmacen);
        continue;
      }
    }

    const clave = `${codigo.toUpperCase()}|${almacenId ?? '_ALL'}`;
    if (clavesVistas.has(clave)) {
      if (!codigosDuplicados.includes(codigo)) codigosDuplicados.push(codigo);
      continue;
    }
    clavesVistas.add(clave);

    let costo: number | null = null;
    if (indCosto !== -1) {
      const rawCosto = fila[indCosto];
      if (rawCosto !== null && rawCosto !== undefined && String(rawCosto).trim() !== '') {
        const parseado = parseFloat(String(rawCosto));
        if (isNaN(parseado)) {
          erroresPorFila.push({ codigo, columna: 'COSTO', mensaje: `"${rawCosto}" no es un costo válido` });
        } else {
          costo = parseado;
        }
      }
    }

    const cantidadPorAlmacen: Record<string, number | null> = {};
    cantidadPorAlmacen[almacenId ?? '_ALL'] = cantidad;
    const costoPorAlmacen: Record<string, number | null> = {};
    costoPorAlmacen[almacenId ?? '_ALL'] = costo;
    filas.push({ codigo, cantidadPorAlmacen, costoPorAlmacen });
  }

  return { filas, codigosDuplicados, columnasDesconocidas, erroresPorFila, esFormatoLegacy: true };
}
