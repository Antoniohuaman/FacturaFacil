// src/features/gestion-inventario/components/disponibilidad/DisponibilidadTable.tsx

import React from 'react';
import type {
  DisponibilidadItem,
  DensidadTabla,
  ColumnaDisponibilidad,
  OrdenamientoDisponibilidad,
  SituacionStock
} from '../../models/disponibilidad.types';

interface DisponibilidadTableProps {
  datos: DisponibilidadItem[];
  densidad: DensidadTabla;
  columnasVisibles: ColumnaDisponibilidad[];
  ordenamiento: OrdenamientoDisponibilidad;
  onOrdenamientoChange: (campo: ColumnaDisponibilidad) => void;
  onAjustarStock?: (item: DisponibilidadItem) => void;
}

const DisponibilidadTable: React.FC<DisponibilidadTableProps> = ({
  datos,
  densidad,
  columnasVisibles,
  ordenamiento,
  onOrdenamientoChange,
  onAjustarStock
}) => {
  // Clases según densidad - MÁS COMPACTO
  const densidadClasses = {
    compacta: 'py-1.5 px-2.5 text-xs',
    comoda: 'py-2.5 px-3.5 text-sm',
    espaciosa: 'py-3.5 px-4.5 text-base'
  };

  const cellClass = densidadClasses[densidad];

  // Renderizar badge de situación - ESTILO NEUTRO TIPO JIRA
  const renderSituacionBadge = (situacion: SituacionStock) => {
    // Badges neutros: solo OK (verde suave) y Sin stock (gris)
    // Bajo y Crítico se ven en la columna "Disponible" con color
    if (situacion === 'OK') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
          OK
        </span>
      );
    }

    // Sin stock
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600">
        Sin stock
      </span>
    );
  };

  // Renderizar header con ordenamiento
  const renderHeader = (
    campo: ColumnaDisponibilidad,
    label: string,
    align: 'left' | 'center' | 'right' = 'left',
    sortable: boolean = true
  ) => {
    if (!columnasVisibles.includes(campo)) return null;

    const isOrdenado = ordenamiento.campo === campo;
    const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

    // Sticky columns para Código y Producto
    const stickyClasses = campo === 'codigo'
      ? 'sticky left-0 z-20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]'
      : campo === 'producto'
      ? 'sticky left-[100px] z-20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]'
      : '';

    return (
      <th
        key={campo}
        scope="col"
        className={`${cellClass} ${alignClass} ${stickyClasses} font-semibold text-[#111827] dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border-b-2 border-[#E5E7EB] dark:border-gray-700 sticky top-0 z-10`}
      >
        {sortable ? (
          <button
            onClick={() => onOrdenamientoChange(campo)}
            className="inline-flex items-center gap-1.5 hover:text-[#6F36FF] dark:hover:text-[#8B5CF6] transition-colors duration-150"
          >
            <span>{label}</span>
            {isOrdenado && (
              <svg
                className={`w-4 h-4 transition-transform ${
                  ordenamiento.direccion === 'desc' ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
          </button>
        ) : (
          <span>{label}</span>
        )}
      </th>
    );
  };

  // Si no hay datos
  if (datos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <svg
          className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
          No hay productos para mostrar
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Ajusta los filtros para ver los datos de inventario
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-[#E5E7EB] dark:border-gray-700 rounded-lg shadow-sm">
      <table className="min-w-full divide-y divide-[#E5E7EB] dark:divide-gray-700">
        <thead>
          <tr>
            {renderHeader('codigo', 'Código', 'left', true)}
            {renderHeader('producto', 'Producto', 'left', true)}
            {renderHeader('unidadMinima', 'Unidad mínima', 'center', false)}
            {renderHeader('real', 'Real', 'right', true)}
            {renderHeader('reservado', 'Reservado', 'right', true)}
            {renderHeader('disponible', 'Disponible', 'right', true)}
            {renderHeader('situacion', 'Estado', 'center', true)}
            {renderHeader('acciones', 'Acciones', 'center', false)}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700/50">
          {datos.map((item, index) => (
            <tr
              key={`${item.productoId}-${index}`}
              className="hover:bg-[#6F36FF]/5 dark:hover:bg-[#6F36FF]/8 transition-colors duration-150"
            >
              {/* Código - STICKY */}
              {columnasVisibles.includes('codigo') && (
                <td className={`${cellClass} font-mono text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 sticky left-0 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)]`}>
                  {item.sku}
                </td>
              )}

              {/* Producto - STICKY */}
              {columnasVisibles.includes('producto') && (
                <td className={`${cellClass} text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 sticky left-[100px] z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)]`}>
                  <div className="flex flex-col">
                    <span className="font-medium">{item.nombre}</span>
                    {item.stockMinimo !== undefined && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Min: {item.stockMinimo}
                        {item.stockMaximo !== undefined && ` | Max: ${item.stockMaximo}`}
                      </span>
                    )}
                  </div>
                </td>
              )}

              {/* Unidad mínima */}
              {columnasVisibles.includes('unidadMinima') && (
                <td className={`${cellClass} text-center text-gray-700 dark:text-gray-300 uppercase`}>
                  {item.unidadMinima || '—'}
                </td>
              )}

              {/* Real */}
              {columnasVisibles.includes('real') && (
                <td className={`${cellClass} text-right font-medium text-gray-900 dark:text-gray-100`}>
                  {item.real.toLocaleString()}
                </td>
              )}

              {/* Reservado - COLOR SEMÁNTICO #D97706 */}
              {columnasVisibles.includes('reservado') && (
                <td className={`${cellClass} text-right text-[#4B5563] dark:text-gray-400`}>
                  {item.reservado > 0 ? (
                    <span className="font-medium text-[#D97706] dark:text-[#F59E0B] tabular-nums">
                      {item.reservado.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">-</span>
                  )}
                </td>
              )}

              {/* Disponible - COLORES SEMÁNTICOS: OK #10B981, Sin stock #EF4444 */}
              {columnasVisibles.includes('disponible') && (
                <td className={`${cellClass} text-right`}>
                  <span
                    className={`font-bold tabular-nums ${
                      item.disponible === 0
                        ? 'text-[#EF4444] dark:text-[#F87171]'
                        : item.disponible < (item.stockMinimo || 0)
                        ? 'text-[#D97706] dark:text-[#F59E0B]'
                        : 'text-[#10B981] dark:text-[#34D399]'
                    }`}
                  >
                    {item.disponible.toLocaleString()}
                  </span>
                </td>
              )}

              {/* Situación */}
              {columnasVisibles.includes('situacion') && (
                <td className={`${cellClass} text-center`}>
                  {renderSituacionBadge(item.situacion)}
                </td>
              )}

              {/* Acciones */}
              {columnasVisibles.includes('acciones') && (
                <td className={`${cellClass} text-center`}>
                  <button
                    onClick={() => onAjustarStock?.(item)}
                    className="inline-flex items-center justify-center w-8 h-8 text-[#4B5563] dark:text-gray-400 hover:text-[#6F36FF] dark:hover:text-[#8B5CF6] hover:bg-[#6F36FF]/8 dark:hover:bg-[#6F36FF]/15 rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35 focus:ring-offset-1"
                    title="Ajustar stock (Alt+E)"
                    aria-label={`Ajustar stock de ${item.nombre}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DisponibilidadTable;
