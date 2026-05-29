// src/features/inventario/components/modals/MovimientoDetalleModal.tsx

import React from 'react';
import { X } from 'lucide-react';
import type { MovimientoStock } from '../../models';
import { formatBusinessDateTimeForTicket } from '@/shared/time/businessTime';
import { inferirFuente } from '../../utils/inventory.helpers';

interface MovimientoDetalleModalProps {
  movimiento: MovimientoStock;
  onCerrar: () => void;
}

const TIPO_LABEL: Record<MovimientoStock['tipo'], string> = {
  ENTRADA: 'Entrada',
  SALIDA: 'Salida',
  AJUSTE_POSITIVO: 'Ajuste +',
  AJUSTE_NEGATIVO: 'Ajuste -',
  DEVOLUCION: 'Devolución',
  MERMA: 'Merma',
  TRANSFERENCIA: 'Transferencia',
};

const MOTIVO_LABEL: Record<MovimientoStock['motivo'], string> = {
  COMPRA: 'Compra',
  VENTA: 'Venta',
  AJUSTE_INVENTARIO: 'Ajuste inventario',
  DEVOLUCION_CLIENTE: 'Devolución cliente',
  DEVOLUCION_PROVEEDOR: 'Devolución proveedor',
  PRODUCTO_DAÑADO: 'Producto dañado',
  PRODUCTO_VENCIDO: 'Producto vencido',
  ROBO_PERDIDA: 'Robo / Pérdida',
  TRANSFERENCIA_ALMACEN: 'Transferencia almacén',
  PRODUCCION: 'Producción',
  MERMA: 'Merma',
  OTRO: 'Otro',
};

const Fila: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
      <span className="text-xs text-gray-400 dark:text-gray-500 w-36 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-gray-800 dark:text-gray-200 font-medium flex-1 break-words">{value}</span>
    </div>
  );
};

const MovimientoDetalleModal: React.FC<MovimientoDetalleModalProps> = ({ movimiento, onCerrar }) => {
  const esEntrada = movimiento.tipo === 'ENTRADA' || movimiento.tipo === 'AJUSTE_POSITIVO' || movimiento.tipo === 'DEVOLUCION';
  const fuente = inferirFuente(movimiento);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col" style={{ maxHeight: 'calc(100vh - 4rem)' }}>

        {/* Header */}
        <div className="bg-gradient-to-r from-[#6F36FF] to-[#8B5CF6] px-4 py-3 rounded-t-xl flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Detalle del movimiento</h2>
            <p className="text-purple-200 text-xs mt-0.5 font-mono">{movimiento.id}</p>
          </div>
          <button onClick={onCerrar} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Producto */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Producto</p>
            <Fila label="Nombre" value={movimiento.productoNombre} />
            <Fila label="Código" value={<span className="font-mono">{movimiento.productoCodigo}</span>} />
          </section>

          {/* Movimiento */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Movimiento</p>
            <Fila label="Fecha" value={formatBusinessDateTimeForTicket(movimiento.fecha)} />
            <Fila label="Tipo" value={TIPO_LABEL[movimiento.tipo] ?? movimiento.tipo} />
            <Fila label="Motivo" value={MOTIVO_LABEL[movimiento.motivo] ?? movimiento.motivo} />
            <Fila label="Fuente" value={fuente} />
            <Fila
              label="Cantidad"
              value={
                <span className={esEntrada ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  {esEntrada ? '+' : '-'}{movimiento.cantidad}
                </span>
              }
            />
            <Fila
              label="Stock"
              value={
                <span className="tabular-nums">
                  {movimiento.cantidadAnterior}
                  <span className="mx-1.5 text-gray-400">→</span>
                  <span className="text-[#3B82F6]">{movimiento.cantidadNueva}</span>
                </span>
              }
            />
          </section>

          {/* Almacén */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Almacén</p>
            <Fila label="Código" value={movimiento.almacenCodigo || '—'} />
            <Fila label="Nombre" value={movimiento.almacenNombre || '—'} />
            <Fila label="Establecimiento" value={movimiento.EstablecimientoNombre || undefined} />
          </section>

          {/* Referencia */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Referencia</p>
            <Fila label="Documento / Ref." value={movimiento.documentoReferencia || '—'} />
            <Fila label="Usuario" value={movimiento.usuario} />
            <Fila label="Observaciones" value={movimiento.observaciones || undefined} />
            {movimiento.ubicacion && <Fila label="Ubicación" value={movimiento.ubicacion} />}
          </section>

          {/* Transferencia */}
          {movimiento.esTransferencia && (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Transferencia</p>
              <Fila label="Código TRF" value={<span className="font-mono">{movimiento.transferenciaId}</span>} />
              <Fila
                label="Tipo"
                value={
                  movimiento.tipoTransferencia === 'INTRA_ESTABLECIMIENTO'
                    ? 'Mismo establecimiento'
                    : movimiento.tipoTransferencia === 'INTER_ESTABLECIMIENTO'
                    ? 'Entre establecimientos'
                    : movimiento.tipoTransferencia
                }
              />
              <Fila label="Almacén origen" value={movimiento.almacenOrigenNombre || undefined} />
              <Fila label="Almacén destino" value={movimiento.almacenDestinoNombre || undefined} />
              <Fila
                label="Mov. relacionado"
                value={movimiento.movimientoRelacionadoId
                  ? <span className="font-mono text-[10px]">{movimiento.movimientoRelacionadoId}</span>
                  : undefined}
              />
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex justify-end">
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

export default MovimientoDetalleModal;
