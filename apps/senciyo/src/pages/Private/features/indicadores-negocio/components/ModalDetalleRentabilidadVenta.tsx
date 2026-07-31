// indicadores-negocio/components/ModalDetalleRentabilidadVenta.tsx
//
// Modal de detalle de una fila de Rentabilidad de Ventas (§18) — componente NUEVO propio del
// feature, que reutiliza el mismo PATRÓN visual ya aprobado en
// `gestion-inventario/components/modals/MovimientoDetalleModal.tsx` (overlay, cabecera con
// degradado, secciones con `Fila`, footer con "Cerrar"), pero nunca importa ni acopla ese
// componente directamente — Rentabilidad tiene su propia forma de fila y sus propias reglas.
// Nunca calcula nada monetario aquí: todo llega ya resuelto desde
// `consultaRentabilidadVentas.service.ts` (fila) o desde `resolverOrigenesCostoLinea` (orígenes de
// costo, bajo demanda). Nunca expone capaId/consumoId/movimientoId como dato mostrable.

import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { formatMoney } from '@/shared/currency';
import type { CurrencyCode } from '@/shared/currency/types';
import type { MovimientoStock } from '../../gestion-inventario/models/inventory.types';
import type { ConsumoCapaCostoInventario } from '../../gestion-inventario/models/consumoCapaCostoInventario.types';
import type { CapaCostoInventario, TipoDocumentoOrigenCapa } from '../../gestion-inventario/models/capaCostoInventario.types';
import {
  resolverOrigenesCostoLinea,
  type FilaRentabilidadVenta,
} from '../services/consultaRentabilidadVentas.service';
import { BadgeEstadoCosto } from './TablaRentabilidadVentas';

/** Mismo criterio de etiquetado ya aprobado para el Kardex — nunca un id técnico ni una forma paralela. */
const ETIQUETA_TIPO_DOCUMENTO_ORIGEN: Record<TipoDocumentoOrigenCapa, string> = {
  nota_ingreso: 'Nota de ingreso',
  ajuste: 'Ajuste de inventario',
  importacion: 'Importación de stock',
  devolucion_cliente: 'Devolución de cliente',
  transferencia: 'Transferencia entre almacenes',
  migracion: 'Migración inicial de inventario',
};

function formatearFechaLegible(fechaIso: string): string {
  const fecha = fechaIso.slice(0, 10);
  const [anio, mes, dia] = fecha.split('-');
  if (!anio || !mes || !dia) return fechaIso;
  return `${dia}/${mes}/${anio}`;
}

function formatearPorcentaje(valor: number | null): string {
  if (valor === null) return '—';
  return `${(valor * 100).toFixed(1)}%`;
}

function formatearMonto(valor: number | null | undefined, moneda: string): string {
  if (valor === null || valor === undefined) return '—';
  return formatMoney(valor, moneda as CurrencyCode);
}

const Fila: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
      <span className="text-xs text-gray-400 dark:text-gray-500 w-40 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-gray-800 dark:text-gray-200 font-medium flex-1 break-words">{value}</span>
    </div>
  );
};

interface ModalDetalleRentabilidadVentaProps {
  fila: FilaRentabilidadVenta;
  /** Filas de tipo NC ya proyectadas cuyo `documentoOrigenRelacionado` apunta a esta venta — solo se calculan cuando `fila.tipoOperacion === 'venta'`, resueltas por la página con un simple filtro (nunca un nuevo cálculo monetario). */
  ajustesRelacionados: FilaRentabilidadVenta[];
  monedaBase: string;
  movimientos: readonly MovimientoStock[];
  consumos: readonly ConsumoCapaCostoInventario[];
  capas: readonly CapaCostoInventario[];
  onCerrar: () => void;
  onVerComprobante: () => void;
}

const ModalDetalleRentabilidadVenta: React.FC<ModalDetalleRentabilidadVentaProps> = ({
  fila,
  ajustesRelacionados,
  monedaBase,
  movimientos,
  consumos,
  capas,
  onCerrar,
  onVerComprobante,
}) => {
  const esAjusteNC = fila.tipoOperacion !== 'venta';

  // Origen del costo — resuelto bajo demanda, una sola vez por apertura del modal (nunca por fila
  // de la proyección masiva, §20). Solo tiene sentido cuando la propia fila tiene costo asociado.
  const origenesCosto = useMemo(() => {
    if (fila.estadoCosto !== 'con_costo') return [];
    return resolverOrigenesCostoLinea(fila.documentoId, fila.productoId, fila.lineaComercialId, movimientos, consumos, capas);
  }, [fila.estadoCosto, fila.documentoId, fila.productoId, fila.lineaComercialId, movimientos, consumos, capas]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: 'calc(100vh - 4rem)' }}>

        {/* Header */}
        <div className="bg-gradient-to-r from-[#6F36FF] to-[#8B5CF6] px-4 py-3 rounded-t-xl flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Detalle de rentabilidad</h2>
            <p className="text-purple-200 text-xs mt-0.5 font-mono">{fila.numeroDocumento}</p>
          </div>
          <button onClick={onCerrar} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" aria-label="Cerrar">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Documento */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Documento</p>
            <Fila label="Documento" value={fila.numeroDocumento} />
            <Fila label="Tipo" value={fila.tipoDocumento} />
            <Fila label="Fecha" value={formatearFechaLegible(fila.fecha)} />
            <Fila label="Estado del comprobante" value={fila.estadoDocumento} />
            <Fila label="Canal" value={fila.canal} />
            {esAjusteNC && (
              <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-300">
                {fila.tipoOperacion === 'nota_credito_fisica' ? 'Ajuste — Nota de crédito con devolución física' : 'Ajuste — Nota de crédito financiera'}
              </p>
            )}
          </section>

          {/* Producto */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Producto</p>
            <Fila label="Nombre" value={fila.productoNombre} />
            <Fila label="Código" value={fila.productoCodigo ? <span className="font-mono">{fila.productoCodigo}</span> : undefined} />
            <Fila label="Cantidad" value={fila.cantidad.toLocaleString()} />
          </section>

          {/* Participantes */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Participantes</p>
            <Fila label="Cliente" value={fila.cliente} />
            <Fila label="Vendedor" value={fila.vendedor} />
            <Fila label="Establecimiento" value={fila.establecimiento} />
          </section>

          {/* Rentabilidad */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Rentabilidad</p>
            <Fila label="Moneda" value={fila.monedaOriginal} />
            <Fila label="Venta neta" value={formatearMonto(fila.ventaNetaBase, monedaBase)} />
            <Fila
              label="Costo de venta"
              value={fila.estadoCosto === 'con_costo' || fila.estadoCosto === 'no_aplica_inventario' || (esAjusteNC && fila.costoVentaBase !== null)
                ? formatearMonto(fila.costoVentaBase, monedaBase)
                : <span className="text-gray-400 dark:text-gray-500">Sin costo registrado</span>}
            />
            <Fila label="Utilidad bruta" value={formatearMonto(fila.utilidadBrutaBase, monedaBase)} />
            <Fila label="Margen bruto" value={formatearPorcentaje(fila.margenBruto)} />
            <div className="flex items-start gap-3 py-1.5">
              <span className="text-xs text-gray-400 dark:text-gray-500 w-40 flex-shrink-0 pt-0.5">Estado del costo</span>
              <span className="flex-1"><BadgeEstadoCosto estado={fila.estadoCosto} /></span>
            </div>
          </section>

          {/* Origen del costo — solo cuando la línea tiene costo resuelto; nunca capaId/consumoId. */}
          {origenesCosto.length > 0 && (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Origen del costo</p>
              <div className="space-y-2">
                {origenesCosto.map((origen, indice) => (
                  <div key={`${origen.documentoOrigenId}-${indice}`} className="rounded-lg bg-gray-50 dark:bg-gray-700/40 px-2.5 py-2">
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                      {ETIQUETA_TIPO_DOCUMENTO_ORIGEN[origen.tipoDocumentoOrigen] ?? 'Origen del costo'}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{formatearFechaLegible(origen.fecha)}</p>
                    <div className="mt-1 grid grid-cols-3 gap-1 text-[10px] text-gray-600 dark:text-gray-300">
                      <span>Cant.: <span className="font-medium tabular-nums">{origen.cantidad}</span></span>
                      <span>Costo u.: <span className="font-medium tabular-nums">{formatMoney(origen.costoUnitario, monedaBase as CurrencyCode)}</span></span>
                      <span>Valor: <span className="font-medium tabular-nums">{formatMoney(origen.valor, monedaBase as CurrencyCode)}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Ajustes por devolución — la propia fila SI es una NC, o las NC relacionadas cuando la fila es la venta original. */}
          {(esAjusteNC || ajustesRelacionados.length > 0) && (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Ajustes por devolución</p>
              <div className="space-y-2">
                {esAjusteNC && (
                  <div className="rounded-lg bg-rose-50 dark:bg-rose-900/20 px-2.5 py-2">
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{fila.numeroDocumento}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{formatearFechaLegible(fila.fecha)}</p>
                    <div className="mt-1 grid grid-cols-2 gap-1 text-[10px] text-gray-600 dark:text-gray-300">
                      <span>Cant. devuelta: <span className="font-medium tabular-nums">{fila.cantidadDevuelta.toLocaleString()}</span></span>
                      <span>Venta ajustada: <span className="font-medium tabular-nums">{formatearMonto(fila.ventaNetaBase, monedaBase)}</span></span>
                      {fila.costoRecuperadoBase > 0 && (
                        <span className="col-span-2">Costo recuperado: <span className="font-medium tabular-nums">{formatearMonto(fila.costoRecuperadoBase, monedaBase)}</span></span>
                      )}
                    </div>
                  </div>
                )}
                {ajustesRelacionados.map((ajuste) => (
                  <div key={ajuste.id} className="rounded-lg bg-rose-50 dark:bg-rose-900/20 px-2.5 py-2">
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{ajuste.numeroDocumento}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{formatearFechaLegible(ajuste.fecha)}</p>
                    <div className="mt-1 grid grid-cols-2 gap-1 text-[10px] text-gray-600 dark:text-gray-300">
                      <span>Cant. devuelta: <span className="font-medium tabular-nums">{ajuste.cantidadDevuelta.toLocaleString()}</span></span>
                      <span>Venta ajustada: <span className="font-medium tabular-nums">{formatearMonto(ajuste.ventaNetaBase, monedaBase)}</span></span>
                      {ajuste.costoRecuperadoBase > 0 && (
                        <span className="col-span-2">Costo recuperado: <span className="font-medium tabular-nums">{formatearMonto(ajuste.costoRecuperadoBase, monedaBase)}</span></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex justify-between">
          <button
            type="button"
            onClick={onVerComprobante}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Ver comprobante
          </button>
          <button
            type="button"
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

export default ModalDetalleRentabilidadVenta;
