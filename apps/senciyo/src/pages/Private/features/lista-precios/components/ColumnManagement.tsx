import React from 'react';
import { Edit2, Info, Check } from 'lucide-react';
import type { Column } from '../models/PriceTypes';
import type { ConfigCanalesVenta } from '../models/configuracionCanales';
import {
  isMinAllowedColumn,
  getColumnDisplayName
} from '../utils/priceHelpers';

interface ColumnManagementProps {
  columns: Column[];
  configCanales: ConfigCanalesVenta;
  onEditColumn: (column: Column) => void;
  onToggleEstado: (columnId: string) => void;
  onToggleUsarEnPOS: (columnId: string) => void;
  onToggleUsarEnComprobantes: (columnId: string) => void;
  onSetPredeterminadoPOS: (columnId: string) => void;
  onSetPredeterminadoComprobantes: (columnId: string) => void;
}

const Toggle: React.FC<{
  checked: boolean;
  locked?: boolean;
  title?: string;
  onChange?: () => void;
}> = ({ checked, locked, title, onChange }) => {
  if (locked) {
    return (
      <span
        className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${
          checked
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
        }`}
        title={title}
      >
        {checked ? <Check size={11} /> : <span className="text-xs leading-none">—</span>}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
        checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
      }`}
      title={title}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
};

export const ColumnManagement: React.FC<ColumnManagementProps> = ({
  columns,
  configCanales,
  onEditColumn,
  onToggleEstado,
  onToggleUsarEnPOS,
  onToggleUsarEnComprobantes,
  onSetPredeterminadoPOS,
  onSetPredeterminadoComprobantes
}) => {
  const tiposVisibles = columns.filter(col => col.kind !== 'global-discount' && col.kind !== 'global-increase');

  return (
    <div className="p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tipos de precio</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Define qué precios se usan en POS y comprobantes.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">TIPO</th>
                  <th
                    className="text-center py-3 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    title="Habilita este tipo de precio para usarlo en el módulo."
                  >
                    ESTADO
                  </th>
                  <th
                    className="text-center py-3 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    title="Disponible como opción de precio en Punto de Venta."
                  >
                    USAR EN POS
                  </th>
                  <th
                    className="text-center py-3 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    title="Disponible como opción de precio en la emisión tradicional."
                  >
                    USAR EN COMPROBANTES
                  </th>
                  <th
                    className="text-center py-3 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    title="Se selecciona automáticamente al abrir Punto de Venta."
                  >
                    PRED. POS
                  </th>
                  <th
                    className="text-center py-3 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    title="Se selecciona automáticamente al emitir comprobantes."
                  >
                    PRED. COMPROBANTES
                  </th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {tiposVisibles.map((column) => {
                  const isMinAllowed = isMinAllowedColumn(column);
                  const isEstadoActivo = column.visible !== false;
                  const usaEnPOS = column.usarEnPuntoVenta !== false;
                  const usaEnComprobantes = column.usarEnComprobantes !== false;

                  // Todos los tipos tienen Estado interactivo
                  // POS/Comp: bloqueados solo cuando Estado está apagado
                  const posLocked = !isEstadoActivo;
                  const posChecked = isEstadoActivo && usaEnPOS;
                  const compLocked = !isEstadoActivo;
                  const compChecked = isEstadoActivo && usaEnComprobantes;

                  // Predeterminado: solo cuando Estado y canal están activos, y no es precio mínimo
                  const puedeSerPredPOS = !isMinAllowed && isEstadoActivo && usaEnPOS;
                  const puedeSerPredComp = !isMinAllowed && isEstadoActivo && usaEnComprobantes;
                  const esPredPOS = configCanales.predeterminadoPuntoVenta === column.id;
                  const esPredComp = configCanales.predeterminadoComprobantes === column.id;

                  return (
                    <tr
                      key={column.id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                            {column.id}
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {getColumnDisplayName(column)}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-2 text-center">
                        <Toggle
                          checked={isEstadoActivo}
                          onChange={() => onToggleEstado(column.id)}
                          title={
                            isEstadoActivo
                              ? 'Deshabilitar este tipo de precio'
                              : 'Habilitar este tipo de precio'
                          }
                        />
                      </td>

                      <td className="py-3 px-2 text-center">
                        <Toggle
                          checked={posChecked}
                          locked={posLocked}
                          onChange={() => onToggleUsarEnPOS(column.id)}
                          title={
                            !isEstadoActivo
                              ? 'Habilita el tipo primero para configurar su uso en Punto de Venta.'
                              : usaEnPOS
                              ? 'Deshabilitar en Punto de Venta'
                              : 'Habilitar en Punto de Venta'
                          }
                        />
                      </td>

                      <td className="py-3 px-2 text-center">
                        <Toggle
                          checked={compChecked}
                          locked={compLocked}
                          onChange={() => onToggleUsarEnComprobantes(column.id)}
                          title={
                            !isEstadoActivo
                              ? 'Habilita el tipo primero para configurar su uso en Comprobantes.'
                              : usaEnComprobantes
                              ? 'Deshabilitar en Comprobantes'
                              : 'Habilitar en Comprobantes'
                          }
                        />
                      </td>

                      <td className="py-3 px-2 text-center">
                        {isMinAllowed ? (
                          <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => puedeSerPredPOS && onSetPredeterminadoPOS(column.id)}
                            disabled={!puedeSerPredPOS}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              esPredPOS
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : puedeSerPredPOS
                                ? 'border-gray-300 text-transparent hover:border-blue-400 hover:text-blue-400'
                                : 'border-gray-200 text-transparent opacity-25'
                            }`}
                            title={
                              esPredPOS
                                ? 'Predeterminado en POS'
                                : puedeSerPredPOS
                                ? 'Usar como predeterminado en POS'
                                : !isEstadoActivo
                                ? 'Habilita el tipo primero'
                                : 'Habilita en POS primero'
                            }
                            aria-pressed={esPredPOS}
                          >
                            <Check size={12} />
                          </button>
                        )}
                      </td>

                      <td className="py-3 px-2 text-center">
                        {isMinAllowed ? (
                          <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => puedeSerPredComp && onSetPredeterminadoComprobantes(column.id)}
                            disabled={!puedeSerPredComp}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              esPredComp
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : puedeSerPredComp
                                ? 'border-gray-300 text-transparent hover:border-blue-400 hover:text-blue-400'
                                : 'border-gray-200 text-transparent opacity-25'
                            }`}
                            title={
                              esPredComp
                                ? 'Predeterminado en Comprobantes'
                                : puedeSerPredComp
                                ? 'Usar como predeterminado en Comprobantes'
                                : !isEstadoActivo
                                ? 'Habilita el tipo primero'
                                : 'Habilita en Comprobantes primero'
                            }
                            aria-pressed={esPredComp}
                          >
                            <Check size={12} />
                          </button>
                        )}
                      </td>

                      <td className="py-3 px-2">
                        <button
                          type="button"
                          onClick={() => onEditColumn(column)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                          title="Editar tipo de precio"
                        >
                          <Edit2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200 dark:bg-blue-900/10 dark:border-blue-800">
            <div className="flex">
              <Info size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 mr-2 shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <p>
                  <strong>Estado:</strong> Habilita el tipo de precio para usarlo en el módulo, en POS y en Comprobantes.
                </p>
                <p>
                  <strong>Precio base (P1):</strong> Referencia principal, siempre activo en todos los canales.
                </p>
                <p>
                  <strong>Predeterminado:</strong> El tipo de precio que se preselecciona al abrir POS o al emitir comprobantes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
