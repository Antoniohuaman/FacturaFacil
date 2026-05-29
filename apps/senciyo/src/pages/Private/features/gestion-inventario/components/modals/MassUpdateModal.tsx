/* eslint-disable @typescript-eslint/no-explicit-any -- XLSX sheet_to_json retorna any[][] */
import React, { useState } from 'react';
import { useProductStore } from '../../../catalogo-articulos/hooks/useProductStore';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useUserSession } from '@/contexts/UserSessionContext';
import { InventoryService } from '../../services/inventory.service';
import { useAuth } from '../../../autenticacion/hooks';
import { isProductEnabledForEstablecimiento } from '../../../catalogo-articulos/models/types';
import type { Almacen } from '../../../configuracion-sistema/modelos/Almacen';
import * as XLSX from 'xlsx';

// ─── Props ────────────────────────────────────────────────────────────────────

interface MassUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Callback invocado después de una operación exitosa (reset o importación). */
  onSuccess?: () => void;
}

// ─── Tipos internos ───────────────────────────────────────────────────────────

/** Una fila del archivo: codigo + cantidad final por almacén (null = sin cambio) */
type ParsedRow = {
  codigo: string;
  /** Clave: ID del almacén. Valor: stock final deseado, null = celda vacía (sin cambio). */
  warehouseQty: Record<string, number | null>;
};

type ParseResult = {
  rows: ParsedRow[];
  duplicateCodes: string[];
  unknownColumns: string[];
  rowErrors: Array<{ codigo: string; column: string; message: string }>;
  isLegacy: boolean;
};

type ImportResult = {
  lotId: string;
  movements: number;
  noChange: number;
  notFound: string[];
  errors: string[];
};

type ResetResult = {
  lotId: string;
  movements: number;
};

// ─── Helpers puros (fuera del componente) ────────────────────────────────────

const buildLotId = (prefix: 'IMP' | 'RST'): string => {
  const d = new Date();
  const p = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${prefix}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

/** Cabecera de columna de almacén en la plantilla: "{codigo} - {nombre}" */
const almacenToHeader = (w: Almacen): string => `${w.codigoAlmacen} - ${w.nombreAlmacen}`;

// Columnas informativas que no se procesan como almacenes
const INFO_COLS = new Set([
  'codigo', 'code', 'producto', 'product', 'nombre', 'name',
  'unidad', 'unit', 'stock_total_actual', 'stock total actual',
]);

/** Detecta si el archivo usa el nuevo formato (tiene columna PRODUCTO) o el legacy */
const detectIsNewFormat = (headers: string[]): boolean =>
  headers.some(h => {
    const n = h.toLowerCase().trim();
    return n === 'producto' || n === 'product' || n === 'nombre' || n === 'name';
  });

// ─── Parseo del nuevo formato ─────────────────────────────────────────────────

function parseNewFormat(rawHeaders: string[], rawRows: any[][], almacenes: Almacen[]): ParseResult {
  const headers = rawHeaders.map(h => String(h ?? '').trim());

  const codigoIdx = headers.findIndex(h => {
    const n = h.toLowerCase();
    return n === 'codigo' || n === 'code';
  });
  if (codigoIdx === -1) {
    return {
      rows: [], duplicateCodes: [], unknownColumns: [],
      rowErrors: [{ codigo: '', column: 'CODIGO', message: 'No se encontró la columna CODIGO en el archivo.' }],
      isLegacy: false,
    };
  }

  // Mapa: headerLower → almacenId
  const headerToAlmacenId = new Map<string, string>();
  almacenes.forEach(w => headerToAlmacenId.set(almacenToHeader(w).toLowerCase(), w.id));

  const warehouseCols: Array<{ idx: number; almacenId: string }> = [];
  const unknownColumns: string[] = [];

  headers.forEach((h, idx) => {
    if (idx === codigoIdx) return;
    const lower = h.toLowerCase();
    if (!h || INFO_COLS.has(lower)) return;
    const almacenId = headerToAlmacenId.get(lower);
    if (almacenId) {
      warehouseCols.push({ idx, almacenId });
    } else {
      unknownColumns.push(h);
    }
  });

  const seenCodes = new Set<string>();
  const duplicateCodes: string[] = [];
  const rowErrors: ParseResult['rowErrors'] = [];
  const rows: ParsedRow[] = [];

  for (const raw of rawRows) {
    const codigo = String(raw[codigoIdx] ?? '').trim();
    if (!codigo) continue;

    const codigoUpper = codigo.toUpperCase();
    if (seenCodes.has(codigoUpper)) {
      if (!duplicateCodes.includes(codigo)) duplicateCodes.push(codigo);
      continue; // Salta duplicados para evitar comportamiento ambiguo
    }
    seenCodes.add(codigoUpper);

    const warehouseQty: Record<string, number | null> = {};
    for (const { idx, almacenId } of warehouseCols) {
      const rawVal = raw[idx];
      if (rawVal === null || rawVal === undefined || String(rawVal).trim() === '') {
        warehouseQty[almacenId] = null; // Celda vacía = sin cambio
        continue;
      }
      const parsed = parseFloat(String(rawVal));
      if (isNaN(parsed)) {
        rowErrors.push({ codigo, column: headers[idx], message: `"${rawVal}" no es un número válido` });
        warehouseQty[almacenId] = null;
      } else {
        warehouseQty[almacenId] = parsed;
      }
    }
    rows.push({ codigo, warehouseQty });
  }

  return { rows, duplicateCodes, unknownColumns, rowErrors, isLegacy: false };
}

// ─── Parseo del formato legacy ────────────────────────────────────────────────

/**
 * Formato antiguo: CODIGO | ALMACEN (opcional) | CANTIDAD
 * Se mantiene compatibilidad para no romper archivos ya generados.
 * '_ALL' como clave indica "aplicar a todos los almacenes del establecimiento".
 */
function parseLegacyFormat(rawHeaders: string[], rawRows: any[][], almacenes: Almacen[]): ParseResult {
  const headers = rawHeaders.map(h => String(h ?? '').toLowerCase().trim());
  const codigoIdx = headers.findIndex(h => h.includes('codigo') || h === 'code');
  const almacenIdx = headers.findIndex(h => h.includes('almacen'));
  const cantidadIdx = headers.findIndex(
    h => h.includes('cantidad') || (h.includes('stock') && !h.includes('_total')) || h === 'qty'
  );

  if (codigoIdx === -1 || cantidadIdx === -1) {
    return {
      rows: [], duplicateCodes: [], unknownColumns: [],
      rowErrors: [{ codigo: '', column: 'CODIGO/CANTIDAD', message: 'Formato antiguo: se requieren columnas CODIGO y CANTIDAD.' }],
      isLegacy: true,
    };
  }

  const codeToAlmacenId = new Map<string, string>();
  almacenes.forEach(w => codeToAlmacenId.set((w.codigoAlmacen ?? w.id).toUpperCase(), w.id));

  const seenKeys = new Set<string>();
  const duplicateCodes: string[] = [];
  const unknownColumns: string[] = [];
  const rowErrors: ParseResult['rowErrors'] = [];
  const rows: ParsedRow[] = [];

  for (const raw of rawRows) {
    const codigo = String(raw[codigoIdx] ?? '').trim();
    if (!codigo) continue;

    const rawAlmacen = almacenIdx !== -1 ? String(raw[almacenIdx] ?? '').trim() : '';
    const rawQty = raw[cantidadIdx];
    const qty = parseFloat(String(rawQty ?? ''));

    if (isNaN(qty)) {
      rowErrors.push({ codigo, column: 'CANTIDAD', message: `"${rawQty}" no es un número válido` });
      continue;
    }

    let almacenId: string | null = null;
    if (rawAlmacen) {
      almacenId = codeToAlmacenId.get(rawAlmacen.toUpperCase()) ?? null;
      if (!almacenId && !unknownColumns.includes(rawAlmacen)) {
        unknownColumns.push(rawAlmacen);
        continue; // No procesar fila con almacén desconocido
      }
    }

    const key = `${codigo.toUpperCase()}|${almacenId ?? '_ALL'}`;
    if (seenKeys.has(key)) {
      if (!duplicateCodes.includes(codigo)) duplicateCodes.push(codigo);
      continue;
    }
    seenKeys.add(key);

    // '_ALL' = aplicar a todos (se resuelve en la fase de aplicación)
    const warehouseQty: Record<string, number | null> = {};
    warehouseQty[almacenId ?? '_ALL'] = qty;
    rows.push({ codigo, warehouseQty });
  }

  return { rows, duplicateCodes, unknownColumns, rowErrors, isLegacy: true };
}

// ─── Componente ───────────────────────────────────────────────────────────────

const MassUpdateModal: React.FC<MassUpdateModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { allProducts, updateProduct } = useProductStore();
  const { user } = useAuth();
  const { session } = useUserSession();
  const { state: configState } = useConfigurationContext();

  const establecimientoId = session?.currentEstablecimientoId ?? null;
  const almacenesActivos: Almacen[] = configState.almacenes.filter(w => w.estaActivoAlmacen);
  // Almacenes del establecimiento actual; si no hay filtro activo, usa todos
  const almacenesEstab = establecimientoId
    ? almacenesActivos.filter(w => w.establecimientoId === establecimientoId)
    : almacenesActivos;
  const almacenesPlantilla = almacenesEstab.length > 0 ? almacenesEstab : almacenesActivos;

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'import' | 'reset'>('import');

  // ── Estado del tab Import ─────────────────────────────────────────────────
  type ImportStep = 'upload' | 'preview' | 'result';
  const [importStep, setImportStep] = useState<ImportStep>('upload');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // ── Estado del tab Reset ──────────────────────────────────────────────────
  type ResetStep = 'form' | 'confirm' | 'result';
  const [resetStep, setResetStep] = useState<ResetStep>('form');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [aplicarATodos, setAplicarATodos] = useState(false);
  const [almacenesSeleccionados, setAlmacenesSeleccionados] = useState<string[]>([]);
  const [resetResult, setResetResult] = useState<ResetResult | null>(null);

  // ── Early return (hooks ya declarados arriba) ─────────────────────────────
  if (!isOpen) return null;

  const userName = user?.nombre || session?.userName || 'Usuario';

  // ── handleClose: limpia todo el estado al cerrar ──────────────────────────
  const handleClose = () => {
    setActiveTab('import');
    setImportStep('upload');
    setParseResult(null);
    setImportResult(null);
    setResetStep('form');
    setSelectedProducts(new Set());
    setSearchTerm('');
    setAplicarATodos(false);
    setAlmacenesSeleccionados([]);
    setResetResult(null);
    onClose();
  };

  // ── Plantilla precargada ──────────────────────────────────────────────────
  const handleDownloadTemplate = () => {
    // Filtrar productos por establecimiento si hay uno seleccionado
    const productos = establecimientoId
      ? allProducts.filter(p => isProductEnabledForEstablecimiento(p, establecimientoId))
      : allProducts;

    if (productos.length === 0) {
      // Sin productos → plantilla vacía con headers correctos para orientar al usuario
    }

    // La plantilla de importación solo incluye columnas editables (sin total calculado).
    // El total es una consecuencia de la suma por almacén, no un dato editable.
    const warehouseHeaders = almacenesPlantilla.map(almacenToHeader);
    const headers = ['CODIGO', 'PRODUCTO', 'UNIDAD', ...warehouseHeaders];

    const dataRows = [...productos]
      .sort((a, b) => a.codigo.localeCompare(b.codigo))
      .map(p => {
        const stockPorAlmacen = almacenesPlantilla.map(w => p.stockPorAlmacen?.[w.id] ?? 0);
        return [p.codigo, p.nombre, p.unidad || '', ...stockPorAlmacen];
      });

    const wsData = [headers, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wch: 15 }, // CODIGO
      { wch: 35 }, // PRODUCTO
      { wch: 10 }, // UNIDAD
      ...almacenesPlantilla.map(() => ({ wch: 18 })),
    ];

    // Hoja de instrucciones
    const instrucciones: (string | number)[][] = [
      ['INSTRUCCIONES DE IMPORTACIÓN DE STOCK'],
      [''],
      ['1. Edita SOLO las columnas de almacén (las que tienen el nombre del almacén).'],
      ['2. Ingresa el stock FINAL deseado para cada producto en cada almacén.'],
      ['3. El sistema calculará el ajuste automáticamente (no es una suma).'],
      ['4. Si dejas una celda de almacén vacía, ese almacén no se modifica.'],
      ['5. CODIGO, PRODUCTO, UNIDAD y STOCK_TOTAL_ACTUAL son solo informativos. No los edites.'],
      [''],
      ['Ejemplo:'],
      ['- Stock actual en Almacén 0001: 20 unidades'],
      ['- Ingresaste en el Excel: 50'],
      ['- Resultado: stock final = 50, ajuste +30'],
      [''],
      ['Almacenes incluidos en esta plantilla:'],
      ...almacenesPlantilla.map(w => [`  ${almacenToHeader(w)}`]),
    ];
    const wsInstr = XLSX.utils.aoa_to_sheet(instrucciones);
    wsInstr['!cols'] = [{ wch: 70 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock');
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instrucciones');

    const d = new Date();
    const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    XLSX.writeFile(wb, `Plantilla_Stock_${dateStr}.xlsx`);
  };

  // ── Carga y parseo del archivo ────────────────────────────────────────────
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    // Reset el input para que se pueda volver a subir el mismo archivo
    event.target.value = '';

    const reader = new FileReader();
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    reader.onload = (e) => {
      try {
        let rawHeaders: string[] = [];
        let rawRows: any[][] = [];

        if (isExcel) {
          const data = e.target?.result;
          const wb = XLSX.read(data, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
          if (json.length < 2) {
            setParseResult({
              rows: [], duplicateCodes: [], unknownColumns: [],
              rowErrors: [{ codigo: '', column: '', message: 'El archivo está vacío o solo tiene encabezados.' }],
              isLegacy: false,
            });
            setImportStep('preview');
            return;
          }
          rawHeaders = json[0].map((h: any) => String(h ?? '').trim());
          rawRows = json.slice(1).filter(r => r.some((c: any) => String(c ?? '').trim() !== ''));
        } else {
          // CSV / TXT
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(l => l.trim());
          if (lines.length < 2) {
            setParseResult({
              rows: [], duplicateCodes: [], unknownColumns: [],
              rowErrors: [{ codigo: '', column: '', message: 'El archivo está vacío o solo tiene encabezados.' }],
              isLegacy: false,
            });
            setImportStep('preview');
            return;
          }
          const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
          rawHeaders = lines[0].split(sep).map(h => h.trim());
          rawRows = lines.slice(1).map(l => l.split(sep).map(c => c.trim()));
        }

        const isNew = detectIsNewFormat(rawHeaders);
        const result = isNew
          ? parseNewFormat(rawHeaders, rawRows, almacenesPlantilla)
          : parseLegacyFormat(rawHeaders, rawRows, almacenesActivos);

        setParseResult(result);
        setImportStep('preview');
      } catch (err) {
        setParseResult({
          rows: [], duplicateCodes: [], unknownColumns: [],
          rowErrors: [{ codigo: '', column: '', message: `Error al leer el archivo: ${err instanceof Error ? err.message : 'Error desconocido'}` }],
          isLegacy: false,
        });
        setImportStep('preview');
      }
    };

    if (isExcel) {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsText(file);
    }
  };

  // ── Aplicar importación ────────────────────────────────────────────────────
  const handleApplyImport = () => {
    if (!parseResult || parseResult.rows.length === 0) return;

    const lotId = buildLotId('IMP');
    const notFound: string[] = [];
    const errors: string[] = [];
    let movements = 0;
    let noChange = 0;

    // Mapa almacenId → Almacen para búsqueda rápida
    const almacenMap = new Map<string, Almacen>(almacenesActivos.map(w => [w.id, w]));

    for (const row of parseResult.rows) {
      let currentProduct = allProducts.find(
        p => p.codigo.trim().toUpperCase() === row.codigo.trim().toUpperCase()
      );
      if (!currentProduct) {
        notFound.push(row.codigo);
        continue;
      }

      // Para legacy sin almacén (_ALL), aplica a todos los almacenes de la plantilla
      let entries = Object.entries(row.warehouseQty);
      if (parseResult.isLegacy && entries.length === 1 && entries[0][0] === '_ALL') {
        const qty = entries[0][1];
        entries = almacenesPlantilla.map(w => [w.id, qty]);
      }

      for (const [almacenId, newQty] of entries) {
        if (newQty === null) continue; // Celda vacía = sin cambio

        const almacen = almacenMap.get(almacenId);
        if (!almacen) continue; // Almacén desconocido (ya reportado en parseo)

        const stockActual = currentProduct.stockPorAlmacen?.[almacenId] ?? 0;
        if (stockActual === newQty) {
          noChange++;
          continue;
        }

        const diferencia = newQty - stockActual;
        const tipo: 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO' = diferencia > 0 ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO';

        try {
          const result = InventoryService.registerAdjustment(
            currentProduct,
            almacen,
            {
              productoId: currentProduct.id,
              almacenId,
              tipo,
              motivo: 'AJUSTE_INVENTARIO',
              cantidad: Math.abs(diferencia),
              observaciones: `Importación masiva: ${stockActual} → ${newQty}`,
              documentoReferencia: lotId,
            },
            userName
          );
          // Actualizar referencia local para que el siguiente almacén del mismo producto
          // vea el stock correcto (no el snapshot inicial)
          updateProduct(currentProduct.id, result.product);
          currentProduct = result.product;
          movements++;
        } catch (err) {
          errors.push(`${row.codigo} [${almacen.codigoAlmacen}]: ${err instanceof Error ? err.message : 'Error'}`);
        }
      }
    }

    setImportResult({ lotId, movements, noChange, notFound, errors });
    setImportStep('result');
    if (movements > 0) onSuccess?.();
  };

  // ── Resetear stock ─────────────────────────────────────────────────────────
  const almacenesParaReset = aplicarATodos
    ? almacenesActivos
    : almacenesActivos.filter(w => almacenesSeleccionados.includes(w.id));

  const handleConfirmReset = () => {
    const lotId = buildLotId('RST');
    let movements = 0;

    almacenesParaReset.forEach(almacen => {
      selectedProducts.forEach(productId => {
        const producto = allProducts.find(p => p.id === productId);
        if (!producto) return;
        const stockActual = producto.stockPorAlmacen?.[almacen.id] ?? 0;
        if (stockActual <= 0) return;

        const result = InventoryService.registerAdjustment(
          producto,
          almacen,
          {
            productoId: producto.id,
            almacenId: almacen.id,
            tipo: 'AJUSTE_NEGATIVO',
            motivo: 'AJUSTE_INVENTARIO',
            cantidad: stockActual,
            observaciones: `Reseteo masivo a cero — Lote ${lotId}`,
            documentoReferencia: lotId,
          },
          userName
        );
        updateProduct(producto.id, result.product);
        movements++;
      });
    });

    setResetResult({ lotId, movements });
    setResetStep('result');
    if (movements > 0) onSuccess?.();
  };

  // ── Helpers para filtrar productos en el Reset ────────────────────────────
  const filteredProducts = allProducts.filter(p => {
    const q = searchTerm.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(q) ||
      p.codigo.toLowerCase().includes(q)
    );
  });

  const toggleProduct = (id: string) => {
    const next = new Set(selectedProducts);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedProducts(next);
  };

  // ── Validación para habilitar el botón de aplicar ────────────────────────
  const hasBlockingErrors =
    parseResult !== null &&
    (parseResult.rowErrors.length > 0 || parseResult.rows.length === 0);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">

          {/* Header */}
          <div className="bg-gradient-to-r from-[#6F36FF] to-[#5B2CE0] px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Actualización Masiva de Stock</h3>
                  <p className="text-sm text-white/80">
                    {activeTab === 'import' ? 'Importar stock desde Excel' : 'Resetear stock a cero'}
                  </p>
                </div>
              </div>
              <button onClick={handleClose} className="text-white/80 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('import')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'import'
                    ? 'border-[#6F36FF] text-[#6F36FF] dark:text-[#8B5CF6]'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>Importar stock</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('reset')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'reset'
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Resetear stock</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">

            {/* ═══════════════ TAB: IMPORT ═══════════════ */}
            {activeTab === 'import' && (
              <div className="space-y-4">

                {/* Paso 1: subir archivo */}
                {importStep === 'upload' && (
                  <>
                    {/* Info */}
                    <div className="bg-[#6F36FF]/5 border border-[#6F36FF]/20 rounded-lg p-4">
                      <p className="text-sm font-medium text-[#6F36FF] dark:text-[#8B5CF6] mb-1">
                        ¿Cómo funciona?
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Descarga la plantilla con tus productos precargados. Edita solo las cantidades finales por almacén. La cantidad ingresada es el stock final — el sistema calculará el ajuste automáticamente.
                      </p>
                      {almacenesPlantilla.length > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Almacenes en la plantilla: {almacenesPlantilla.map(w => w.nombreAlmacen).join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Descargar plantilla */}
                    <button
                      onClick={handleDownloadTemplate}
                      className="w-full px-4 py-3 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-700 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                    >
                      <div className="flex items-center justify-center space-x-2 text-green-700 dark:text-green-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="font-medium">Descargar Plantilla Excel (.xlsx)</span>
                      </div>
                      <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                        {allProducts.length} productos precargados con stock actual
                      </p>
                    </button>

                    {/* Zona de carga */}
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8">
                      <input
                        type="file"
                        accept=".csv,.txt,.xlsx,.xls"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="stock-file-upload"
                      />
                      <label htmlFor="stock-file-upload" className="cursor-pointer flex flex-col items-center space-y-2">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Selecciona o arrastra tu archivo aquí
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Excel (.xlsx, .xls) o CSV (.csv, .txt)</p>
                      </label>
                    </div>
                  </>
                )}

                {/* Paso 2: vista previa y validación */}
                {importStep === 'preview' && parseResult && (
                  <div className="space-y-3">
                    {/* Banner de formato legacy */}
                    {parseResult.isLegacy && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
                        <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">Formato antiguo detectado</p>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                          Se reconoció el formato CODIGO/ALMACEN/CANTIDAD. Considera usar la nueva plantilla precargada para mayor comodidad.
                        </p>
                      </div>
                    )}

                    {/* Errores de parseo */}
                    {parseResult.rowErrors.length > 0 && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 space-y-1">
                        <p className="text-sm font-medium text-red-800 dark:text-red-300">
                          Errores en el archivo ({parseResult.rowErrors.length})
                        </p>
                        {parseResult.rowErrors.slice(0, 5).map((e, i) => (
                          <p key={i} className="text-xs text-red-700 dark:text-red-400">
                            {e.codigo ? `[${e.codigo}] ` : ''}{e.column ? `${e.column}: ` : ''}{e.message}
                          </p>
                        ))}
                        {parseResult.rowErrors.length > 5 && (
                          <p className="text-xs text-red-600 dark:text-red-500">... y {parseResult.rowErrors.length - 5} más</p>
                        )}
                      </div>
                    )}

                    {/* Columnas desconocidas */}
                    {parseResult.unknownColumns.length > 0 && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                          Columnas/almacenes no reconocidos — no se procesarán
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                          {parseResult.unknownColumns.join(', ')}
                        </p>
                      </div>
                    )}

                    {/* Duplicados */}
                    {parseResult.duplicateCodes.length > 0 && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                          Códigos duplicados — se tomó solo el primero
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                          {parseResult.duplicateCodes.slice(0, 10).join(', ')}
                          {parseResult.duplicateCodes.length > 10 && ` y ${parseResult.duplicateCodes.length - 10} más`}
                        </p>
                      </div>
                    )}

                    {/* Resumen */}
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg px-4 py-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{parseResult.rows.length} productos</span>
                      {parseResult.isLegacy
                        ? <span>· Formato legacy</span>
                        : <span>· {almacenesPlantilla.length} columnas de almacén</span>
                      }
                    </div>

                    {/* Tabla de vista previa */}
                    {parseResult.rows.length > 0 && (
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Vista previa — {Math.min(parseResult.rows.length, 30)} de {parseResult.rows.length}
                          </h4>
                        </div>
                        <div className="max-h-52 overflow-auto">
                          <table className="min-w-full text-xs divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Código</th>
                                <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Producto</th>
                                {almacenesPlantilla.map(w => (
                                  <th key={w.id} className="px-3 py-2 text-right font-medium text-gray-500 uppercase whitespace-nowrap">
                                    {w.codigoAlmacen}
                                  </th>
                                ))}
                                <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Estado</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                              {parseResult.rows.slice(0, 30).map((row, i) => {
                                const producto = allProducts.find(
                                  p => p.codigo.toUpperCase() === row.codigo.toUpperCase()
                                );
                                return (
                                  <tr key={i} className={!producto ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                                    <td className="px-3 py-1.5 font-mono text-gray-900 dark:text-gray-200">{row.codigo}</td>
                                    <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300 max-w-[180px] truncate">{producto?.nombre ?? '—'}</td>
                                    {almacenesPlantilla.map(w => {
                                      const newQty = row.warehouseQty[w.id];
                                      const curQty = producto?.stockPorAlmacen?.[w.id] ?? 0;
                                      const changed = newQty !== null && newQty !== curQty;
                                      return (
                                        <td key={w.id} className="px-3 py-1.5 text-right tabular-nums">
                                          {newQty === null || newQty === undefined ? (
                                            <span className="text-gray-400">—</span>
                                          ) : (
                                            <span className={changed ? 'font-medium text-[#6F36FF]' : 'text-gray-600 dark:text-gray-400'}>
                                              {newQty}
                                            </span>
                                          )}
                                        </td>
                                      );
                                    })}
                                    <td className="px-3 py-1.5">
                                      {producto ? (
                                        <span className="text-green-600 dark:text-green-400">✓ Encontrado</span>
                                      ) : (
                                        <span className="text-red-600 dark:text-red-400">✗ No existe</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Paso 3: resultado */}
                {importStep === 'result' && importResult && (
                  <div className="space-y-3">
                    <div className={`rounded-lg p-4 ${importResult.movements > 0 ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700' : 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700'}`}>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {importResult.movements > 0 ? '✅ Importación completada' : 'Sin cambios aplicados'}
                      </p>
                      <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        <p>Movimientos generados: <span className="font-medium">{importResult.movements}</span></p>
                        <p>Sin cambios (mismo stock): <span className="font-medium">{importResult.noChange}</span></p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Lote: {importResult.lotId}</p>
                      </div>
                    </div>

                    {importResult.notFound.length > 0 && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                          Productos no encontrados ({importResult.notFound.length})
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                          {importResult.notFound.slice(0, 15).join(', ')}
                          {importResult.notFound.length > 15 && ` y ${importResult.notFound.length - 15} más`}
                        </p>
                      </div>
                    )}

                    {importResult.errors.length > 0 && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
                        <p className="text-sm font-medium text-red-800 dark:text-red-300">
                          Errores durante la aplicación ({importResult.errors.length})
                        </p>
                        {importResult.errors.slice(0, 5).map((e, i) => (
                          <p key={i} className="text-xs text-red-700 dark:text-red-400 mt-0.5">{e}</p>
                        ))}
                      </div>
                    )}

                    {importResult.movements > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Los movimientos pueden verse en la pestaña Movimientos de Inventario.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════ TAB: RESET ═══════════════ */}
            {activeTab === 'reset' && (
              <div className="space-y-4">

                {/* Paso 1: selección */}
                {resetStep === 'form' && (
                  <>
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
                      <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                        ⚠️ Acción destructiva — Resetear stock a cero
                      </p>
                      <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                        Se pondrá el stock en 0 y se registrará un movimiento de ajuste negativo por la diferencia. Esta acción no se puede deshacer directamente.
                      </p>
                    </div>

                    {/* Selector de almacenes */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-200">Almacenes a resetear</p>
                        <button
                          type="button"
                          onClick={() => setAplicarATodos(v => !v)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${aplicarATodos ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${aplicarATodos ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                      {aplicarATodos ? (
                        <p className="text-sm text-orange-700 dark:text-orange-400">
                          Se resetearán los <strong>{almacenesActivos.length}</strong> almacenes activos
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {almacenesActivos.map(w => (
                            <label key={w.id} className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${almacenesSeleccionados.includes(w.id) ? 'border-orange-300 bg-orange-50 dark:bg-orange-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
                              <input
                                type="checkbox"
                                checked={almacenesSeleccionados.includes(w.id)}
                                onChange={e => {
                                  const ids = e.target.checked
                                    ? [...almacenesSeleccionados, w.id]
                                    : almacenesSeleccionados.filter(id => id !== w.id);
                                  setAlmacenesSeleccionados(ids);
                                }}
                                className="w-4 h-4 text-orange-500"
                              />
                              <span className="text-sm text-gray-900 dark:text-gray-200">{w.nombreAlmacen}</span>
                              <span className="text-xs text-gray-500 ml-auto">{w.codigoAlmacen}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Buscador de productos */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Buscar productos..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-700 dark:text-white"
                      />
                      <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                          onChange={() => {
                            if (selectedProducts.size === filteredProducts.length) {
                              setSelectedProducts(new Set());
                            } else {
                              setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span>Seleccionar todos ({filteredProducts.length})</span>
                      </label>
                      <span>{selectedProducts.size} seleccionados</span>
                    </div>

                    <div className="space-y-1.5 max-h-52 overflow-y-auto">
                      {filteredProducts.map(p => (
                        <label
                          key={p.id}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${selectedProducts.has(p.id) ? 'border-orange-300 bg-orange-50 dark:bg-orange-900/10' : 'border-gray-200 dark:border-gray-700'}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(p.id)}
                            onChange={() => toggleProduct(p.id)}
                            className="w-4 h-4 text-orange-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.nombre}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{p.codigo}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </>
                )}

                {/* Paso 2: confirmación del reset */}
                {resetStep === 'confirm' && (
                  <div className="space-y-4">
                    <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4">
                      <p className="text-base font-semibold text-red-800 dark:text-red-300 mb-3">
                        ⚠️ Confirma el reseteo de stock
                      </p>
                      <div className="space-y-2 text-sm text-red-700 dark:text-red-400">
                        <p>Productos a resetear: <span className="font-bold">{selectedProducts.size}</span></p>
                        <p>Almacenes afectados: <span className="font-bold">{almacenesParaReset.length}</span> — {almacenesParaReset.map(w => w.codigoAlmacen).join(', ')}</p>
                        <p>Movimientos a crear (máximo): <span className="font-bold">{selectedProducts.size * almacenesParaReset.length}</span></p>
                      </div>
                      <p className="mt-3 text-xs text-red-600 dark:text-red-500">
                        Se registrará un movimiento AJUSTE_NEGATIVO por cada producto con stock {'>'} 0. Los productos con stock en 0 se omiten.
                      </p>
                    </div>
                  </div>
                )}

                {/* Paso 3: resultado del reset */}
                {resetStep === 'result' && resetResult && (
                  <div className="space-y-3">
                    <div className={`rounded-lg p-4 ${resetResult.movements > 0 ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700' : 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700'}`}>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {resetResult.movements > 0 ? '✅ Reseteo completado' : 'Sin cambios — los productos ya tenían stock en 0'}
                      </p>
                      <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        <p>Movimientos generados: <span className="font-medium">{resetResult.movements}</span></p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Lote: {resetResult.lotId}</p>
                      </div>
                    </div>
                    {resetResult.movements > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Los movimientos pueden verse en la pestaña Movimientos de Inventario.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            {/* Botón izquierdo */}
            <div>
              {(importStep === 'preview' || resetStep === 'confirm') && (
                <button
                  onClick={() => {
                    if (importStep === 'preview') setImportStep('upload');
                    if (resetStep === 'confirm') setResetStep('form');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  ← Volver
                </button>
              )}
            </div>

            {/* Botones derecha */}
            <div className="flex gap-3">
              {/* Cancel / Cerrar */}
              {importStep !== 'result' && resetStep !== 'result' && (
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
              )}
              {(importStep === 'result' || resetStep === 'result') && (
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#6F36FF] rounded-md hover:bg-[#5B2CE0] transition-colors"
                >
                  Cerrar
                </button>
              )}

              {/* Acción principal: Import */}
              {activeTab === 'import' && importStep === 'preview' && parseResult && (
                <button
                  onClick={handleApplyImport}
                  disabled={hasBlockingErrors || parseResult.rows.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#6F36FF] rounded-md hover:bg-[#5B2CE0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Aplicar cambios ({parseResult.rows.length})
                </button>
              )}

              {/* Acción principal: Reset form → confirm */}
              {activeTab === 'reset' && resetStep === 'form' && (
                <button
                  onClick={() => {
                    if (selectedProducts.size === 0) return;
                    if (!aplicarATodos && almacenesSeleccionados.length === 0) return;
                    setResetStep('confirm');
                  }}
                  disabled={selectedProducts.size === 0 || (!aplicarATodos && almacenesSeleccionados.length === 0)}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Revisar reseteo ({selectedProducts.size})
                </button>
              )}

              {/* Acción principal: Reset confirm → execute */}
              {activeTab === 'reset' && resetStep === 'confirm' && (
                <button
                  onClick={handleConfirmReset}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                >
                  Confirmar reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MassUpdateModal;
