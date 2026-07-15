import { useState } from 'react';
import { SlidersHorizontal, Trash2 } from 'lucide-react';
import { Tooltip, TablaLineasDocumento, BadgeStock, BadgeImpuesto, type ColumnaTablaLineas } from '@/shared/ui';
import { formatMoney } from '@/shared/currency';
import {
  formatearEtiquetaImpuesto,
  construirFilasResumenTributarioCompra,
  type TotalesLineasCompra,
} from '../../logica/reglasCompras';
import type { LineaCompra } from '../../modelos/LineaCompra';
import type { UseLineasCompraResultado } from './useLineasCompra';
import ProductSelector from '../../../comprobantes-electronicos/lista-comprobantes/pages/ProductSelector';

interface SeccionProductosCompraProps {
  moneda: string;
  lineasCompra: UseLineasCompraResultado;
  totalesCalculados: TotalesLineasCompra;
  /** Bloquea cantidad/unidad/costo, oculta eliminar línea y el alta de productos (ej. comprobante con pagos aplicados o proveniente de una OC). */
  disabled?: boolean;
  /** Igual que `disabled`, salvo que la cantidad sigue editable (conversión de OC a CC con facturación parcial: el producto/costo/unidad/impuesto son heredados, pero la cantidad a facturar es propia del CC). Ignorado si `disabled` es true. */
  soloCantidadEditable?: boolean;
}

interface DefinicionColumna extends ColumnaTablaLineas {
  fija: boolean;
}

const COLUMNAS_INICIO: DefinicionColumna[] = [
  { id: 'producto', label: 'Producto', align: 'left', minWidth: '200px', fija: true },
  { id: 'codigo', label: 'Código', align: 'left', width: '110px', fija: true },
  { id: 'cantidad', label: 'Cantidad', align: 'center', width: '110px', fija: true },
  { id: 'unidad', label: 'Unidad', align: 'center', minWidth: '140px', fija: true },
];

const COLUMNAS_CONFIGURABLES: DefinicionColumna[] = [
  { id: 'imagen', label: 'Imagen', align: 'center', width: '80px', fija: false },
  { id: 'stock', label: 'Stock', align: 'center', width: '90px', fija: false },
  { id: 'impuesto', label: 'Impuesto', align: 'center', minWidth: '140px', fija: false },
  { id: 'alias', label: 'Alias', align: 'left', minWidth: '130px', fija: false },
  { id: 'descripcion', label: 'Descripción', align: 'left', minWidth: '180px', fija: false },
  { id: 'categoria', label: 'Categoría', align: 'left', width: '130px', fija: false },
  { id: 'marca', label: 'Marca', align: 'left', width: '120px', fija: false },
  { id: 'modelo', label: 'Modelo', align: 'left', width: '120px', fija: false },
  { id: 'tipoProducto', label: 'Tipo', align: 'center', width: '100px', fija: false },
  { id: 'tipoExistencia', label: 'Tipo Existencia', align: 'left', minWidth: '140px', fija: false },
  { id: 'codigoBarras', label: 'Cód. Barras', align: 'left', width: '130px', fija: false },
  { id: 'codigoFabrica', label: 'Cód. Fábrica', align: 'left', width: '130px', fija: false },
  { id: 'codigoSunat', label: 'Cód. SUNAT', align: 'left', width: '130px', fija: false },
  { id: 'peso', label: 'Peso (kg)', align: 'right', width: '100px', fija: false },
  { id: 'precioCompra', label: 'P. Compra', align: 'right', width: '110px', fija: false },
];

const COLUMNAS_FIN: DefinicionColumna[] = [
  { id: 'costo', label: 'Costo U.', align: 'right', minWidth: '130px', fija: true },
  { id: 'subtotal', label: 'Subtotal', align: 'right', width: '110px', fija: true },
  { id: 'total', label: 'Total', align: 'right', width: '110px', fija: true },
  { id: 'accion', label: 'Acción', align: 'center', width: '70px', fija: true },
];

const COLUMNAS_VISIBLES_DEFAULT = ['imagen', 'stock'];
const STORAGE_KEY = 'compras_table_columns_config';

function cargarColumnasVisiblesGuardadas(): string[] {
  try {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (!guardado) return COLUMNAS_VISIBLES_DEFAULT;
    const parseado = JSON.parse(guardado) as string[];
    const idsValidos = new Set(COLUMNAS_CONFIGURABLES.map((c) => c.id));
    const validas = parseado.filter((id) => idsValidos.has(id));
    return validas.length > 0 ? validas : COLUMNAS_VISIBLES_DEFAULT;
  } catch {
    return COLUMNAS_VISIBLES_DEFAULT;
  }
}

/**
 * Sección de productos/servicios de un documento de Compras (OC o CC),
 * construida sobre el mismo shell de tabla que usan Comprobantes y
 * Documentos Comerciales (@/shared/ui TablaLineasDocumento). Toda línea
 * proviene de un producto real del catálogo (buscador siempre visible,
 * incluye alta de producto nuevo vía ProductSelector); no existen líneas
 * libres ni datos maestros del producto editables desde esta tabla.
 */
export default function SeccionProductosCompra({
  moneda,
  lineasCompra,
  totalesCalculados,
  disabled = false,
  soloCantidadEditable = false,
}: SeccionProductosCompraProps) {
  const { lineas, actualizarLinea, actualizarUnidadLinea, eliminarLinea, agregarProductosDesdeCatalogo } = lineasCompra;
  // La cantidad solo se bloquea con `disabled` completo; el resto de campos y
  // acciones (unidad, costo, eliminar línea, alta de productos) se bloquean
  // también con `soloCantidadEditable` (conversión de OC con facturación
  // parcial: producto/costo/unidad/impuesto son heredados de la OC).
  const bloqueoCompleto = disabled || soloCantidadEditable;
  const [mostrarColumnas, setMostrarColumnas] = useState(false);
  const [columnasVisibles, setColumnasVisibles] = useState<string[]>(cargarColumnasVisiblesGuardadas);

  const idsProductosEnLineas = lineas.filter((l) => !!l.productoId).map((l) => l.productoId!);
  const columnasTabla = [
    ...COLUMNAS_INICIO,
    ...COLUMNAS_CONFIGURABLES.filter((c) => columnasVisibles.includes(c.id)),
    ...COLUMNAS_FIN,
  ];

  function alternarColumna(columnaId: string) {
    setColumnasVisibles((prev) => {
      const siguiente = prev.includes(columnaId) ? prev.filter((id) => id !== columnaId) : [...prev, columnaId];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(siguiente));
      } catch {
        // Sin acción: si falla localStorage, la preferencia solo dura la sesión.
      }
      return siguiente;
    });
  }

  function renderCelda(columnaId: string, linea: LineaCompra) {
    switch (columnaId) {
      case 'producto':
        return (
          <td className="px-3 py-2.5">
            <div className="font-medium text-gray-900 text-xs">{linea.nombreProducto}</div>
          </td>
        );

      case 'codigo':
        return (
          <td className="px-3 py-2.5">
            <div className="text-[11px] text-gray-600 font-mono">{linea.codigoProducto || '-'}</div>
          </td>
        );

      case 'cantidad':
        return (
          <td className="px-3 py-2.5">
            <input
              type="number"
              min="0.001"
              step="0.001"
              value={linea.cantidadSolicitada}
              disabled={disabled}
              onChange={(e) => actualizarLinea(linea.id, 'cantidadSolicitada', parseFloat(e.target.value) || 0)}
              className="w-full text-center text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:bg-gray-100 disabled:text-gray-400"
            />
          </td>
        );

      case 'unidad': {
        if (linea.unidadesDisponibles.length === 0) {
          return (
            <td className="px-3 py-2.5 text-center">
              <span className="text-[11px] font-medium text-red-600">Sin unidad configurada</span>
            </td>
          );
        }
        if (linea.unidadesDisponibles.length === 1) {
          return <td className="px-3 py-2.5 text-center text-xs text-gray-700">{linea.unidadMedida}</td>;
        }
        return (
          <td className="px-3 py-2.5">
            <select
              value={linea.unidadMedidaCodigo}
              disabled={bloqueoCompleto}
              onChange={(e) => actualizarUnidadLinea(linea.id, e.target.value)}
              className="w-full text-center text-xs text-gray-700 border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:bg-gray-100 disabled:text-gray-400"
            >
              {linea.unidadesDisponibles.map((opcion) => (
                <option key={opcion.code} value={opcion.code}>
                  {opcion.label}
                </option>
              ))}
            </select>
          </td>
        );
      }

      case 'imagen':
        return (
          <td className="px-3 py-2.5 text-center">
            {linea.imagen ? (
              <img src={linea.imagen} alt={linea.nombreProducto} className="w-10 h-10 object-cover rounded border border-gray-200 mx-auto" />
            ) : (
              <div className="w-10 h-10 bg-gray-100 rounded border border-gray-200 flex items-center justify-center mx-auto">
                <span className="text-gray-400 text-[10px]">Sin img</span>
              </div>
            )}
          </td>
        );

      case 'stock':
        return (
          <td className="px-3 py-2.5 text-center">
            {typeof linea.stockReferencia === 'number' ? (
              <BadgeStock stock={linea.stockReferencia} />
            ) : (
              <span className="text-xs text-gray-400">—</span>
            )}
          </td>
        );

      case 'impuesto': {
        const tasaIgv = linea.tasaIgv ?? 0;
        return (
          <td className="px-3 py-2.5 text-center">
            <BadgeImpuesto
              etiqueta={formatearEtiquetaImpuesto(linea.tipoAfectacion, tasaIgv)}
              tono={linea.tipoAfectacion === 'sin_configurar' ? 'advertencia' : 'neutral'}
            />
          </td>
        );
      }

      case 'alias':
        return <td className="px-3 py-2.5 text-xs italic text-gray-500">{linea.alias || '-'}</td>;

      case 'descripcion':
        return <td className="px-3 py-2.5 text-xs text-gray-700">{linea.descripcion || '-'}</td>;

      case 'categoria':
        return <td className="px-3 py-2.5 text-xs text-gray-700">{linea.categoria || '-'}</td>;

      case 'marca':
        return <td className="px-3 py-2.5 text-xs text-gray-700">{linea.marca || '-'}</td>;

      case 'modelo':
        return <td className="px-3 py-2.5 text-xs text-gray-700">{linea.modelo || '-'}</td>;

      case 'tipoProducto':
        return (
          <td className="px-3 py-2.5 text-center">
            <span
              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                linea.clasificacion === 'servicio' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
              }`}
            >
              {linea.clasificacion === 'servicio' ? 'SERVICIO' : 'BIEN'}
            </span>
          </td>
        );

      case 'tipoExistencia':
        return <td className="px-3 py-2.5 text-xs text-gray-700">{linea.tipoExistencia || '-'}</td>;

      case 'codigoBarras':
        return <td className="px-3 py-2.5 text-[11px] text-gray-600 font-mono">{linea.codigoBarras || '-'}</td>;

      case 'codigoFabrica':
        return <td className="px-3 py-2.5 text-[11px] text-gray-600 font-mono">{linea.codigoFabrica || '-'}</td>;

      case 'codigoSunat':
        return <td className="px-3 py-2.5 text-[11px] text-gray-600 font-mono">{linea.codigoSunat || '-'}</td>;

      case 'peso':
        return <td className="px-3 py-2.5 text-right text-xs text-gray-700">{linea.peso ? `${linea.peso} kg` : '-'}</td>;

      case 'precioCompra':
        return (
          <td className="px-3 py-2.5 text-right text-xs text-gray-700">
            {typeof linea.precioCompraReferencia === 'number' ? linea.precioCompraReferencia.toFixed(2) : '-'}
          </td>
        );

      case 'costo':
        return (
          <td className="px-3 py-2.5">
            <input
              type="number"
              min="0"
              step="0.01"
              value={linea.costoUnitario}
              disabled={bloqueoCompleto}
              onChange={(e) => actualizarLinea(linea.id, 'costoUnitario', parseFloat(e.target.value) || 0)}
              className="w-full text-right text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:bg-gray-100 disabled:text-gray-400"
            />
          </td>
        );

      case 'subtotal':
        return (
          <td className="px-3 py-2.5 text-right text-xs text-gray-700">{formatMoney(linea.subtotal, moneda)}</td>
        );

      case 'total':
        return (
          <td
            className={`px-3 py-2.5 text-right text-xs font-semibold ${linea.total < 0 ? 'text-red-600' : 'text-gray-900'}`}
          >
            {formatMoney(linea.total, moneda)}
          </td>
        );

      case 'accion':
        return (
          <td className="px-3 py-2.5 text-center">
            {!bloqueoCompleto && (
              <Tooltip contenido="Eliminar">
                <button
                  onClick={() => eliminarLinea(linea.id)}
                  className="w-7 h-7 inline-flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  aria-label="Eliminar línea"
                >
                  <Trash2 size={15} />
                </button>
              </Tooltip>
            )}
          </td>
        );

      default:
        return <td className="px-3 py-2.5" />;
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-2.5 md:p-3">
      <div className="mb-2 pb-2 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-slate-700 leading-tight">Productos - Servicios</h3>
          <Tooltip contenido="Elige qué columnas ver en la lista.">
            <button
              type="button"
              onClick={() => setMostrarColumnas((v) => !v)}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors text-[12px] font-medium text-slate-600 px-2"
              aria-label="Elegir columnas visibles"
            >
              <SlidersHorizontal size={13} />
              Columnas
            </button>
          </Tooltip>
        </div>
      </div>

      {mostrarColumnas && (
        <div className="mb-3 p-3 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg border border-violet-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {[...COLUMNAS_INICIO, ...COLUMNAS_CONFIGURABLES, ...COLUMNAS_FIN].map((columna) => {
              const visible = columna.fija || columnasVisibles.includes(columna.id);
              return (
                <label
                  key={columna.id}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border transition-all text-[11px] ${
                    columna.fija
                      ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-70'
                      : visible
                      ? 'bg-violet-100 border-violet-300 cursor-pointer hover:bg-violet-200'
                      : 'bg-white border-gray-200 cursor-pointer hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={visible}
                    disabled={columna.fija}
                    onChange={() => !columna.fija && alternarColumna(columna.id)}
                    className="w-3.5 h-3.5 text-violet-600 rounded focus:ring-2 focus:ring-violet-500 disabled:opacity-50 cursor-pointer"
                  />
                  <span className={columna.fija ? 'text-gray-500 font-medium' : 'text-gray-700'}>
                    {columna.label}
                    {columna.fija && <span className="ml-0.5 text-[10px] text-gray-400">(fija)</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {bloqueoCompleto ? (
        <div className="mb-3 p-2.5 md:p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-500">
          {soloCantidadEditable && !disabled
            ? 'Los productos provienen de la Orden de Compra: solo puedes ajustar la cantidad a facturar.'
            : 'Los productos no se pueden modificar en este comprobante.'}
        </div>
      ) : (
        <div
          data-tour="compras-productos-buscar"
          className="mb-3 p-2.5 md:p-3 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg border border-violet-100"
        >
          <ProductSelector
            onAddProducts={agregarProductosDesdeCatalogo}
            existingProducts={idsProductosEnLineas}
          />
        </div>
      )}

      <div className="rounded-lg border border-gray-200">
        <TablaLineasDocumento
          columnas={columnasTabla}
          filas={lineas}
          obtenerIdFila={(linea) => linea.id}
          renderCelda={renderCelda}
        />
      </div>

      <div className="mt-3 border-t border-gray-200 pt-3">
        <div className="flex justify-end">
          <div className="w-80 bg-white rounded-lg border border-gray-200 p-3 shadow-sm md:sticky md:top-4">
            <div className="space-y-2">
              {totalesCalculados.descuentoTotal > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Descuentos</span>
                  <span className="text-gray-700 font-medium">
                    -{formatMoney(totalesCalculados.descuentoTotal, moneda)}
                  </span>
                </div>
              )}
              {construirFilasResumenTributarioCompra(totalesCalculados).map((fila) => (
                <div key={fila.clave} className="flex justify-between items-center text-sm">
                  <span className={fila.advertencia ? 'text-red-600 font-medium' : 'text-gray-600'}>
                    {fila.etiqueta}
                  </span>
                  <span className={fila.advertencia ? 'text-red-600 font-medium' : 'text-gray-700 font-medium'}>
                    {formatMoney(fila.monto, moneda)}
                  </span>
                </div>
              ))}
              <div className="pt-2.5 mt-2.5 border-t-2 border-dashed border-gray-300">
                <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-violet-600" />
                      <span className="text-xs font-semibold tracking-[0.16em] text-violet-700 uppercase">Total</span>
                    </div>
                    <span className="text-2xl font-semibold text-gray-900">
                      {formatMoney(totalesCalculados.total, moneda)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
