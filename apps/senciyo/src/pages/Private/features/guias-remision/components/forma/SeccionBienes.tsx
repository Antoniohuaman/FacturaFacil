import { useState, useCallback, useRef, useEffect, Fragment } from 'react';
import { Plus, Trash2, Package, Search } from 'lucide-react';
import { ConfigurationCard } from '../../../comprobantes-electronicos/shared/form-core/components/ConfigurationCard';
import { useProductStore } from '../../../catalogo-articulos/hooks/useProductStore';
import type { Product } from '../../../catalogo-articulos/models/types';
import { BIENES_NORMALIZADOS } from '../../../configuracion-sistema/datos/catalogosGRE';
import type { BienGRE, UnidadPeso } from '../../modelos/GuiaRemision';
import { BIEN_GRE_VACIO } from '../../modelos/GuiaRemision';

const UNIDADES_MEDIDA = [
  { code: 'NIU', label: 'Unidad (NIU)' },
  { code: 'KGM', label: 'Kilogramo (KGM)' },
  { code: 'LTR', label: 'Litro (LTR)' },
  { code: 'MTR', label: 'Metro (MTR)' },
  { code: 'BOX', label: 'Caja (BOX)' },
  { code: 'BG', label: 'Bolsa (BG)' },
  { code: 'TNE', label: 'Tonelada (TNE)' },
];

interface SeccionBienesProps {
  bienes: BienGRE[];
  onChange: (bienes: BienGRE[]) => void;
  pesoTotal?: number;
  unidadPeso: UnidadPeso;
  onPesoTotalChange: (peso: number | undefined) => void;
  onUnidadPesoChange: (unidad: UnidadPeso) => void;
}

const CELL_CLS =
  'w-full h-8 px-2 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-violet-500 outline-none';

export default function SeccionBienes({
  bienes,
  onChange,
  pesoTotal,
  unidadPeso,
  onPesoTotalChange,
  onUnidadPesoChange,
}: SeccionBienesProps) {
  const { allProducts } = useProductStore();
  const [busqueda, setBusqueda] = useState('');
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const productosFiltrados = (allProducts as Product[])
    .filter((p) => {
      if (!busqueda.trim()) return false;
      const q = busqueda.toLowerCase();
      return (
        p.nombre.toLowerCase().includes(q) ||
        p.codigo.toLowerCase().includes(q) ||
        (p.descripcion ?? '').toLowerCase().includes(q)
      );
    })
    .slice(0, 10);

  useEffect(() => {
    if (!dropdownAbierto) return;
    const fn = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownAbierto(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [dropdownAbierto]);

  const agregarDesdeProducto = useCallback(
    (prod: Product) => {
      const nuevo: BienGRE = {
        ...BIEN_GRE_VACIO(),
        productoId: prod.id,
        descripcion: prod.descripcion ?? prod.nombre,
        unidad: prod.unidad ?? 'NIU',
        codigoBien: prod.codigo ?? '',
      };
      onChange([...bienes, nuevo]);
      setBusqueda('');
      setDropdownAbierto(false);
    },
    [bienes, onChange],
  );

  const agregar = useCallback(() => {
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
    (id: string, activo: boolean) => {
      onChange(
        bienes.map((b) =>
          b.id === id
            ? {
                ...b,
                normalizado: activo,
                codigoProductoSunat: activo ? b.codigoProductoSunat : undefined,
                codigoSubpartidaNacional: activo ? b.codigoSubpartidaNacional : undefined,
                codigoGTIN: activo ? b.codigoGTIN : undefined,
              }
            : b,
        ),
      );
    },
    [bienes, onChange],
  );

  const seleccionarBienNormalizado = useCallback(
    (id: string, subpartida: string) => {
      const bien = BIENES_NORMALIZADOS.find((b) => b.subpartidaNacional === subpartida);
      if (!bien) return;
      onChange(
        bienes.map((b) =>
          b.id === id
            ? {
                ...b,
                descripcion: bien.descripcion,
                codigoSubpartidaNacional: bien.subpartidaNacional,
                codigoProductoSunat: bien.codigoProductoSunat,
                normalizado: true,
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
      <div className="space-y-4">
        {/* Descripción — patrón catálogo de comprobantes */}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Catálogo: selecciona productos registrados para agregarlos a la guía.
        </p>

        {/* Buscador ancho — patrón Productos y Servicios de Comprobantes */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
            Agregar bien
          </label>
          <div className="relative" ref={dropdownRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={busqueda}
              onFocus={() => setDropdownAbierto(true)}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setDropdownAbierto(true);
              }}
              placeholder="Buscar por nombre, código o categoría…"
              className="w-full pl-10 pr-4 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-violet-400 dark:focus:border-violet-500 outline-none transition-colors"
            />

            {/* Resultados del catálogo */}
            {dropdownAbierto && (
              <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {productosFiltrados.length > 0 ? (
                  productosFiltrados.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={() => agregarDesdeProducto(p)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-violet-50 dark:hover:bg-violet-900/20 border-b border-gray-100 dark:border-gray-700 last:border-0"
                    >
                      <Package className="h-4 w-4 text-gray-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {p.nombre}
                        </span>
                        {p.codigo && (
                          <span className="ml-2 text-xs text-gray-400 font-mono">{p.codigo}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{p.unidad ?? 'NIU'}</span>
                    </button>
                  ))
                ) : busqueda.trim().length > 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    Sin coincidencias. Prueba con otro término de búsqueda.
                  </div>
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    Escriba para buscar en el catálogo de productos…
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tabla de bienes o empty state */}
        {bienes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
            <Package className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Sin bienes a transportar
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Busca en el catálogo o agrega uno manualmente.
            </p>
            <button
              type="button"
              onClick={agregar}
              className="mt-4 flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 font-medium hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar bien manualmente
            </button>
          </div>
        ) : (
          <div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
                      Producto / Descripción
                    </th>
                    <th className="text-left px-2 py-2 font-medium text-gray-600 dark:text-gray-400 w-24">
                      Código
                    </th>
                    <th className="text-left px-2 py-2 font-medium text-gray-600 dark:text-gray-400 w-20">
                      Cantidad
                    </th>
                    <th className="text-left px-2 py-2 font-medium text-gray-600 dark:text-gray-400 w-28">
                      Unidad
                    </th>
                    <th className="text-center px-2 py-2 font-medium text-gray-600 dark:text-gray-400 w-24">
                      Normalizado
                    </th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {bienes.map((bien) => (
                    <Fragment key={bien.id}>
                      {/* Fila principal */}
                      <tr className="bg-white dark:bg-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-750">
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={bien.descripcion}
                            onChange={(e) => actualizar(bien.id, 'descripcion', e.target.value)}
                            placeholder="Descripción del bien"
                            className={CELL_CLS}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={bien.codigoBien ?? ''}
                            onChange={(e) => actualizar(bien.id, 'codigoBien', e.target.value)}
                            placeholder="—"
                            className={CELL_CLS}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={bien.cantidad}
                            min={0}
                            step="any"
                            onChange={(e) =>
                              actualizar(bien.id, 'cantidad', parseFloat(e.target.value) || 0)
                            }
                            className={CELL_CLS}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={bien.unidad}
                            onChange={(e) => actualizar(bien.id, 'unidad', e.target.value)}
                            className={CELL_CLS}
                          >
                            {UNIDADES_MEDIDA.map((u) => (
                              <option key={u.code} value={u.code}>
                                {u.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={bien.normalizado}
                            onChange={(e) => toggleNormalizado(bien.id, e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-violet-600"
                            title="Activa campos SUNAT adicionales"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => eliminar(bien.id)}
                            className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>

                      {/* Fila SUNAT — solo cuando está normalizado */}
                      {bien.normalizado && (
                        <tr className="bg-violet-50/50 dark:bg-violet-900/10">
                          <td colSpan={6} className="px-3 py-2.5">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div className="sm:col-span-2">
                                <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">
                                  Bien normalizado
                                </label>
                                <select
                                  value={bien.codigoSubpartidaNacional ?? ''}
                                  onChange={(e) =>
                                    seleccionarBienNormalizado(bien.id, e.target.value)
                                  }
                                  className={CELL_CLS}
                                >
                                  <option value="">— Seleccionar —</option>
                                  {BIENES_NORMALIZADOS.filter((b) => b.estado === 'Vigente').map(
                                    (b) => (
                                      <option
                                        key={b.subpartidaNacional}
                                        value={b.subpartidaNacional}
                                      >
                                        {b.subpartidaNacional} – {b.descripcion}
                                      </option>
                                    ),
                                  )}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">
                                  Cód. producto SUNAT
                                </label>
                                <input
                                  type="text"
                                  value={bien.codigoProductoSunat ?? ''}
                                  readOnly
                                  className={`${CELL_CLS} bg-gray-50 dark:bg-gray-700 cursor-default`}
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">
                                  Cód. subpartida arancelaria
                                </label>
                                <input
                                  type="text"
                                  value={bien.codigoSubpartidaNacional ?? ''}
                                  readOnly
                                  className={`${CELL_CLS} bg-gray-50 dark:bg-gray-700 cursor-default`}
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">
                                  GTIN
                                </label>
                                <input
                                  type="text"
                                  value={bien.codigoGTIN ?? ''}
                                  onChange={(e) =>
                                    actualizar(bien.id, 'codigoGTIN', e.target.value)
                                  }
                                  placeholder="Opcional"
                                  className={CELL_CLS}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Acción complementaria: agregar bien manualmente */}
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={agregar}
                className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200 font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar bien
              </button>
            </div>
          </div>
        )}

        {/* Peso bruto total y unidad de peso */}
        <div className="flex items-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="w-40">
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
              className="w-full h-9 px-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
            />
          </div>
          <div className="w-32">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Unidad de peso
            </label>
            <select
              value={unidadPeso}
              onChange={(e) => onUnidadPesoChange(e.target.value as UnidadPeso)}
              className="w-full h-9 px-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
            >
              <option value="KGM">Kilogramo (KGM)</option>
              <option value="TNE">Tonelada (TNE)</option>
            </select>
          </div>
        </div>
      </div>
    </ConfigurationCard>
  );
}
