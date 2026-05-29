/* eslint-disable @typescript-eslint/no-explicit-any -- XLSX sheet_to_json retorna any[][] */
import React, { useState } from 'react';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useUserSession } from '@/contexts/UserSessionContext';
import { InventoryService } from '../services/inventory.service';
import { useAuth } from '../../autenticacion/hooks';
import { isProductEnabledForEstablecimiento } from '../../catalogo-articulos/models/types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import * as XLSX from 'xlsx';

// ─── Props ────────────────────────────────────────────────────────────────────

interface PanelImportacionStockProps {
  /** Se invoca después de aplicar una importación o reset exitoso para refrescar movimientos. */
  onRecargarMovimientos?: () => void;
}

// ─── Tipos internos ───────────────────────────────────────────────────────────

type FilaParseada = {
  codigo: string;
  /** Clave: ID del almacén. Valor: stock final deseado, null = celda vacía (sin cambio). */
  cantidadPorAlmacen: Record<string, number | null>;
};

type ResultadoParseo = {
  filas: FilaParseada[];
  codigosDuplicados: string[];
  columnasDesconocidas: string[];
  erroresPorFila: Array<{ codigo: string; columna: string; mensaje: string }>;
  esFormatoLegacy: boolean;
};

type ResultadoImportacion = {
  loteId: string;
  movimientos: number;
  sinCambios: number;
  noEncontrados: string[];
  errores: string[];
};

type ResultadoReset = {
  loteId: string;
  movimientos: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const generarIdLote = (prefijo: 'IMP' | 'RST'): string => {
  const d = new Date();
  const p = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${prefijo}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

/** Encabezado de columna de almacén en la plantilla: "{codigo} - {nombre}" */
const encabezadoAlmacen = (almacen: Almacen): string =>
  `${almacen.codigoAlmacen} - ${almacen.nombreAlmacen}`;

// Columnas informativas que no se procesan como almacenes
const COLUMNAS_INFORMATIVAS = new Set([
  'codigo', 'code', 'producto', 'product', 'nombre', 'name',
  'unidad', 'unit', 'stock_total_actual', 'stock total actual',
]);

const esFormatoNuevo = (encabezados: string[]): boolean =>
  encabezados.some(h => {
    const n = h.toLowerCase().trim();
    return n === 'producto' || n === 'product' || n === 'nombre' || n === 'name';
  });

// ─── Parseo del formato nuevo ─────────────────────────────────────────────────

function parsearFormatoNuevo(
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

  const columnasAlmacen: Array<{ indice: number; almacenId: string }> = [];
  const columnasDesconocidas: string[] = [];

  encabezados.forEach((h, indice) => {
    if (indice === indCodigo) return;
    const minuscula = h.toLowerCase();
    if (!h || COLUMNAS_INFORMATIVAS.has(minuscula)) return;
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
    filas.push({ codigo, cantidadPorAlmacen });
  }

  return { filas, codigosDuplicados, columnasDesconocidas, erroresPorFila, esFormatoLegacy: false };
}

// ─── Parseo del formato legacy ────────────────────────────────────────────────

/**
 * Formato antiguo: CODIGO | ALMACEN (opcional) | CANTIDAD
 * Se mantiene compatibilidad. '_ALL' = aplica a todos los almacenes del establecimiento.
 */
function parsearFormatoLegacy(
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

    const cantidadPorAlmacen: Record<string, number | null> = {};
    cantidadPorAlmacen[almacenId ?? '_ALL'] = cantidad;
    filas.push({ codigo, cantidadPorAlmacen });
  }

  return { filas, codigosDuplicados, columnasDesconocidas, erroresPorFila, esFormatoLegacy: true };
}

// ─── Componente ───────────────────────────────────────────────────────────────

const PanelImportacionStock: React.FC<PanelImportacionStockProps> = ({ onRecargarMovimientos }) => {
  const { allProducts, updateProduct } = useProductStore();
  const { user } = useAuth();
  const { session } = useUserSession();
  const { state: configState } = useConfigurationContext();

  const establecimientoId = session?.currentEstablecimientoId ?? null;
  const almacenesActivos: Almacen[] = configState.almacenes.filter(w => w.estaActivoAlmacen);
  const almacenesEstablecimiento = establecimientoId
    ? almacenesActivos.filter(w => w.establecimientoId === establecimientoId)
    : almacenesActivos;
  // Si no hay almacenes del establecimiento, usar todos los activos como fallback
  const almacenesPlantilla = almacenesEstablecimiento.length > 0 ? almacenesEstablecimiento : almacenesActivos;

  const nombreUsuario = user?.nombre || session?.userName || 'Usuario';

  // ── Estado: flujo de importación ──────────────────────────────────────────
  type PasoImportacion = 'subir' | 'previsualizar' | 'resultado';
  const [pasoImportacion, setPasoImportacion] = useState<PasoImportacion>('subir');
  const [resultadoParseo, setResultadoParseo] = useState<ResultadoParseo | null>(null);
  const [resultadoImportacion, setResultadoImportacion] = useState<ResultadoImportacion | null>(null);

  // ── Estado: flujo de reset ────────────────────────────────────────────────
  type PasoReset = 'formulario' | 'confirmar' | 'resultado';
  const [pasoReset, setPasoReset] = useState<PasoReset>('formulario');
  const [productosSeleccionados, setProductosSeleccionados] = useState<Set<string>>(new Set());
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [aplicarATodos, setAplicarATodos] = useState(false);
  const [almacenesSeleccionados, setAlmacenesSeleccionados] = useState<string[]>([]);
  const [resultadoReset, setResultadoReset] = useState<ResultadoReset | null>(null);

  // ── Descarga de plantilla ─────────────────────────────────────────────────
  const descargarPlantilla = () => {
    const productos = establecimientoId
      ? allProducts.filter(p => isProductEnabledForEstablecimiento(p, establecimientoId))
      : allProducts;

    const encabezadosAlmacen = almacenesPlantilla.map(encabezadoAlmacen);
    const encabezados = ['CODIGO', 'PRODUCTO', 'UNIDAD', ...encabezadosAlmacen];

    const filasDatos = [...productos]
      .sort((a, b) => a.codigo.localeCompare(b.codigo))
      .map(p => {
        const stocks = almacenesPlantilla.map(w => p.stockPorAlmacen?.[w.id] ?? 0);
        return [p.codigo, p.nombre, p.unidad || '', ...stocks];
      });

    const hoja = XLSX.utils.aoa_to_sheet([encabezados, ...filasDatos]);
    hoja['!cols'] = [
      { wch: 15 }, { wch: 35 }, { wch: 10 },
      ...almacenesPlantilla.map(() => ({ wch: 18 })),
    ];

    const instrucciones: (string | number)[][] = [
      ['INSTRUCCIONES DE IMPORTACIÓN DE STOCK'],
      [''],
      ['1. Edita SOLO las columnas de almacén.'],
      ['2. Ingresa el stock FINAL deseado para cada producto en cada almacén.'],
      ['3. El sistema calculará el ajuste automáticamente (no es una suma).'],
      ['4. Si dejas una celda vacía, ese almacén no se modifica.'],
      [''],
      ['Ejemplo:'],
      ['- Stock actual en 0001 - Almacén: 20 → ingresaste 50 → resultado: stock 50, ajuste +30'],
      [''],
      ['Almacenes incluidos en esta plantilla:'],
      ...almacenesPlantilla.map(w => [`  ${encabezadoAlmacen(w)}`]),
    ];
    const hojaInstrucciones = XLSX.utils.aoa_to_sheet(instrucciones);
    hojaInstrucciones['!cols'] = [{ wch: 70 }];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Stock');
    XLSX.utils.book_append_sheet(libro, hojaInstrucciones, 'Instrucciones');

    const d = new Date();
    const fecha = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    XLSX.writeFile(libro, `Plantilla_Stock_${fecha}.xlsx`);
  };

  // ── Carga y parseo del archivo ────────────────────────────────────────────
  const manejarCargaArchivo = (evento: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    evento.target.value = '';

    const lector = new FileReader();
    const esExcel = archivo.name.endsWith('.xlsx') || archivo.name.endsWith('.xls');

    lector.onload = (e) => {
      try {
        let encabezadosCrudos: string[] = [];
        let filasCrudas: any[][] = [];

        if (esExcel) {
          const libro = XLSX.read(e.target?.result, { type: 'binary' });
          const hoja = libro.Sheets[libro.SheetNames[0]];
          const datos = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: '' }) as any[][];
          if (datos.length < 2) {
            setResultadoParseo({ filas: [], codigosDuplicados: [], columnasDesconocidas: [],
              erroresPorFila: [{ codigo: '', columna: '', mensaje: 'El archivo está vacío o solo tiene encabezados.' }],
              esFormatoLegacy: false });
            setPasoImportacion('previsualizar');
            return;
          }
          encabezadosCrudos = datos[0].map((h: any) => String(h ?? '').trim());
          filasCrudas = datos.slice(1).filter(f => f.some((c: any) => String(c ?? '').trim() !== ''));
        } else {
          const texto = e.target?.result as string;
          const lineas = texto.split('\n').filter(l => l.trim());
          if (lineas.length < 2) {
            setResultadoParseo({ filas: [], codigosDuplicados: [], columnasDesconocidas: [],
              erroresPorFila: [{ codigo: '', columna: '', mensaje: 'El archivo está vacío.' }],
              esFormatoLegacy: false });
            setPasoImportacion('previsualizar');
            return;
          }
          const sep = lineas[0].includes('\t') ? '\t' : lineas[0].includes(';') ? ';' : ',';
          encabezadosCrudos = lineas[0].split(sep).map(h => h.trim());
          filasCrudas = lineas.slice(1).map(l => l.split(sep).map(c => c.trim()));
        }

        const esNuevo = esFormatoNuevo(encabezadosCrudos);
        const resultado = esNuevo
          ? parsearFormatoNuevo(encabezadosCrudos, filasCrudas, almacenesPlantilla)
          : parsearFormatoLegacy(encabezadosCrudos, filasCrudas, almacenesActivos);

        setResultadoParseo(resultado);
        setPasoImportacion('previsualizar');
      } catch (err) {
        setResultadoParseo({ filas: [], codigosDuplicados: [], columnasDesconocidas: [],
          erroresPorFila: [{ codigo: '', columna: '', mensaje: `Error al leer el archivo: ${err instanceof Error ? err.message : 'Error desconocido'}` }],
          esFormatoLegacy: false });
        setPasoImportacion('previsualizar');
      }
    };

    if (esExcel) lector.readAsBinaryString(archivo);
    else lector.readAsText(archivo);
  };

  // ── Aplicar importación ────────────────────────────────────────────────────
  const aplicarImportacion = () => {
    if (!resultadoParseo || resultadoParseo.filas.length === 0) return;

    const loteId = generarIdLote('IMP');
    const noEncontrados: string[] = [];
    const errores: string[] = [];
    let movimientos = 0;
    let sinCambios = 0;

    const mapaAlmacenes = new Map<string, Almacen>(almacenesActivos.map(w => [w.id, w]));

    for (const fila of resultadoParseo.filas) {
      let productoActual = allProducts.find(
        p => p.codigo.trim().toUpperCase() === fila.codigo.trim().toUpperCase()
      );
      if (!productoActual) { noEncontrados.push(fila.codigo); continue; }

      // Formato legacy sin almacén: aplica a todos los almacenes de la plantilla
      let entradas = Object.entries(fila.cantidadPorAlmacen);
      if (resultadoParseo.esFormatoLegacy && entradas.length === 1 && entradas[0][0] === '_ALL') {
        const cantidad = entradas[0][1];
        entradas = almacenesPlantilla.map(w => [w.id, cantidad]);
      }

      for (const [almacenId, nuevaCantidad] of entradas) {
        if (nuevaCantidad === null) continue;

        const almacen = mapaAlmacenes.get(almacenId);
        if (!almacen) continue;

        const stockActual = productoActual.stockPorAlmacen?.[almacenId] ?? 0;
        if (stockActual === nuevaCantidad) { sinCambios++; continue; }

        const diferencia = nuevaCantidad - stockActual;
        const tipo: 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO' = diferencia > 0 ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO';

        try {
          const resultado = InventoryService.registerAdjustment(
            productoActual, almacen,
            {
              productoId: productoActual.id,
              almacenId,
              tipo,
              motivo: 'AJUSTE_INVENTARIO',
              cantidad: Math.abs(diferencia),
              observaciones: `Importación masiva: ${stockActual} → ${nuevaCantidad}`,
              documentoReferencia: loteId,
            },
            nombreUsuario
          );
          updateProduct(productoActual.id, resultado.product);
          // Actualizar referencia local para que el siguiente almacén del mismo producto
          // vea el stock ya actualizado
          productoActual = resultado.product;
          movimientos++;
        } catch (err) {
          errores.push(`${fila.codigo} [${almacen.codigoAlmacen}]: ${err instanceof Error ? err.message : 'Error'}`);
        }
      }
    }

    setResultadoImportacion({ loteId, movimientos, sinCambios, noEncontrados, errores });
    setPasoImportacion('resultado');
    if (movimientos > 0) onRecargarMovimientos?.();
  };

  // ── Reset de stock ─────────────────────────────────────────────────────────
  const almacenesParaReset = aplicarATodos
    ? almacenesActivos
    : almacenesActivos.filter(w => almacenesSeleccionados.includes(w.id));

  const confirmarReset = () => {
    const loteId = generarIdLote('RST');
    let movimientos = 0;

    almacenesParaReset.forEach(almacen => {
      productosSeleccionados.forEach(idProducto => {
        const producto = allProducts.find(p => p.id === idProducto);
        if (!producto) return;
        const stockActual = producto.stockPorAlmacen?.[almacen.id] ?? 0;
        if (stockActual <= 0) return;

        const resultado = InventoryService.registerAdjustment(
          producto, almacen,
          {
            productoId: producto.id,
            almacenId: almacen.id,
            tipo: 'AJUSTE_NEGATIVO',
            motivo: 'AJUSTE_INVENTARIO',
            cantidad: stockActual,
            observaciones: `Reseteo masivo a cero — ${loteId}`,
            documentoReferencia: loteId,
          },
          nombreUsuario
        );
        updateProduct(producto.id, resultado.product);
        movimientos++;
      });
    });

    setResultadoReset({ loteId, movimientos });
    setPasoReset('resultado');
    if (movimientos > 0) onRecargarMovimientos?.();
  };

  // ── Helpers de UI para reset ──────────────────────────────────────────────
  const productosFiltrados = allProducts.filter(p => {
    const q = textoBusqueda.toLowerCase();
    return p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q);
  });

  const alternarProducto = (id: string) => {
    const siguiente = new Set(productosSeleccionados);
    if (siguiente.has(id)) siguiente.delete(id); else siguiente.add(id);
    setProductosSeleccionados(siguiente);
  };

  const tieneErroresBloqueantes = resultadoParseo !== null &&
    (resultadoParseo.erroresPorFila.length > 0 || resultadoParseo.filas.length === 0);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

        {/* ═══ IMPORTAR STOCK ═══ */}
        <div>
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Importar stock desde Excel</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Descarga la plantilla con tus productos, completa las cantidades finales por almacén y vuelve a subir el archivo.
              La cantidad ingresada es el stock final — el sistema calculará el ajuste automáticamente.
            </p>
          </div>

          {/* Paso 1: descargar + subir */}
          {pasoImportacion === 'subir' && (
            <div className="space-y-4">
              {/* Bloque: plantilla */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Paso 1 — Descargar plantilla</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      La plantilla incluye todos tus productos con el stock actual por almacén. Solo edita las cantidades finales.
                    </p>
                    <button
                      onClick={descargarPlantilla}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Descargar plantilla Excel
                    </button>
                    {almacenesPlantilla.length > 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        {allProducts.length} productos · {almacenesPlantilla.length} almacén(es): {almacenesPlantilla.map(w => w.codigoAlmacen).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bloque: subir archivo */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-[#6F36FF]/10 dark:bg-[#6F36FF]/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#6F36FF] dark:text-[#8B5CF6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Paso 2 — Cargar archivo</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Edita la plantilla y vuelve a subirla aquí.</p>
                  </div>
                </div>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8">
                  <input
                    type="file"
                    accept=".csv,.txt,.xlsx,.xls"
                    onChange={manejarCargaArchivo}
                    className="hidden"
                    id="importacion-stock-archivo"
                  />
                  <label htmlFor="importacion-stock-archivo" className="cursor-pointer flex flex-col items-center gap-2">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Selecciona o arrastra tu archivo</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Excel (.xlsx, .xls) o CSV (.csv, .txt)</p>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Paso 2: vista previa y validación */}
          {pasoImportacion === 'previsualizar' && resultadoParseo && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Vista previa del archivo</p>
                <button
                  onClick={() => { setResultadoParseo(null); setPasoImportacion('subir'); }}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
                >
                  ← Cambiar archivo
                </button>
              </div>

              {resultadoParseo.esFormatoLegacy && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                    Formato antiguo detectado. Considera usar la nueva plantilla precargada para mayor comodidad.
                  </p>
                </div>
              )}

              {resultadoParseo.erroresPorFila.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-medium text-red-800 dark:text-red-300">
                    Errores ({resultadoParseo.erroresPorFila.length})
                  </p>
                  {resultadoParseo.erroresPorFila.slice(0, 5).map((e, i) => (
                    <p key={i} className="text-xs text-red-700 dark:text-red-400">
                      {e.codigo ? `[${e.codigo}] ` : ''}{e.columna ? `${e.columna}: ` : ''}{e.mensaje}
                    </p>
                  ))}
                  {resultadoParseo.erroresPorFila.length > 5 && (
                    <p className="text-xs text-red-500">... y {resultadoParseo.erroresPorFila.length - 5} más</p>
                  )}
                </div>
              )}

              {resultadoParseo.columnasDesconocidas.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                  <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">
                    Columnas no reconocidas (no se procesarán): {resultadoParseo.columnasDesconocidas.join(', ')}
                  </p>
                </div>
              )}

              {resultadoParseo.codigosDuplicados.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                  <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">
                    Códigos duplicados (se tomó solo el primero): {resultadoParseo.codigosDuplicados.slice(0, 10).join(', ')}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg px-4 py-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">{resultadoParseo.filas.length} productos</span>
                <span>·</span>
                <span>{resultadoParseo.esFormatoLegacy ? 'Formato legacy' : `${almacenesPlantilla.length} columnas de almacén`}</span>
              </div>

              {resultadoParseo.filas.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="max-h-56 overflow-auto">
                    <table className="min-w-full text-xs divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Código</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Producto</th>
                          {almacenesPlantilla.map(w => (
                            <th key={w.id} className="px-3 py-2 text-right font-medium text-gray-500 uppercase whitespace-nowrap" title={encabezadoAlmacen(w)}>
                              {w.codigoAlmacen}
                            </th>
                          ))}
                          <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                        {resultadoParseo.filas.slice(0, 30).map((fila, i) => {
                          const producto = allProducts.find(p => p.codigo.toUpperCase() === fila.codigo.toUpperCase());
                          return (
                            <tr key={i} className={!producto ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                              <td className="px-3 py-1.5 font-mono text-gray-900 dark:text-gray-200">{fila.codigo}</td>
                              <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300 max-w-[160px] truncate">{producto?.nombre ?? '—'}</td>
                              {almacenesPlantilla.map(w => {
                                const nuevaCantidad = fila.cantidadPorAlmacen[w.id];
                                const cantidadActual = producto?.stockPorAlmacen?.[w.id] ?? 0;
                                const hayDiferencia = nuevaCantidad !== null && nuevaCantidad !== undefined && nuevaCantidad !== cantidadActual;
                                return (
                                  <td key={w.id} className="px-3 py-1.5 text-right tabular-nums">
                                    {nuevaCantidad === null || nuevaCantidad === undefined
                                      ? <span className="text-gray-400">—</span>
                                      : <span className={hayDiferencia ? 'font-medium text-[#6F36FF]' : 'text-gray-600 dark:text-gray-400'}>{nuevaCantidad}</span>
                                    }
                                  </td>
                                );
                              })}
                              <td className="px-3 py-1.5">
                                {producto
                                  ? <span className="text-green-600 dark:text-green-400">✓</span>
                                  : <span className="text-red-600 dark:text-red-400">✗ No existe</span>
                                }
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  onClick={aplicarImportacion}
                  disabled={tieneErroresBloqueantes || resultadoParseo.filas.length === 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#6F36FF] hover:bg-[#5B2CE0] text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Aplicar cambios ({resultadoParseo.filas.length})
                </button>
              </div>
            </div>
          )}

          {/* Paso 3: resultado de importación */}
          {pasoImportacion === 'resultado' && resultadoImportacion && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
              <div className={`rounded-lg p-4 ${resultadoImportacion.movimientos > 0 ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700' : 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700'}`}>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {resultadoImportacion.movimientos > 0 ? '✅ Importación completada' : 'Sin cambios aplicados'}
                </p>
                <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <p>Movimientos generados: <span className="font-medium">{resultadoImportacion.movimientos}</span></p>
                  <p>Sin cambios (mismo stock): <span className="font-medium">{resultadoImportacion.sinCambios}</span></p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Lote: {resultadoImportacion.loteId}</p>
                </div>
              </div>

              {resultadoImportacion.noEncontrados.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                  <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">
                    Productos no encontrados ({resultadoImportacion.noEncontrados.length}): {resultadoImportacion.noEncontrados.slice(0, 15).join(', ')}
                    {resultadoImportacion.noEncontrados.length > 15 && ` y ${resultadoImportacion.noEncontrados.length - 15} más`}
                  </p>
                </div>
              )}

              {resultadoImportacion.errores.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
                  <p className="text-xs font-medium text-red-800 dark:text-red-300">Errores al aplicar ({resultadoImportacion.errores.length})</p>
                  {resultadoImportacion.errores.slice(0, 5).map((e, i) => (
                    <p key={i} className="text-xs text-red-700 dark:text-red-400 mt-0.5">{e}</p>
                  ))}
                </div>
              )}

              {resultadoImportacion.movimientos > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Revisa la pestaña Movimientos para ver el detalle.
                </p>
              )}

              <div className="flex justify-end pt-1">
                <button
                  onClick={() => { setPasoImportacion('subir'); setResultadoParseo(null); setResultadoImportacion(null); }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-[#6F36FF] dark:text-[#8B5CF6] border border-[#6F36FF]/30 hover:bg-[#6F36FF]/5 text-sm font-medium rounded-lg transition-colors"
                >
                  Nueva importación
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ═══ SEPARADOR ═══ */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-gray-50 dark:bg-gray-900 px-4 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Zona de cuidado
            </span>
          </div>
        </div>

        {/* ═══ RESETEAR STOCK ═══ */}
        <div>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-orange-700 dark:text-orange-400">Resetear stock a cero</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Pone el stock en 0 para los productos y almacenes seleccionados. Genera movimientos de ajuste negativo.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-orange-200 dark:border-orange-700/50 p-5 space-y-4">

            {pasoReset === 'formulario' && (
              <>
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-3">
                  <p className="text-xs text-orange-800 dark:text-orange-300">
                    ⚠️ Esta acción registrará movimientos de ajuste negativo y no se puede deshacer directamente.
                  </p>
                </div>

                {/* Selector de almacenes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-200">Almacenes a resetear</p>
                    <button
                      type="button"
                      onClick={() => setAplicarATodos(v => !v)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${aplicarATodos ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                      aria-label="Aplicar a todos"
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${aplicarATodos ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  {aplicarATodos
                    ? <p className="text-xs text-orange-600 dark:text-orange-400">Se resetearán los {almacenesActivos.length} almacenes activos</p>
                    : (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {almacenesActivos.map(w => (
                          <label key={w.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-all ${almacenesSeleccionados.includes(w.id) ? 'border-orange-300 bg-orange-50 dark:bg-orange-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
                            <input
                              type="checkbox"
                              checked={almacenesSeleccionados.includes(w.id)}
                              onChange={e => {
                                const ids = e.target.checked
                                  ? [...almacenesSeleccionados, w.id]
                                  : almacenesSeleccionados.filter(id => id !== w.id);
                                setAlmacenesSeleccionados(ids);
                              }}
                              className="w-3.5 h-3.5 text-orange-500"
                            />
                            <span className="text-gray-900 dark:text-gray-200">{w.nombreAlmacen}</span>
                            <span className="text-gray-400 ml-auto">{w.codigoAlmacen}</span>
                          </label>
                        ))}
                      </div>
                    )
                  }
                </div>

                {/* Buscador de productos */}
                <div>
                  <div className="relative mb-2">
                    <input
                      type="text"
                      placeholder="Buscar productos..."
                      value={textoBusqueda}
                      onChange={e => setTextoBusqueda(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-orange-400 dark:bg-gray-700 dark:text-white"
                    />
                    <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={productosSeleccionados.size === productosFiltrados.length && productosFiltrados.length > 0}
                        onChange={() => {
                          if (productosSeleccionados.size === productosFiltrados.length) {
                            setProductosSeleccionados(new Set());
                          } else {
                            setProductosSeleccionados(new Set(productosFiltrados.map(p => p.id)));
                          }
                        }}
                        className="w-3.5 h-3.5"
                      />
                      <span>Todos ({productosFiltrados.length})</span>
                    </label>
                    <span>{productosSeleccionados.size} seleccionados</span>
                  </div>
                  <div className="space-y-1 max-h-44 overflow-y-auto">
                    {productosFiltrados.map(p => (
                      <label key={p.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-all ${productosSeleccionados.has(p.id) ? 'border-orange-300 bg-orange-50 dark:bg-orange-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
                        <input
                          type="checkbox"
                          checked={productosSeleccionados.has(p.id)}
                          onChange={() => alternarProducto(p.id)}
                          className="w-3.5 h-3.5 text-orange-500"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{p.nombre}</span>
                          <span className="text-gray-400 ml-2 font-mono">{p.codigo}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setPasoReset('confirmar')}
                    disabled={productosSeleccionados.size === 0 || (!aplicarATodos && almacenesSeleccionados.length === 0)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Revisar reseteo ({productosSeleccionados.size} productos)
                  </button>
                </div>
              </>
            )}

            {pasoReset === 'confirmar' && (
              <div className="space-y-4">
                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4">
                  <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">⚠️ Confirmar reseteo de stock</p>
                  <div className="text-xs text-red-700 dark:text-red-400 space-y-1">
                    <p>Productos: <strong>{productosSeleccionados.size}</strong></p>
                    <p>Almacenes: <strong>{almacenesParaReset.length}</strong> — {almacenesParaReset.map(w => w.codigoAlmacen).join(', ')}</p>
                    <p className="text-[11px] text-red-500 mt-2">Solo se resetean productos con stock {'>'} 0. El resto se omite.</p>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setPasoReset('formulario')}
                    className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    ← Volver
                  </button>
                  <button
                    onClick={confirmarReset}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    Confirmar reset
                  </button>
                </div>
              </div>
            )}

            {pasoReset === 'resultado' && resultadoReset && (
              <div className="space-y-3">
                <div className={`rounded-lg p-4 ${resultadoReset.movimientos > 0 ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700' : 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700'}`}>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    {resultadoReset.movimientos > 0 ? '✅ Reseteo completado' : 'Sin cambios — stock ya era 0'}
                  </p>
                  <p className="text-xs text-gray-700 dark:text-gray-300">Movimientos: <strong>{resultadoReset.movimientos}</strong></p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Lote: {resultadoReset.loteId}</p>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setPasoReset('formulario');
                      setProductosSeleccionados(new Set());
                      setAlmacenesSeleccionados([]);
                      setAplicarATodos(false);
                      setResultadoReset(null);
                    }}
                    className="px-4 py-2 text-xs text-orange-600 dark:text-orange-400 border border-orange-300 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/10 rounded-lg transition-colors"
                  >
                    Nuevo reseteo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
};

export default PanelImportacionStock;
