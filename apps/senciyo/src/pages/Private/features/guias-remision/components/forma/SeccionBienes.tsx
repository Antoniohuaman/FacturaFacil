import { useCallback } from 'react';
import { Plus, Trash2, Package } from 'lucide-react';
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
  'w-full h-8 px-2 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white';

export default function SeccionBienes({
  bienes,
  onChange,
  pesoTotal,
  unidadPeso,
  onPesoTotalChange,
  onUnidadPesoChange,
}: SeccionBienesProps) {
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
                codigoBien: activo ? b.codigoBien : undefined,
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
    <div>
      {/* Sub-encabezado */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Package className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Bienes a transportar
          </span>
          {bienes.length > 0 && (
            <span className="ml-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full font-medium tabular-nums">
              {bienes.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={agregar}
          className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200 font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar bien
        </button>
      </div>

      <div className="space-y-2">
        {bienes.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 py-1">
            Sin bienes. Haz clic en &ldquo;Agregar bien&rdquo; para comenzar.
          </p>
        ) : (
          bienes.map((bien) => (
            <div
              key={bien.id}
              className="border border-gray-100 dark:border-gray-700 rounded-lg p-2.5 space-y-2"
            >
              {/* Fila principal */}
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <input
                    type="text"
                    value={bien.descripcion}
                    onChange={(e) => actualizar(bien.id, 'descripcion', e.target.value)}
                    placeholder="Descripción del bien"
                    className={CELL_CLS}
                  />
                </div>
                <div className="col-span-3">
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
                </div>
                <div className="col-span-2">
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
                </div>
                <div className="col-span-1 flex items-center justify-center">
                  <label className="flex items-center gap-1 cursor-pointer" title="Bien normalizado SUNAT">
                    <input
                      type="checkbox"
                      checked={bien.normalizado}
                      onChange={(e) => toggleNormalizado(bien.id, e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      Norm.
                    </span>
                  </label>
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => eliminar(bien.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Campos SUNAT — solo cuando está normalizado */}
              {bien.normalizado && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1.5 border-t border-gray-100 dark:border-gray-700">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                      Bien normalizado
                    </label>
                    <select
                      value={bien.codigoSubpartidaNacional ?? ''}
                      onChange={(e) => seleccionarBienNormalizado(bien.id, e.target.value)}
                      className={CELL_CLS}
                    >
                      <option value="">— Seleccionar —</option>
                      {BIENES_NORMALIZADOS.filter((b) => b.estado === 'Vigente').map((b) => (
                        <option key={b.subpartidaNacional} value={b.subpartidaNacional}>
                          {b.subpartidaNacional} – {b.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                      Cód. producto SUNAT
                    </label>
                    <input
                      type="text"
                      value={bien.codigoProductoSunat ?? ''}
                      readOnly
                      className={`${CELL_CLS} bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                      Código bien
                    </label>
                    <input
                      type="text"
                      value={bien.codigoBien ?? ''}
                      onChange={(e) => actualizar(bien.id, 'codigoBien', e.target.value)}
                      placeholder="Opcional"
                      className={CELL_CLS}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                      GTIN
                    </label>
                    <input
                      type="text"
                      value={bien.codigoGTIN ?? ''}
                      onChange={(e) => actualizar(bien.id, 'codigoGTIN', e.target.value)}
                      placeholder="Opcional"
                      className={CELL_CLS}
                    />
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {/* Peso bruto total */}
        <div className="flex items-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
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
    </div>
  );
}
