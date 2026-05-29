// src/features/gestion-inventario/components/transferencias/DetalleTransferencia.tsx

import React from 'react';
import { X, ArrowRight, Package, Building2, FileText } from 'lucide-react';
import type { Transferencia, EstadoTransferencia } from '../../models/transferencia.types';
import { formatBusinessDateTimeForTicket } from '@/shared/time/businessTime';

interface DetalleTransferenciaProps {
  transferencia: Transferencia;
  onCerrar: () => void;
}

const ESTADO_BADGE: Record<EstadoTransferencia, { label: string; cls: string }> = {
  PENDIENTE:    { label: 'Pendiente',    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-700' },
  EN_TRANSITO:  { label: 'En tránsito',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-700' },
  CONFIRMADA:   { label: 'Confirmada',   cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-700' },
  RECIBIDA:     { label: 'Recibida',     cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-700' },
  CANCELADA:    { label: 'Cancelada',    cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600' },
  ANULADA:      { label: 'Anulada',      cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-700' },
};

const formatFecha = (d?: Date) =>
  d ? formatBusinessDateTimeForTicket(d) : '—';

const DetalleTransferencia: React.FC<DetalleTransferenciaProps> = ({ transferencia, onCerrar }) => {
  const badge = ESTADO_BADGE[transferencia.estado];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-[#6F36FF] to-[#8B5CF6] px-5 py-4 rounded-t-xl flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white font-mono">{transferencia.id}</h2>
            <p className="text-purple-200 text-xs mt-0.5">{formatFecha(transferencia.fecha)}</p>
          </div>
          <button onClick={onCerrar} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Estado */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Estado</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
              {badge.label}
            </span>
          </div>

          {/* Tipo */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Tipo</span>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {transferencia.tipoTransferencia === 'INTRA_ESTABLECIMIENTO'
                ? 'Mismo establecimiento'
                : 'Entre establecimientos'}
            </span>
          </div>

          <hr className="border-gray-100 dark:border-gray-700" />

          {/* Producto */}
          <div className="flex items-start space-x-3">
            <Package className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Producto</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{transferencia.productoNombre}</p>
              <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{transferencia.productoCodigo}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Cantidad</p>
              <p className="text-lg font-bold text-[#6F36FF] dark:text-[#8B5CF6]">{transferencia.cantidad}</p>
            </div>
          </div>

          <hr className="border-gray-100 dark:border-gray-700" />

          {/* Origen → Destino */}
          <div className="space-y-2">
            <div className="flex items-start space-x-2">
              <Building2 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">Origen</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{transferencia.almacenOrigenNombre}</p>
                {transferencia.establecimientoOrigenNombre && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{transferencia.establecimientoOrigenNombre}</p>
                )}
              </div>
            </div>
            <div className="flex justify-center">
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex items-start space-x-2">
              <Building2 className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">Destino</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{transferencia.almacenDestinoNombre}</p>
                {transferencia.establecimientoDestinoNombre && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{transferencia.establecimientoDestinoNombre}</p>
                )}
              </div>
            </div>
          </div>

          <hr className="border-gray-100 dark:border-gray-700" />

          {/* Fechas de ciclo */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Creada</p>
              <p className="text-gray-700 dark:text-gray-300">{formatFecha(transferencia.fecha)}</p>
            </div>
            {transferencia.fechaDespacho && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Despachada</p>
                <p className="text-gray-700 dark:text-gray-300">{formatFecha(transferencia.fechaDespacho)}</p>
              </div>
            )}
            {transferencia.fechaRecepcion && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Recibida</p>
                <p className="text-gray-700 dark:text-gray-300">{formatFecha(transferencia.fechaRecepcion)}</p>
              </div>
            )}
            {transferencia.fechaAnulacion && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Anulada</p>
                <p className="text-gray-700 dark:text-gray-300">{formatFecha(transferencia.fechaAnulacion)}</p>
              </div>
            )}
          </div>

          {/* Referencia / Observaciones */}
          {(transferencia.documentoReferencia || transferencia.observaciones) && (
            <>
              <hr className="border-gray-100 dark:border-gray-700" />
              <div className="space-y-2">
                {transferencia.documentoReferencia && (
                  <div className="flex items-start space-x-2">
                    <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Referencia</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{transferencia.documentoReferencia}</p>
                    </div>
                  </div>
                )}
                {transferencia.observaciones && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Observaciones</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{transferencia.observaciones}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Movimientos Kardex */}
          {(transferencia.movimientoSalidaId || transferencia.movimientoEntradaId) && (
            <>
              <hr className="border-gray-100 dark:border-gray-700" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Movimientos Kardex</p>
                <div className="space-y-1">
                  {transferencia.movimientoSalidaId && (
                    <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/10 rounded px-2 py-1">
                      <span className="text-xs text-red-700 dark:text-red-300 font-medium">Salida</span>
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate max-w-[60%]">{transferencia.movimientoSalidaId}</span>
                    </div>
                  )}
                  {transferencia.movimientoEntradaId && (
                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/10 rounded px-2 py-1">
                      <span className="text-xs text-green-700 dark:text-green-300 font-medium">Entrada</span>
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate max-w-[60%]">{transferencia.movimientoEntradaId}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Usuario */}
          <div className="flex items-center justify-between text-sm border-t border-gray-100 dark:border-gray-700 pt-3">
            <span className="text-gray-500 dark:text-gray-400">Usuario</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">{transferencia.usuario}</span>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 px-5 py-3 flex justify-end">
          <button
            onClick={onCerrar}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetalleTransferencia;
