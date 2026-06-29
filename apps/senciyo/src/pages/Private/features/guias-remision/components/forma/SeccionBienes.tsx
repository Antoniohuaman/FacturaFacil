import { useState, useCallback, useRef, useMemo } from 'react';
import { Plus, Trash2, Package, Search, X } from 'lucide-react';
import { ConfigurationCard } from '../../../comprobantes-electronicos/shared/form-core/components/ConfigurationCard';
import { useProductStore } from '../../../catalogo-articulos/hooks/useProductStore';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import type { Product } from '../../../catalogo-articulos/models/types';
import { BIENES_NORMALIZADOS } from '../../../configuracion-sistema/datos/catalogosGRE';
import type { BienGRE, UnidadPeso } from '../../modelos/GuiaRemision';
import { BIEN_GRE_VACIO } from '../../modelos/GuiaRemision';

interface SeccionBienesProps {
  bienes: BienGRE[];
  onChange: (bienes: BienGRE[]) => void;
  pesoTotal?: number;
  unidadPeso: UnidadPeso;
  onPesoTotalChange: (peso: number | undefined) => void;
  onUnidadPesoChange: (unidad: UnidadPeso) => void;
}

const CELL =
  'h-7 w-full px-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500';

const CELL_DISABLED =
  'h-7 w-full flex items-center px-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900/50 text-gray-400 dark:text-gray-600 select-none';

// Subconjunto vigente calculado una sola vez al cargar el módulo
const BNES_VIGENTES = BIENES_NORMALIZADOS.filter((b) => b.estado === 'Vigente');

export default function SeccionBienes({
  bienes,
  onChange,
  pesoTotal,
  unidadPeso,
  onPesoTotalChange,
  onUnidadPesoChange,
}: SeccionBienesProps) {
  const { allProducts } = useProductStore();
  const { state: configState } = useConfigurationContext();
  const [busqueda, setBusqueda] = useState('');
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Unidades desde configState.units — misma fuente que Comprobantes
  const opcionesUnidad = useMemo(() => {
    const activas = configState.units.filter((u) => u.isActive !== false);
    const origen = activas.length > 0 ? activas : configState.units;
    return origen
      .sort((a, b) => {
        const oA = typeof a.displayOrder === 'number' ? a.displayOrder : 9999;
        const oB = typeof b.displayOrder === 'number' ? b.displayOrder : 9999;
        return oA !== oB ? oA - oB : a.code.localeCompare(b.code);
      })
      .map((u) => ({
        code: u.code,
        label: u.symbol ? `${u.code} – ${u.symbol}` : `${u.code} – ${u.name}`,
      }));
  }, [configState.units]);

  // Búsqueda en catálogo de productos
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

  const agregarDesdeProducto = useCallback(
    (prod: Product) => {
      const bnGRE =
        prod.aplicaBienNormalizadoGRE && prod.subpartidaNacionalGRE
          ? BNES_VIGENTES.find((b) => b.subpartidaNacional === prod.subpartidaNacionalGRE)
          : undefined;
      onChange([
        ...bienes,
        {
          ...BIEN_GRE_VACIO(),
          productoId: prod.id,
          descripcion: prod.descripcion ?? prod.nombre,
          unidad: prod.unidad ?? 'NIU',
          codigoBien: prod.codigo ?? '',
          ...(bnGRE && {
            normalizado: true,
            codigoSubpartidaNacional: bnGRE.subpartidaNacional,
            codigoProductoSunat: bnGRE.codigoProductoSunat,
          }),
        },
      ]);
      setBusqueda('');
      setMostrarDropdown(false);
    },
    [bienes, onChange],
  );

  const agregarManual = useCallback(() => {
    onChange([...bienes, BIEN_GRE_VACIO()]);
  }, [bienes, onChange]);

  const actualizar = useCallback(
    <K extends keyof BienGRE>(id: string, campo: K, valor: BienGRE[K]) => {
      onChange(bienes.map((b) => (b.id === id ? { ...b, [campo]: valor } : b)));
    },
    [bienes, onChange],
  );

  const eliminar = useCallback(
    (id: string) => {
      onChange(bienes.filter((b) => b.id !== id));
    },
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
                // Al desmarcar: limpia campos SUNAT
                ...( b.normalizado
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
                codigoProductoSunat: bn?.codigoProductoSunat ?? (subpartida ? b.codigoProductoSunat : undefined),
              }
            : b,
        ),
      );
    },
    [bienes, onChange],
  );

  return (
    <ConfigurationCard
      title="Bienes a transportar"
      icon={Package}
      badge={bienes.length > 0 ? bienes.length : undefined}
    >
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">
        Catálogo: selecciona productos registrados para agregarlos a la guía.
      </p>

      {/* ── Buscador — estilo Comprobantes ── */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar producto por nombre, código o categoría..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setMostrarDropdown(e.target.value.length > 0);
            }}
            onFocus={() => {
              if (busqueda.length > 0) setMostrarDropdown(true);
            }}
            onBlur={() => setTimeout(() => setMostrarDropdown(false), 200)}
            className="w-full px-4 py-2.5 pr-10 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:focus:ring-violet-900/30 transition-all placeholder:text-gray-400"
          />
          {busqueda ? (
            <button
              type="button"
              onClick={() => {
                setBusqueda('');
                setMostrarDropdown(false);
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          )}

          {/* Dropdown de resultados del catálogo */}
          {mostrarDropdown && (
            <div className="absolute z-40 left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {productosFiltrados.length > 0 ? (
                productosFiltrados.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={() => agregarDesdeProducto(p)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-violet-50 dark:hover:bg-violet-900/20 border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors"
                  >
                    <Package className="h-4 w-4 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {p.nombre}
                      </span>
                      {p.codigo && (
                        <span className="ml-2 text-xs text-gray-400 font-mono">{p.codigo}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{p.unidad ?? 'NIU'}</span>
                  </button>
                ))
              ) : (
                <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  Sin resultados para &ldquo;{busqueda}&rdquo;
                </p>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={agregarManual}
          className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar bien
        </button>
      </div>

      {/* ── Tabla compacta — todas las columnas inline ── */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: '940px' }}>
            <thead className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-b border-violet-200 dark:border-violet-700 sticky top-0">
              <tr>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider w-[82px]">
                  Código
                </th>
                <th className="px-2 py-2.5 text-center text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider w-[72px]">
                  Cant.
                </th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider w-[108px]">
                  Unidad
                </th>
                <th className="px-2 py-2.5 text-center text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider w-[50px]">
                  Norm.
                </th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider w-[90px]">
                  Cód. SUNAT
                </th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider w-[140px]">
                  Subpartida
                </th>
                <th className="px-2 py-2.5 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider w-[80px]">
                  GTIN
                </th>
                <th className="px-2 py-2.5 text-center text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider w-[44px]">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody>
              {bienes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center">
                    <Package className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                      Sin bienes agregados. Usa el buscador para agregar desde el catálogo.
                    </p>
                    <button
                      type="button"
                      onClick={agregarManual}
                      className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium"
                    >
                      + Agregar bien manualmente
                    </button>
                  </td>
                </tr>
              ) : (
                bienes.map((bien) => (
                  <tr
                    key={bien.id}
                    className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-violet-50/30 dark:hover:bg-violet-900/10"
                  >
                    {/* Descripción */}
                    <td className="px-2 py-2 min-w-[160px]">
                      <input
                        type="text"
                        value={bien.descripcion}
                        onChange={(e) => actualizar(bien.id, 'descripcion', e.target.value)}
                        placeholder="Descripción del bien"
                        className={CELL}
                      />
                    </td>

                    {/* Código bien */}
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={bien.codigoBien ?? ''}
                        onChange={(e) => actualizar(bien.id, 'codigoBien', e.target.value)}
                        placeholder="—"
                        className={CELL}
                      />
                    </td>

                    {/* Cantidad */}
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={bien.cantidad}
                        min={0}
                        step="any"
                        onChange={(e) =>
                          actualizar(bien.id, 'cantidad', parseFloat(e.target.value) || 0)
                        }
                        className={`${CELL} text-right`}
                      />
                    </td>

                    {/* Unidad — desde configState.units */}
                    <td className="px-2 py-2">
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

                    {/* Normalizado */}
                    <td className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={bien.normalizado}
                        onChange={() => toggleNormalizado(bien)}
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-violet-600 focus:ring-violet-500 cursor-pointer"
                        title="Activa campos SUNAT"
                      />
                    </td>

                    {/* Cód. producto SUNAT — readonly, se autocompleta al seleccionar subpartida */}
                    <td className="px-2 py-2">
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

                    {/* Subpartida arancelaria */}
                    <td className="px-2 py-2">
                      {bien.normalizado ? (
                        <select
                          value={bien.codigoSubpartidaNacional ?? ''}
                          onChange={(e) => seleccionarSubpartida(bien.id, e.target.value)}
                          className={CELL}
                          title={bien.codigoSubpartidaNacional ?? ''}
                        >
                          <option value="">— Seleccionar —</option>
                          {BNES_VIGENTES.map((bn) => (
                            <option
                              key={bn.subpartidaNacional}
                              value={bn.subpartidaNacional}
                            >
                              {bn.subpartidaNacional} – {bn.descripcion}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className={CELL_DISABLED}>—</div>
                      )}
                    </td>

                    {/* GTIN */}
                    <td className="px-2 py-2">
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

                    {/* Eliminar */}
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => eliminar(bien.id)}
                        className="h-7 w-7 flex items-center justify-center mx-auto text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        aria-label="Eliminar bien"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Datos generales de la carga — debajo de la tabla ── */}
      <div className="flex flex-wrap items-end gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Peso bruto total
          </label>
          <input
            type="number"
            value={pesoTotal ?? ''}
            min={0}
            step="any"
            onChange={(e) =>
              onPesoTotalChange(e.target.value ? parseFloat(e.target.value) : undefined)
            }
            placeholder="0.00"
            className="h-9 w-32 px-2 text-sm text-right border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
          />
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
  );
}
