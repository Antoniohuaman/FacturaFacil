import React from 'react';
import { useCaja } from '../context/CajaContext';
import { Receipt, User, CreditCard, Calendar, Clock, FileText, Hash, Info } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import type { Movimiento } from '../models';

const DetalleMovimientoCaja: React.FC<{ movimiento?: Movimiento }> = ({ movimiento }) => {
  const { movimientos, status } = useCaja();

  // Si no se proporciona movimiento y hay movimientos, tomar el primero (el más reciente)
  const movimientoMostrar = movimiento || (movimientos.length > 0 ? movimientos[0] : null);

  if (status === 'cerrada') {
    return (
      <EmptyState
        icon={Receipt}
        title="No hay caja abierta"
        description="Debe abrir una caja para poder visualizar detalles de movimientos."
      />
    );
  }

  if (!movimientoMostrar) {
    return (
      <EmptyState
        icon={Receipt}
        title="Sin movimiento seleccionado"
        description="Seleccione un movimiento desde la lista para ver sus detalles completos."
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Detalle de Movimiento</h2>
              <p className="text-sm text-blue-100">ID: {movimientoMostrar.id}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Tipo y monto destacado */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                  movimientoMostrar.tipo === 'Ingreso' ? 'bg-green-100 text-green-800 border border-green-200' :
                  movimientoMostrar.tipo === 'Egreso' ? 'bg-red-100 text-red-800 border border-red-200' :
                  'bg-blue-100 text-blue-800 border border-blue-200'
                }`}>
                  {movimientoMostrar.tipo}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Monto</p>
                <p className={`text-3xl font-bold ${
                  movimientoMostrar.tipo === 'Ingreso' ? 'text-green-600' :
                  movimientoMostrar.tipo === 'Egreso' ? 'text-red-600' :
                  'text-blue-600'
                }`}>
                  {movimientoMostrar.tipo === 'Egreso' ? '-' : '+'}S/ {movimientoMostrar.monto.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Información general */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-gray-600" />
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Concepto</span>
              </div>
              <p className="text-sm font-medium text-gray-900">{movimientoMostrar.concepto}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-gray-600" />
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Medio de Pago</span>
              </div>
              <p className="text-sm font-medium text-gray-900">{movimientoMostrar.medioPago}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-gray-600" />
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Fecha</span>
              </div>
              <p className="text-sm font-medium text-gray-900">
                {new Date(movimientoMostrar.fecha).toLocaleDateString('es-PE', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-gray-600" />
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Hora</span>
              </div>
              <p className="text-sm font-medium text-gray-900">
                {new Date(movimientoMostrar.fecha).toLocaleTimeString('es-PE', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </p>
            </div>

            {movimientoMostrar.referencia && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="w-4 h-4 text-gray-600" />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Referencia</span>
                </div>
                <p className="text-sm font-medium text-gray-900">{movimientoMostrar.referencia}</p>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Usuario</span>
              </div>
              <p className="text-sm font-medium text-gray-900">{movimientoMostrar.usuarioNombre || 'N/A'}</p>
            </div>
          </div>

          {/* Observaciones */}
          {movimientoMostrar.observaciones && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-900 mb-1">Observaciones</h4>
                  <p className="text-sm text-blue-700">{movimientoMostrar.observaciones}</p>
                </div>
              </div>
            </div>
          )}

          {/* IDs técnicos (colapsables en producción) */}
          <div className="pt-4 border-t border-gray-200">
            <details className="group">
              <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 font-medium list-none flex items-center gap-1">
                <span className="transition-transform group-open:rotate-90">▶</span>
                Información técnica
              </summary>
              <div className="mt-2 space-y-1 text-xs text-gray-600">
                <p><span className="font-medium">ID Movimiento:</span> {movimientoMostrar.id}</p>
                <p><span className="font-medium">ID Caja:</span> {movimientoMostrar.cajaId}</p>
                <p><span className="font-medium">ID Apertura:</span> {movimientoMostrar.aperturaId}</p>
                <p><span className="font-medium">ID Usuario:</span> {movimientoMostrar.usuarioId || 'N/A'}</p>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetalleMovimientoCaja;
