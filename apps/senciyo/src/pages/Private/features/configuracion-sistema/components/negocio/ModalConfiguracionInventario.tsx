import { useState, useEffect, useCallback } from 'react';
import {
  X,
  FileText,
  ShoppingCart,
  ClipboardList,
  BookOpen,
  ArrowUpCircle,
  ArrowDownCircle,
  Info,
  AlertTriangle,
} from 'lucide-react';
import type { StockDescuentoDocumento } from '../../contexto/ContextoConfiguracion';
import { useConfigurationContext } from '../../contexto/ContextoConfiguracion';
import { useFeedback } from '@/shared/feedback/useFeedback';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type CampoDescuento =
  | 'stockDescuentoFacturaYBoleta'
  | 'stockDescuentoNotaVenta'
  | 'stockDescuentoGuiaRemision';

type OpcionConfigurable = {
  campo: CampoDescuento;
  label: string;
  textoAutomatico: string;
  icon: React.ComponentType<{ className?: string }>;
};

type DocumentoFijo = {
  label: string;
  regla: string;
  tooltip: string;
  icon: React.ComponentType<{ className?: string }>;
};

const OPCIONES_CONFIGURABLES: OpcionConfigurable[] = [
  {
    campo: 'stockDescuentoFacturaYBoleta',
    label: 'Factura / Boleta',
    textoAutomatico: 'Automático al emitir',
    icon: FileText,
  },
  {
    campo: 'stockDescuentoNotaVenta',
    label: 'Nota de Venta',
    textoAutomatico: 'Automático al generar',
    icon: ShoppingCart,
  },
  {
    campo: 'stockDescuentoGuiaRemision',
    label: 'Guía de Remisión',
    textoAutomatico: 'Automático al emitir',
    icon: FileText,
  },
];

const DOCUMENTOS_FIJOS: DocumentoFijo[] = [
  {
    label: 'Orden de Venta',
    regla: 'Reserva stock',
    tooltip: 'La Orden de Venta reserva stock, pero no descuenta inventario.',
    icon: ClipboardList,
  },
  {
    label: 'Cotización',
    regla: 'No afecta stock',
    tooltip: 'La Cotización es referencial y no modifica inventario.',
    icon: BookOpen,
  },
  {
    label: 'Nota de Ingreso',
    regla: 'Aumenta stock',
    tooltip: 'La Nota de Ingreso registra entradas de productos al almacén.',
    icon: ArrowUpCircle,
  },
  {
    label: 'Nota de Salida',
    regla: 'Descuenta stock',
    tooltip: 'La Nota de Salida representa el despacho físico y siempre requiere stock disponible.',
    icon: ArrowDownCircle,
  },
];

function TooltipInfo({ text }: { text: string }) {
  return (
    <div className="group relative inline-flex">
      <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-500 cursor-help" />
      <div className="invisible group-hover:visible absolute left-5 top-0 w-52 bg-gray-900 text-white text-xs rounded-lg p-2.5 z-50 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg leading-relaxed">
        {text}
        <div className="absolute left-0 top-1 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45" />
      </div>
    </div>
  );
}

export default function ModalConfiguracionInventario({ isOpen, onClose }: Props) {
  const { state, dispatch } = useConfigurationContext();
  const feedback = useFeedback();
  const prefs = state.salesPreferences;
  const estaActivo = prefs.controlStockActivo ?? false;

  const [localFyB, setLocalFyB] = useState<StockDescuentoDocumento>(
    prefs.stockDescuentoFacturaYBoleta ?? 'automatico',
  );
  const [localNV, setLocalNV] = useState<StockDescuentoDocumento>(
    prefs.stockDescuentoNotaVenta ?? 'automatico',
  );
  const [localGR, setLocalGR] = useState<StockDescuentoDocumento>(
    prefs.stockDescuentoGuiaRemision ?? 'automatico',
  );
  const [mostrandoConfirmDesactivar, setMostrandoConfirmDesactivar] = useState(false);

  // Sincroniza estado local al abrir el modal
  useEffect(() => {
    if (isOpen) {
      setLocalFyB(prefs.stockDescuentoFacturaYBoleta ?? 'automatico');
      setLocalNV(prefs.stockDescuentoNotaVenta ?? 'automatico');
      setLocalGR(prefs.stockDescuentoGuiaRemision ?? 'automatico');
      setMostrandoConfirmDesactivar(false);
    }
  }, [isOpen, prefs.stockDescuentoFacturaYBoleta, prefs.stockDescuentoNotaVenta, prefs.stockDescuentoGuiaRemision]);


  const handleClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleClose]);

  const valorPorCampo = (campo: CampoDescuento): StockDescuentoDocumento => {
    if (campo === 'stockDescuentoFacturaYBoleta') return localFyB;
    if (campo === 'stockDescuentoNotaVenta') return localNV;
    return localGR;
  };

  const setValorPorCampo = (campo: CampoDescuento, valor: StockDescuentoDocumento) => {
    if (campo === 'stockDescuentoFacturaYBoleta') setLocalFyB(valor);
    else if (campo === 'stockDescuentoNotaVenta') setLocalNV(valor);
    else setLocalGR(valor);
  };

  const handleGuardar = () => {
    const eraPreviamenteActivo = estaActivo;
    dispatch({
      type: 'SET_SALES_PREFERENCES',
      payload: {
        ...prefs,
        controlStockActivo: true,
        allowNegativeStock: false,
        stockDescuentoFacturaYBoleta: localFyB,
        stockDescuentoNotaVenta: localNV,
        stockDescuentoGuiaRemision: localGR,
      },
    });
    if (eraPreviamenteActivo) {
      feedback.success('Configuración de inventario actualizada correctamente.');
    } else {
      feedback.success('Configuración de inventario activada correctamente.');
    }
    onClose();
  };

  const handleDesactivar = () => {
    dispatch({
      type: 'SET_SALES_PREFERENCES',
      payload: {
        ...prefs,
        controlStockActivo: false,
      },
    });
    feedback.info('Inventario desactivado.');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={handleClose}
        />

        {/* Panel */}
        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all w-full max-w-lg sm:my-8">

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Configurar inventario</h2>
              <p className="mt-0.5 text-xs text-gray-500 leading-relaxed max-w-md">
                Define cómo se descontará el stock en tus documentos. Esta configuración evitará movimientos duplicados y mantendrá el Kardex ordenado.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="ml-4 flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {mostrandoConfirmDesactivar ? (
            /* Pantalla de confirmación de desactivación */
            <div className="px-6 py-6 space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    ¿Desactivar el inventario?
                  </p>
                  <p className="mt-1 text-xs text-amber-700 leading-relaxed">
                    Al desactivar, tus documentos dejarán de descontar stock según estas reglas. El stock registrado, movimientos y Kardex histórico se conservarán.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setMostrandoConfirmDesactivar(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDesactivar}
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Desactivar control
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Tabla */}
              <div className="px-6 py-4">
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs uppercase tracking-wide">
                          Documento
                        </th>
                        <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs uppercase tracking-wide">
                          Comportamiento de inventario
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {OPCIONES_CONFIGURABLES.map(({ campo, label, textoAutomatico, icon: Icon }) => {
                        const valor = valorPorCampo(campo);
                        return (
                          <tr key={campo} className="bg-white hover:bg-gray-50/60 transition-colors">
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-2 text-gray-800 font-medium">
                                <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                {label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-4">
                                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                  <input
                                    type="radio"
                                    name={campo}
                                    value="automatico"
                                    checked={valor === 'automatico'}
                                    onChange={() => setValorPorCampo(campo, 'automatico')}
                                    className="w-3.5 h-3.5 accent-blue-600"
                                  />
                                  <span className="text-gray-700 text-xs">{textoAutomatico}</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                  <input
                                    type="radio"
                                    name={campo}
                                    value="nota_salida"
                                    checked={valor === 'nota_salida'}
                                    onChange={() => setValorPorCampo(campo, 'nota_salida')}
                                    className="w-3.5 h-3.5 accent-blue-600"
                                  />
                                  <span className="text-gray-700 text-xs">Mediante Nota de Salida</span>
                                </label>
                                {campo === 'stockDescuentoNotaVenta' && (
                                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                    <input
                                      type="radio"
                                      name={campo}
                                      value="sin_control"
                                      checked={valor === 'sin_control'}
                                      onChange={() => setValorPorCampo(campo, 'sin_control')}
                                      className="w-3.5 h-3.5 accent-blue-600"
                                    />
                                    <span className="text-gray-700 text-xs">No afecta stock</span>
                                  </label>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {DOCUMENTOS_FIJOS.map(({ label, regla, tooltip, icon: Icon }) => (
                        <tr key={label} className="bg-gray-50/40">
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-2 text-gray-500">
                              <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              {label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1.5 text-gray-500 text-xs">
                              {regla}
                              <TooltipInfo text={tooltip} />
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-100">
                {/* Desactivar — solo visible cuando ya está activo */}
                {estaActivo ? (
                  <button
                    type="button"
                    onClick={() => setMostrandoConfirmDesactivar(true)}
                    className="text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    Desactivar control de inventario
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleGuardar}
                    className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    {estaActivo ? 'Guardar cambios' : 'Activar inventario'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
