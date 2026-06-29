import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { CheckSquare, HelpCircle, Package, Search, Square, Trash2, X } from 'lucide-react';
import { ConfigurationCard } from '../../../comprobantes-electronicos/shared/form-core/components/ConfigurationCard';
import { useProductStore, type ProductInput } from '../../../catalogo-articulos/hooks/useProductStore';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import ProductModal from '../../../catalogo-articulos/components/ProductModal';
import type { Product } from '../../../catalogo-articulos/models/types';
import { BIENES_NORMALIZADOS } from '../../../configuracion-sistema/datos/catalogosGRE';
import type { BienGRE, UnidadPeso } from '../../modelos/GuiaRemision';
import { BIEN_GRE_VACIO } from '../../modelos/GuiaRemision';
import { getUnitDisplayForUI } from '@/shared/units/unitDisplay';

// ── Column system ──────────────────────────────────────────────────────────
type GREColumnId =
  | 'producto'
  | 'codigo'
  | 'cantidad'
  | 'unidad'
  | 'descripcion'
  | 'imagen'
  | 'alias'
  | 'marca'
  | 'modelo'
  | 'categoria'
  | 'tipoProducto'
  | 'tipoExistencia'
  | 'codigoBarras'
  | 'codigoFabrica'
  | 'peso'
  | 'stock'
  | 'normalizado'
  | 'codigoProductoSunat'
  | 'subpartidaNacional'
  | 'codigoGTIN'
  | 'accion';

interface GREColumnConfig {
  id: GREColumnId;
  label: string;
  isFixed: boolean;
  isFixedEnd?: boolean;
  /** No genera columna de tabla propia; su visibilidad controla el render dentro de 'producto'. */
  isEmbedded?: boolean;
  isVisible: boolean;
  width?: string;
  minWidth?: string;
  align?: 'left' | 'center' | 'right';
  order: number;
}

const DEFAULT_GRE_COLUMNS: GREColumnConfig[] = [
  // Fijas inicio
  { id: 'producto',            label: 'Producto',        isFixed: true,  isVisible: true,  align: 'left',   width: '240px', minWidth: '160px', order: 1   },
  { id: 'codigo',              label: 'Código',           isFixed: true,  isVisible: true,  align: 'left',   width: '90px',     order: 2   },
  { id: 'cantidad',            label: 'Cant.',            isFixed: true,  isVisible: true,  align: 'center', width: '88px',     order: 3   },
  { id: 'unidad',              label: 'Unidad',           isFixed: true,  isVisible: true,  align: 'left',   width: '115px',    order: 4   },
  // Embebida — toggle controla input dentro de columna Producto, sin columna propia
  { id: 'descripcion',         label: 'Descripción',      isFixed: false, isVisible: false, isEmbedded: true,                   order: 9   },
  // Opcionales — columnas propias (info del catálogo, solo lectura)
  { id: 'imagen',              label: 'Imagen',           isFixed: false, isVisible: false, align: 'center', width: '68px',     order: 10  },
  { id: 'alias',               label: 'Alias',            isFixed: false, isVisible: false, align: 'left',   minWidth: '100px', order: 11  },
  { id: 'marca',               label: 'Marca',            isFixed: false, isVisible: false, align: 'left',   width: '100px',    order: 12  },
  { id: 'modelo',              label: 'Modelo',           isFixed: false, isVisible: false, align: 'left',   width: '100px',    order: 13  },
  { id: 'categoria',           label: 'Categoría',        isFixed: false, isVisible: false, align: 'left',   width: '110px',    order: 14  },
  { id: 'tipoProducto',        label: 'Tipo',             isFixed: false, isVisible: false, align: 'center', width: '80px',     order: 15  },
  { id: 'tipoExistencia',      label: 'Tipo existencia',  isFixed: false, isVisible: false, align: 'left',   width: '120px',    order: 16  },
  { id: 'codigoBarras',        label: 'Cód. barras',      isFixed: false, isVisible: false, align: 'left',   width: '110px',    order: 17  },
  { id: 'codigoFabrica',       label: 'Cód. fábrica',     isFixed: false, isVisible: false, align: 'left',   width: '110px',    order: 18  },
  { id: 'peso',                label: 'Peso (kg)',         isFixed: false, isVisible: false, align: 'right',  width: '90px',     order: 19  },
  { id: 'stock',               label: 'Stock',            isFixed: false, isVisible: false, align: 'center', width: '72px',     order: 20  },
  // Opcionales GRE — editables por el usuario
  { id: 'normalizado',         label: 'Normalizado',      isFixed: false, isVisible: true,  align: 'center', width: '60px',     order: 21  },
  { id: 'codigoProductoSunat', label: 'Cód. SUNAT',       isFixed: false, isVisible: true,  align: 'left',   width: '96px',     order: 22  },
  { id: 'subpartidaNacional',  label: 'Subpartida',       isFixed: false, isVisible: true,  align: 'left',   width: '148px',    order: 23  },
  { id: 'codigoGTIN',          label: 'GTIN',             isFixed: false, isVisible: false, align: 'left',   width: '85px',     order: 24  },
  // Fija final
  { id: 'accion',              label: 'Acción',           isFixed: true,  isFixedEnd: true, isVisible: true,  align: 'center', width: '44px', order: 999 },
];

const GRE_STORAGE_KEY = 'gre_bienes_columns_config';

const BNES_VIGENTES = BIENES_NORMALIZADOS.filter((b) => b.estado === 'Vigente');

// ── Cell styles ────────────────────────────────────────────────────────────
const CELL =
  'h-7 w-full px-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500';

const CELL_DISABLED =
  'h-7 w-full flex items-center px-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900/50 text-gray-400 dark:text-gray-600 select-none';

// ── Column config persistence ──────────────────────────────────────────────
function loadColumnConfig(): GREColumnConfig[] {
  try {
    const raw = localStorage.getItem(GRE_STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as { id: GREColumnId; isVisible: boolean }[];
      return DEFAULT_GRE_COLUMNS.map((def) => {
        const found = saved.find((s) => s.id === def.id);
        return found !== undefined ? { ...def, isVisible: found.isVisible } : def;
      });
    }
  } catch { /* use defaults */ }
  return DEFAULT_GRE_COLUMNS;
}

function persistColumnConfig(cols: GREColumnConfig[]): void {
  try {
    localStorage.setItem(
      GRE_STORAGE_KEY,
      JSON.stringify(cols.map(({ id, isVisible }) => ({ id, isVisible }))),
    );
  } catch { /* ignore */ }
}

// ── Props ──────────────────────────────────────────────────────────────────
interface SeccionBienesProps {
  bienes: BienGRE[];
  onChange: (bienes: BienGRE[]) => void;
  pesoTotal?: number;
  unidadPeso: UnidadPeso;
  onPesoTotalChange: (peso: number | undefined) => void;
  onUnidadPesoChange: (unidad: UnidadPeso) => void;
}

// ══════════════════════════════════════════════════════════════════════════
export default function SeccionBienes({
  bienes,
  onChange,
  pesoTotal,
  unidadPeso,
  onPesoTotalChange,
  onUnidadPesoChange,
}: SeccionBienesProps) {
  const { allProducts, addProduct, categories: productCategories } = useProductStore();
  const { state: configState } = useConfigurationContext();

  // ── Search state ────────────────────────────────────────────────────────
  const [busqueda, setBusqueda] = useState('');
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [modoMultiple, setModoMultiple] = useState(false);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Peso state ──────────────────────────────────────────────────────────
  // Inicia en modo manual si el padre ya tiene un peso guardado, para no sobreescribirlo.
  const [pesoEsManual, setPesoEsManual] = useState(() => pesoTotal !== undefined);
  const [pesoDraft, setPesoDraft] = useState<string | null>(null);
  const onPesoTotalChangeRef = useRef(onPesoTotalChange);
  useEffect(() => { onPesoTotalChangeRef.current = onPesoTotalChange; });

  // ── Column config state ─────────────────────────────────────────────────
  const [columnConfig, setColumnConfig] = useState<GREColumnConfig[]>(loadColumnConfig);
  const [showColumnConfig, setShowColumnConfig] = useState(false);

  // ── Product creation modal state ────────────────────────────────────────
  const [showProductModal, setShowProductModal] = useState(false);
  const [productNamePrefill, setProductNamePrefill] = useState('');

  // ── Derived ────────────────────────────────────────────────────────────
  const opcionesUnidad = useMemo(() => {
    const activas = configState.units.filter((u) => u.isActive !== false);
    const origen = activas.length > 0 ? activas : configState.units;
    return [...origen]
      .sort((a, b) => {
        const oA = typeof a.displayOrder === 'number' ? a.displayOrder : 9999;
        const oB = typeof b.displayOrder === 'number' ? b.displayOrder : 9999;
        return oA !== oB ? oA - oB : a.code.localeCompare(b.code);
      })
      .map((u) => ({
        code: u.code,
        label:
          getUnitDisplayForUI({
            units: configState.units,
            code: u.code,
            fallbackName: u.name,
            fallbackSymbol: u.symbol,
          }) || u.code,
      }));
  }, [configState.units]);

  const productosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return [];
    const q = busqueda.toLowerCase();
    return (allProducts as Product[])
      .filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.codigo.toLowerCase().includes(q) ||
          (p.descripcion ?? '').toLowerCase().includes(q),
      )
      .slice(0, 10);
  }, [allProducts, busqueda]);

  // Excluye columnas embebidas — no generan <th> ni <td> propios
  const visibleColumns = useMemo(
    () => columnConfig.filter((c) => c.isVisible && !c.isEmbedded).sort((a, b) => a.order - b.order),
    [columnConfig],
  );

  const optionalColumns = useMemo(() => columnConfig.filter((c) => !c.isFixed), [columnConfig]);

  // Controla si el input de descripción se muestra dentro de la celda Producto
  const descripcionVisible = useMemo(
    () => columnConfig.find((c) => c.id === 'descripcion')?.isVisible ?? false,
    [columnConfig],
  );

  // Suma de pesoLineaKg de todos los ítems; base del auto-cálculo
  const pesoCalculadoKg = useMemo(
    () => bienes.reduce((sum, b) => sum + (b.pesoLineaKg ?? 0), 0),
    [bienes],
  );

  // Valor de pesoTotal (siempre en kg) convertido a la unidad actual para mostrar en el input
  const pesoParaMostrar = useMemo(() => {
    if (pesoTotal === undefined) return '';
    if (unidadPeso === 'KGM') return String(parseFloat(pesoTotal.toFixed(3)));
    return String(parseFloat((pesoTotal / 1000).toFixed(3)));
  }, [pesoTotal, unidadPeso]);

  // Auto-actualiza pesoTotal cuando cambian los pesos de línea, salvo que el usuario lo editó manualmente
  useEffect(() => {
    if (pesoEsManual) return;
    if (pesoCalculadoKg > 0) {
      onPesoTotalChangeRef.current(parseFloat(pesoCalculadoKg.toFixed(3)));
    }
  }, [pesoCalculadoKg, pesoEsManual]);

  // ── Column management ──────────────────────────────────────────────────
  const toggleColumn = useCallback((id: GREColumnId) => {
    setColumnConfig((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, isVisible: !c.isVisible } : c));
      persistColumnConfig(next);
      return next;
    });
  }, []);

  const selectAllOptional = useCallback(() => {
    setColumnConfig((prev) => {
      const next = prev.map((c) => (c.isFixed ? c : { ...c, isVisible: true }));
      persistColumnConfig(next);
      return next;
    });
  }, []);

  const clearAllOptional = useCallback(() => {
    setColumnConfig((prev) => {
      const next = prev.map((c) => (c.isFixed ? c : { ...c, isVisible: false }));
      persistColumnConfig(next);
      return next;
    });
  }, []);

  // ── Bien actions ───────────────────────────────────────────────────────
  const buildBienDesdeProducto = useCallback(
    (prod: Product): BienGRE => {
      const bnGRE =
        prod.aplicaBienNormalizadoGRE && prod.subpartidaNacionalGRE
          ? BNES_VIGENTES.find((b) => b.subpartidaNacional === prod.subpartidaNacionalGRE)
          : undefined;
      return {
        ...BIEN_GRE_VACIO(),
        productoId: prod.id,
        descripcion: prod.descripcion ?? prod.nombre,
        unidad: prod.unidad ?? 'NIU',
        codigoBien: prod.codigo ?? '',
        pesoLineaKg: typeof prod.peso === 'number' ? prod.peso : undefined,
        ...(bnGRE && {
          normalizado: true,
          codigoSubpartidaNacional: bnGRE.subpartidaNacional,
          codigoProductoSunat: bnGRE.codigoProductoSunat,
        }),
      };
    },
    [],
  );

  const agregarDesdeProducto = useCallback(
    (prod: Product) => {
      onChange([...bienes, buildBienDesdeProducto(prod)]);
      setBusqueda('');
      setMostrarDropdown(false);
    },
    [bienes, onChange, buildBienDesdeProducto],
  );

  const agregarSeleccionados = useCallback(() => {
    if (seleccionados.size === 0) return;
    const nuevos: BienGRE[] = [];
    seleccionados.forEach((id) => {
      const prod = (allProducts as Product[]).find((p) => p.id === id);
      if (prod) nuevos.push(buildBienDesdeProducto(prod));
    });
    onChange([...bienes, ...nuevos]);
    setSeleccionados(new Set());
    setModoMultiple(false);
    setBusqueda('');
    setMostrarDropdown(false);
  }, [seleccionados, allProducts, bienes, onChange, buildBienDesdeProducto]);

  const actualizar = useCallback(
    <K extends keyof BienGRE>(id: string, campo: K, valor: BienGRE[K]) => {
      onChange(bienes.map((b) => (b.id === id ? { ...b, [campo]: valor } : b)));
    },
    [bienes, onChange],
  );

  // Actualiza cantidad y recalcula pesoLineaKg desde el peso unitario del catálogo
  const actualizarCantidad = useCallback(
    (id: string, nuevaCantidad: number) => {
      onChange(
        bienes.map((b) => {
          if (b.id !== id) return b;
          const prod = (allProducts as Product[]).find((p) => p.id === b.productoId);
          const pesoUnitario = prod?.peso;
          const pesoLineaKg =
            typeof pesoUnitario === 'number'
              ? parseFloat((nuevaCantidad * pesoUnitario).toFixed(3))
              : b.pesoLineaKg;
          return { ...b, cantidad: nuevaCantidad, pesoLineaKg };
        }),
      );
    },
    [bienes, onChange, allProducts],
  );

  const eliminar = useCallback(
    (id: string) => onChange(bienes.filter((b) => b.id !== id)),
    [bienes, onChange],
  );

  const toggleNormalizado = useCallback(
    (bien: BienGRE) => {
      onChange(
        bienes.map((b) =>
          b.id === bien.id
            ? {
                ...b,
                normalizado: !b.normalizado,
                ...(b.normalizado
                  ? { codigoProductoSunat: undefined, codigoSubpartidaNacional: undefined, codigoGTIN: undefined }
                  : {}),
              }
            : b,
        ),
      );
    },
    [bienes, onChange],
  );

  const seleccionarSubpartida = useCallback(
    (id: string, subpartida: string) => {
      const bn = BNES_VIGENTES.find((b) => b.subpartidaNacional === subpartida);
      onChange(
        bienes.map((b) =>
          b.id === id
            ? {
                ...b,
                codigoSubpartidaNacional: subpartida || undefined,
                codigoProductoSunat:
                  bn?.codigoProductoSunat ?? (subpartida ? b.codigoProductoSunat : undefined),
              }
            : b,
        ),
      );
    },
    [bienes, onChange],
  );

  // ── Product creation ───────────────────────────────────────────────────
  const handleCrearProducto = useCallback(() => {
    setProductNamePrefill(busqueda.trim());
    setShowProductModal(true);
    setMostrarDropdown(false);
  }, [busqueda]);

  const handleProductoCreado = useCallback(
    (productData: ProductInput) => {
      const created = addProduct(productData);
      onChange([...bienes, buildBienDesdeProducto(created)]);
      setShowProductModal(false);
      setBusqueda('');
    },
    [addProduct, bienes, buildBienDesdeProducto, onChange],
  );

  // Convierte el valor tipado por el usuario (en la unidad activa) a kg y lo persiste
  const handlePesoTotalChange = useCallback(
    (valorEnUnidad: string) => {
      if (!valorEnUnidad.trim()) {
        onPesoTotalChange(undefined);
        setPesoEsManual(false);
        return;
      }
      const parsed = parseFloat(valorEnUnidad);
      if (isNaN(parsed) || parsed < 0) return;
      const enKg = unidadPeso === 'KGM' ? parsed : parseFloat((parsed * 1000).toFixed(3));
      onPesoTotalChange(enKg);
      setPesoEsManual(true);
    },
    [onPesoTotalChange, unidadPeso],
  );

  // ── Cell renderer ──────────────────────────────────────────────────────
  function renderCell(colId: GREColumnId, bien: BienGRE) {
    const catalogProduct = bien.productoId
      ? (allProducts as Product[]).find((p) => p.id === bien.productoId)
      : undefined;

    switch (colId) {
      case 'producto':
        return (
          <td
            key={`${bien.id}-prod`}
            className="px-2 py-2 sticky left-0 bg-white dark:bg-gray-900 z-10"
          >
            {catalogProduct ? (
              <div
                className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate leading-tight"
                title={catalogProduct.nombre}
              >
                {catalogProduct.nombre}
              </div>
            ) : (
              <div className="text-[10px] text-gray-400 italic">Sin producto</div>
            )}
            {descripcionVisible && (
              <input
                type="text"
                value={bien.descripcion}
                onChange={(e) => actualizar(bien.id, 'descripcion', e.target.value)}
                placeholder="Descripción"
                className={`${CELL} mt-0.5`}
              />
            )}
          </td>
        );

      case 'codigo':
        return (
          <td key={`${bien.id}-cod`} className="px-2 py-2">
            <div className="text-[11px] text-gray-600 dark:text-gray-400 font-mono">
              {bien.codigoBien || '—'}
            </div>
          </td>
        );

      case 'cantidad':
        return (
          <td key={`${bien.id}-qty`} className="px-2 py-2">
            <div className="flex items-center justify-center gap-0.5">
              <button
                type="button"
                onClick={() => actualizarCantidad(bien.id, Math.max(0, bien.cantidad - 1))}
                className="w-5 h-7 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-base font-bold rounded hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
              >
                −
              </button>
              <input
                type="number"
                value={bien.cantidad}
                min={0}
                step="any"
                onChange={(e) => actualizarCantidad(bien.id, parseFloat(e.target.value) || 0)}
                className={`${CELL} text-center`}
                style={{ width: '44px' }}
              />
              <button
                type="button"
                onClick={() => actualizarCantidad(bien.id, bien.cantidad + 1)}
                className="w-5 h-7 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-base font-bold rounded hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
              >
                +
              </button>
            </div>
          </td>
        );

      case 'unidad':
        return (
          <td key={`${bien.id}-unit`} className="px-2 py-2">
            <select
              value={bien.unidad}
              onChange={(e) => actualizar(bien.id, 'unidad', e.target.value)}
              className={CELL}
            >
              {opcionesUnidad.map((u) => (
                <option key={u.code} value={u.code}>
                  {u.label}
                </option>
              ))}
            </select>
          </td>
        );

      case 'imagen':
        return (
          <td key={`${bien.id}-img`} className="px-2 py-2 text-center">
            {catalogProduct?.imagen ? (
              <img
                src={catalogProduct.imagen}
                alt={catalogProduct.nombre}
                className="w-10 h-10 object-cover rounded border border-gray-200 dark:border-gray-700 mx-auto"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 flex items-center justify-center mx-auto">
                <span className="text-[9px] text-gray-400">—</span>
              </div>
            )}
          </td>
        );

      case 'alias':
        return (
          <td key={`${bien.id}-alias`} className="px-2 py-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 italic">
              {catalogProduct?.alias || '—'}
            </span>
          </td>
        );

      case 'marca':
        return (
          <td key={`${bien.id}-marca`} className="px-2 py-2">
            <span className="text-xs text-gray-700 dark:text-gray-300">
              {catalogProduct?.marca || '—'}
            </span>
          </td>
        );

      case 'modelo':
        return (
          <td key={`${bien.id}-modelo`} className="px-2 py-2">
            <span className="text-xs text-gray-700 dark:text-gray-300">
              {catalogProduct?.modelo || '—'}
            </span>
          </td>
        );

      case 'categoria':
        return (
          <td key={`${bien.id}-cat`} className="px-2 py-2">
            <span className="text-xs text-gray-700 dark:text-gray-300">
              {catalogProduct?.categoria || '—'}
            </span>
          </td>
        );

      case 'tipoProducto': {
        const tipo =
          catalogProduct?.tipoExistencia === 'SERVICIOS'
            ? 'SERVICIO'
            : catalogProduct
              ? 'BIEN'
              : undefined;
        return (
          <td key={`${bien.id}-tipo`} className="px-2 py-2 text-center">
            {tipo ? (
              <span
                className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                  tipo === 'SERVICIO'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                }`}
              >
                {tipo}
              </span>
            ) : (
              <span className="text-xs text-gray-400">—</span>
            )}
          </td>
        );
      }

      case 'tipoExistencia':
        return (
          <td key={`${bien.id}-texist`} className="px-2 py-2">
            <span className="text-xs text-gray-700 dark:text-gray-300">
              {catalogProduct?.tipoExistencia || '—'}
            </span>
          </td>
        );

      case 'codigoBarras':
        return (
          <td key={`${bien.id}-cbar`} className="px-2 py-2">
            <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">
              {catalogProduct?.codigoBarras || '—'}
            </span>
          </td>
        );

      case 'codigoFabrica':
        return (
          <td key={`${bien.id}-cfab`} className="px-2 py-2">
            <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">
              {catalogProduct?.codigoFabrica || '—'}
            </span>
          </td>
        );

      case 'peso':
        return (
          <td key={`${bien.id}-peso`} className="px-2 py-2">
            <input
              type="number"
              value={bien.pesoLineaKg ?? ''}
              min={0}
              step="any"
              onChange={(e) =>
                actualizar(
                  bien.id,
                  'pesoLineaKg',
                  e.target.value ? parseFloat(e.target.value) : undefined,
                )
              }
              placeholder="0.000"
              className={`${CELL} text-right`}
            />
          </td>
        );

      case 'stock': {
        const stock = catalogProduct?.cantidad;
        if (stock === undefined) {
          return (
            <td key={`${bien.id}-stk`} className="px-2 py-2 text-center">
              <span className="text-xs text-gray-400">—</span>
            </td>
          );
        }
        return (
          <td key={`${bien.id}-stk`} className="px-2 py-2 text-center">
            <span
              className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                stock > 20
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : stock > 5
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              {stock}
            </span>
          </td>
        );
      }

      case 'normalizado':
        return (
          <td key={`${bien.id}-norm`} className="px-2 py-2 text-center">
            <input
              type="checkbox"
              checked={bien.normalizado}
              onChange={() => toggleNormalizado(bien)}
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-violet-600 focus:ring-violet-500 cursor-pointer"
              title="Activa campos SUNAT"
            />
          </td>
        );

      case 'codigoProductoSunat':
        return (
          <td key={`${bien.id}-cpsunat`} className="px-2 py-2">
            {bien.normalizado ? (
              <input
                type="text"
                value={bien.codigoProductoSunat ?? ''}
                readOnly
                placeholder="—"
                className={`${CELL} bg-gray-50 dark:bg-gray-900/50 cursor-default text-gray-500 dark:text-gray-400`}
              />
            ) : (
              <div className={CELL_DISABLED}>—</div>
            )}
          </td>
        );

      case 'subpartidaNacional':
        return (
          <td key={`${bien.id}-subp`} className="px-2 py-2">
            {bien.normalizado ? (
              <select
                value={bien.codigoSubpartidaNacional ?? ''}
                onChange={(e) => seleccionarSubpartida(bien.id, e.target.value)}
                className={CELL}
                title={bien.codigoSubpartidaNacional ?? ''}
              >
                <option value="">— Seleccionar —</option>
                {BNES_VIGENTES.map((bn) => (
                  <option key={bn.subpartidaNacional} value={bn.subpartidaNacional}>
                    {bn.subpartidaNacional} – {bn.descripcion}
                  </option>
                ))}
              </select>
            ) : (
              <div className={CELL_DISABLED}>—</div>
            )}
          </td>
        );

      case 'codigoGTIN':
        return (
          <td key={`${bien.id}-gtin`} className="px-2 py-2">
            {bien.normalizado ? (
              <input
                type="text"
                value={bien.codigoGTIN ?? ''}
                onChange={(e) => actualizar(bien.id, 'codigoGTIN', e.target.value)}
                placeholder="GTIN"
                className={CELL}
              />
            ) : (
              <div className={CELL_DISABLED}>—</div>
            )}
          </td>
        );

      case 'accion':
        return (
          <td key={`${bien.id}-del`} className="px-2 py-2 text-center">
            <button
              type="button"
              onClick={() => eliminar(bien.id)}
              className="h-7 w-7 flex items-center justify-center mx-auto text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              aria-label="Eliminar bien"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </td>
        );

      default:
        return null;
    }
  }

  // ── + Columnas action (va en el header de la card) ─────────────────────
  const columnasAction = (
    <button
      type="button"
      onClick={() => setShowColumnConfig((v) => !v)}
      className="inline-flex h-7 items-center justify-center rounded-md px-2 text-[12px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none transition-colors"
    >
      + Columnas
    </button>
  );

  const totalCols = visibleColumns.length;

  // ══════════════════════════════════════════════════════════════════════
  return (
    <>
      <ConfigurationCard
        title="Bienes a transportar"
        icon={Package}
        badge={bienes.length > 0 ? bienes.length : undefined}
        actions={columnasAction}
      >
        {/* ── Panel de personalización de columnas ── */}
        {showColumnConfig && (
          <div className="mb-3 p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/10 dark:to-purple-900/10 rounded-lg border border-violet-200 dark:border-violet-700 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  Personalizar columnas
                </h4>
                <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">
                  Tu configuración se guarda automáticamente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowColumnConfig(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 rounded hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 mb-3">
              <button
                type="button"
                onClick={selectAllOptional}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-violet-700 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 border border-violet-300 dark:border-violet-700 rounded-lg hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Todo
              </button>
              <button
                type="button"
                onClick={clearAllOptional}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Square className="w-3.5 h-3.5" />
                Limpiar
              </button>
              <div className="ml-auto text-[11px] text-gray-500 dark:text-gray-400">
                {optionalColumns.filter((c) => c.isVisible).length} de {optionalColumns.length} activas
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
              {columnConfig.map((col) => (
                <label
                  key={col.id}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border transition-all text-[11px] select-none ${
                    col.isFixed
                      ? 'bg-gray-100 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600 cursor-not-allowed opacity-70'
                      : col.isVisible
                        ? 'bg-violet-100 dark:bg-violet-900/30 border-violet-300 dark:border-violet-700 cursor-pointer hover:bg-violet-200 dark:hover:bg-violet-900/50'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={col.isVisible}
                    disabled={col.isFixed}
                    onChange={() => !col.isFixed && toggleColumn(col.id)}
                    className="w-3.5 h-3.5 text-violet-600 rounded focus:ring-2 focus:ring-violet-500 disabled:opacity-50 cursor-pointer"
                  />
                  <span
                    className={`truncate ${
                      col.isFixed
                        ? 'text-gray-500 dark:text-gray-400 font-medium'
                        : col.isVisible
                          ? 'text-violet-900 dark:text-violet-300 font-medium'
                          : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {col.label}
                    {col.isFixed && (
                      <span className="ml-0.5 text-[10px] text-gray-400"> (fija)</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ── Área de búsqueda ── */}
        <div className="mb-3 p-2.5 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/10 dark:to-purple-900/10 rounded-lg border border-violet-100 dark:border-violet-800/30">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Buscar producto por nombre, código o descripción..."
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setMostrarDropdown(e.target.value.length > 0);
                }}
                onFocus={() => {
                  if (busqueda.length > 0) setMostrarDropdown(true);
                }}
                onBlur={() => setTimeout(() => setMostrarDropdown(false), 200)}
                className="w-full h-9 pl-9 pr-9 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:focus:ring-violet-900/30 transition-all placeholder:text-gray-400"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => {
                    setBusqueda('');
                    setMostrarDropdown(false);
                    setSeleccionados(new Set());
                    inputRef.current?.focus();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setModoMultiple((v) => !v);
                setSeleccionados(new Set());
              }}
              className={`h-9 px-3 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                modoMultiple
                  ? 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700'
                  : 'bg-white dark:bg-gray-800 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-900/20'
              }`}
            >
              {modoMultiple ? `Selec. (${seleccionados.size})` : 'Selección múltiple'}
            </button>

            {modoMultiple && seleccionados.size > 0 && (
              <button
                type="button"
                onClick={agregarSeleccionados}
                className="h-9 px-3 text-xs font-medium rounded-lg bg-violet-600 text-white border border-violet-600 hover:bg-violet-700 transition-colors whitespace-nowrap shrink-0"
              >
                + Agregar {seleccionados.size} {seleccionados.size === 1 ? 'bien' : 'bienes'}
              </button>
            )}
          </div>

          {mostrarDropdown && productosFiltrados.length > 0 && (
            <div className="relative mt-1.5">
              <div className="absolute z-40 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {productosFiltrados.map((p) => {
                  const isSelected = seleccionados.has(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={(e) => {
                        if (modoMultiple) {
                          e.preventDefault();
                          setSeleccionados((prev) => {
                            const next = new Set(prev);
                            if (next.has(p.id)) next.delete(p.id);
                            else next.add(p.id);
                            return next;
                          });
                        } else {
                          agregarDesdeProducto(p);
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors ${
                        isSelected
                          ? 'bg-violet-50 dark:bg-violet-900/20'
                          : 'hover:bg-violet-50 dark:hover:bg-violet-900/20'
                      }`}
                    >
                      {modoMultiple ? (
                        <div
                          className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-violet-600 border-violet-600'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                          }`}
                        >
                          {isSelected && (
                            <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none">
                              <path
                                d="M2 6l3 3 5-5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                      ) : (
                        <Package className="h-4 w-4 text-gray-400 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900 dark:text-white block truncate">
                          {p.nombre}
                        </span>
                        {p.codigo && (
                          <span className="text-xs text-gray-400 font-mono">{p.codigo}</span>
                        )}
                        {p.aplicaBienNormalizadoGRE && (
                          <span className="ml-2 text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">
                            GRE
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{p.unidad ?? 'NIU'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {mostrarDropdown && busqueda.length > 0 && productosFiltrados.length === 0 && (
            <div className="mt-1.5 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Sin resultados para &ldquo;{busqueda}&rdquo;
              </p>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleCrearProducto();
                }}
                className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 underline underline-offset-2"
              >
                + Crear producto &ldquo;{busqueda}&rdquo;
              </button>
            </div>
          )}
        </div>

        {/* ── Tabla compacta ── */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs table-fixed">
              <thead className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-b-2 border-violet-200 dark:border-violet-700 sticky top-0">
                <tr>
                  {visibleColumns.map((col) => (
                    <th
                      key={col.id}
                      className={`px-2 py-2.5 text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap ${
                        col.align === 'center'
                          ? 'text-center'
                          : col.align === 'right'
                            ? 'text-right'
                            : 'text-left'
                      }`}
                      style={{ width: col.width, minWidth: col.minWidth }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bienes.length === 0 ? (
                  <tr>
                    <td colSpan={totalCols} className="px-4 py-10 text-center">
                      <Package className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Sin bienes. Busca productos en el catálogo usando el buscador de arriba.
                      </p>
                    </td>
                  </tr>
                ) : (
                  bienes.map((bien) => (
                    <tr
                      key={bien.id}
                      className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-violet-50/30 dark:hover:bg-violet-900/10 transition-colors duration-150"
                    >
                      {visibleColumns.map((col) => renderCell(col.id, bien))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Peso bruto total y unidad de peso ── */}
        <div className="flex flex-wrap items-end gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Peso bruto total
              </label>
              <span
                title={
                  pesoCalculadoKg > 0
                    ? `Se calcula automáticamente como suma de Peso (kg) × cantidad de cada ítem (${pesoCalculadoKg.toFixed(3)} kg). Edita manualmente si necesitas un valor distinto. No modifica el catálogo de productos.`
                    : 'Ingresa el peso bruto total. Si configuras el peso en los productos del catálogo, se calculará automáticamente.'
                }
                className="inline-flex items-center text-gray-400 cursor-help"
              >
                <HelpCircle className="h-3 w-3" />
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={pesoDraft !== null ? pesoDraft : pesoParaMostrar}
                min={0}
                step="any"
                onChange={(e) => setPesoDraft(e.target.value)}
                onBlur={() => {
                  if (pesoDraft !== null) {
                    handlePesoTotalChange(pesoDraft);
                    setPesoDraft(null);
                  }
                }}
                placeholder="0.000"
                className="h-9 w-32 px-2 text-sm text-right border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
              />
              {!pesoEsManual && pesoCalculadoKg > 0 && (
                <span className="text-[11px] text-violet-500 dark:text-violet-400 font-medium">
                  auto
                </span>
              )}
              {pesoEsManual && pesoCalculadoKg > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setPesoEsManual(false);
                    onPesoTotalChange(parseFloat(pesoCalculadoKg.toFixed(3)));
                  }}
                  className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline font-medium"
                >
                  Recalcular
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Unidad de peso
            </label>
            <select
              value={unidadPeso}
              onChange={(e) => onUnidadPesoChange(e.target.value as UnidadPeso)}
              className="h-9 px-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
            >
              <option value="KGM">Kilogramo (KGM)</option>
              <option value="TNE">Tonelada (TNE)</option>
            </select>
          </div>
        </div>
      </ConfigurationCard>

      <ProductModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSave={handleProductoCreado}
        prefillName={productNamePrefill}
        categories={productCategories}
      />
    </>
  );
}
