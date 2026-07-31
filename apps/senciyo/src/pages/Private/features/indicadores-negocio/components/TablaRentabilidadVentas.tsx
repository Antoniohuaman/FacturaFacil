// indicadores-negocio/components/TablaRentabilidadVentas.tsx
//
// Tabla presentacional de Rentabilidad de Ventas — nunca calcula nada monetario aquí (todo ya
// viene resuelto por `consultaRentabilidadVentas.service.ts`); solo decide QUÉ columna mostrar y
// CÓMO formatearla para lectura. Mismo patrón que `gestion-inventario/.../MovementsTable.tsx`:
// las preferencias de columnas viven en la página (`RentabilidadVentasPage.tsx`), esta tabla solo
// recibe la lista ya resuelta de columnas visibles y un `renderCeldaColumna` por id.

import React from 'react';
import { formatMoney } from '@/shared/currency';
import {
  ETIQUETA_COLUMNA_RENTABILIDAD,
  etiquetaColumnaAgrupacion,
  type AgrupacionRentabilidad,
  type ColumnaRentabilidadId,
  type EstadoCostoRentabilidad,
  type FilaRentabilidadVenta,
  type GrupoRentabilidadVenta,
} from '../services/consultaRentabilidadVentas.service';

// La configuración de columnas (`ColumnaRentabilidadId`, `ETIQUETA_COLUMNA_RENTABILIDAD`,
// `obtenerColumnasConfigurables`, `etiquetaColumnaAgrupacion`, etc.) vive en
// `consultaRentabilidadVentas.service.ts` — un componente `.tsx` solo puede exportar componentes
// (`react-refresh/only-export-components`), así que la página la importa directamente desde el
// servicio en vez de desde esta tabla.

function formatearPorcentaje(valor: number | null): string {
  if (valor === null) return '—';
  return `${(valor * 100).toFixed(1)}%`;
}

function formatearFecha(fechaIso: string): string {
  const fecha = fechaIso.slice(0, 10);
  const [anio, mes, dia] = fecha.split('-');
  if (!anio || !mes || !dia) return fechaIso;
  return `${dia}/${mes}/${anio}`;
}

const ETIQUETA_ESTADO_COSTO: Record<EstadoCostoRentabilidad, string> = {
  con_costo: 'Con costo',
  sin_costo_registrado: 'Sin costo registrado',
  no_aplica_inventario: 'No aplica al inventario',
  tipo_cambio_no_disponible: 'Tipo de cambio no disponible',
};

const CLASE_BADGE_ESTADO_COSTO: Record<EstadoCostoRentabilidad, string> = {
  con_costo: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  sin_costo_registrado: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  no_aplica_inventario: 'bg-slate-100 text-slate-500 dark:bg-gray-700 dark:text-gray-400',
  tipo_cambio_no_disponible: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

export function BadgeEstadoCosto({ estado }: { estado: EstadoCostoRentabilidad }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CLASE_BADGE_ESTADO_COSTO[estado]}`}
      title={estado === 'sin_costo_registrado' ? 'Esta venta no cuenta con un costo histórico registrado.' : undefined}
    >
      {ETIQUETA_ESTADO_COSTO[estado]}
    </span>
  );
}

function renderMonto(valor: number | null | undefined, monedaBase: string): React.ReactNode {
  if (valor === null || valor === undefined) {
    return <span className="text-gray-400 dark:text-gray-500">Sin costo registrado</span>;
  }
  return formatMoney(valor, monedaBase as Parameters<typeof formatMoney>[1]);
}

function renderCeldaFilaSinAgrupar(fila: FilaRentabilidadVenta, id: ColumnaRentabilidadId, monedaBase: string): React.ReactNode {
  switch (id) {
    case 'fecha': return formatearFecha(fila.fecha);
    case 'cantidad': return fila.cantidad.toLocaleString();
    case 'ventaNeta': return fila.ventaNetaBase === null ? '—' : formatMoney(fila.ventaNetaBase, monedaBase as Parameters<typeof formatMoney>[1]);
    case 'costoVenta': return renderMonto(fila.costoVentaBase, monedaBase);
    case 'utilidadBruta': return renderMonto(fila.utilidadBrutaBase, monedaBase);
    case 'margenBruto': return formatearPorcentaje(fila.margenBruto);
    case 'cliente': return fila.cliente ?? '—';
    case 'vendedor': return fila.vendedor ?? '—';
    case 'establecimiento': return fila.establecimiento ?? '—';
    case 'almacen': return fila.almacen ?? '—';
    case 'monedaOriginal': return fila.monedaOriginal;
    case 'tipoCambio': return fila.tipoCambioHistorico ? fila.tipoCambioHistorico.toFixed(4) : '—';
    case 'ventaNetaOriginal': return formatMoney(fila.ventaNetaOriginal, fila.monedaOriginal as Parameters<typeof formatMoney>[1]);
    case 'precioUnitarioHistorico': return formatMoney(fila.precioUnitarioHistorico, fila.monedaOriginal as Parameters<typeof formatMoney>[1]);
    case 'importeBruto': return formatMoney(fila.importeBruto, fila.monedaOriginal as Parameters<typeof formatMoney>[1]);
    case 'descuentoLinea': return formatMoney(fila.descuentoLinea, fila.monedaOriginal as Parameters<typeof formatMoney>[1]);
    case 'descuentoGlobalAsignado': return formatMoney(fila.descuentoGlobalAsignado, fila.monedaOriginal as Parameters<typeof formatMoney>[1]);
    case 'impuesto': return formatMoney(fila.impuesto, fila.monedaOriginal as Parameters<typeof formatMoney>[1]);
    case 'totalVendido': return formatMoney(fila.totalVendido, fila.monedaOriginal as Parameters<typeof formatMoney>[1]);
    case 'estadoComprobante': return fila.estadoDocumento;
    case 'estadoCosto': return <BadgeEstadoCosto estado={fila.estadoCosto} />;
    case 'tipoDocumento': return fila.tipoDocumento;
    case 'canal': return fila.canal ?? '—';
    case 'notaCreditoRelacionada': return fila.documentoOrigenRelacionado ?? '—';
    case 'cantidadDevuelta': return fila.cantidadDevuelta > 0 ? fila.cantidadDevuelta.toLocaleString() : '—';
    case 'costoRecuperado': return fila.costoRecuperadoBase > 0 ? formatMoney(fila.costoRecuperadoBase, monedaBase as Parameters<typeof formatMoney>[1]) : '—';
    default: return '—';
  }
}

function renderCeldaGrupo(grupo: GrupoRentabilidadVenta, id: ColumnaRentabilidadId, monedaBase: string): React.ReactNode {
  switch (id) {
    case 'cantidad': return grupo.cantidadNeta.toLocaleString();
    case 'ventaNeta': return formatMoney(grupo.ventaNetaBase, monedaBase as Parameters<typeof formatMoney>[1]);
    case 'costoVenta': return renderMonto(grupo.costoVentaBase, monedaBase);
    case 'utilidadBruta': return renderMonto(grupo.utilidadBrutaBase, monedaBase);
    case 'margenBruto': return formatearPorcentaje(grupo.margenBruto);
    default: return '—';
  }
}

interface TablaRentabilidadVentasProps {
  modo: AgrupacionRentabilidad;
  columnasVisibles: ColumnaRentabilidadId[];
  filas: FilaRentabilidadVenta[];
  grupos: GrupoRentabilidadVenta[];
  monedaBase: string;
  onVerFila?: (fila: FilaRentabilidadVenta) => void;
}

const TablaRentabilidadVentas: React.FC<TablaRentabilidadVentasProps> = ({
  modo, columnasVisibles, filas, grupos, monedaBase, onVerFila,
}) => {
  const esSinAgrupar = modo === 'sin_agrupar';
  const etiquetaFija = etiquetaColumnaAgrupacion(modo);
  const filasVacias = esSinAgrupar ? filas.length === 0 : grupos.length === 0;
  const colSpan = 1 + columnasVisibles.length + (esSinAgrupar ? 2 : 0);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900/40">
          <tr>
            {esSinAgrupar && (
              <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Producto</th>
            )}
            <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">{etiquetaFija}</th>
            {columnasVisibles.map((id) => (
              <th key={id} className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">
                {ETIQUETA_COLUMNA_RENTABILIDAD[id]}
              </th>
            ))}
            {esSinAgrupar && <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Ver</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {filasVacias && (
            <tr>
              <td colSpan={colSpan} className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No hay resultados para los filtros seleccionados.
              </td>
            </tr>
          )}
          {esSinAgrupar && filas.map((fila) => (
            <tr key={fila.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
              <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                <div className="font-medium">{fila.productoNombre}</div>
                {fila.tipoOperacion !== 'venta' && (
                  <span className="text-xs text-rose-600 dark:text-rose-300">
                    {fila.tipoOperacion === 'nota_credito_fisica' ? 'Ajuste — NC con devolución física' : 'Ajuste — NC financiera'}
                  </span>
                )}
              </td>
              <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-200">{fila.numeroDocumento}</td>
              {columnasVisibles.map((id) => (
                <td key={id} className="px-3 py-2 text-gray-700 dark:text-gray-200">
                  {renderCeldaFilaSinAgrupar(fila, id, monedaBase)}
                </td>
              ))}
              <td className="px-3 py-2">
                <button
                  type="button"
                  onClick={() => onVerFila?.(fila)}
                  className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                >
                  Ver detalle
                </button>
              </td>
            </tr>
          ))}
          {!esSinAgrupar && grupos.map((grupo) => (
            <tr key={grupo.clave} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
              <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{grupo.etiqueta}</td>
              {columnasVisibles.map((id) => (
                <td key={id} className="px-3 py-2 text-gray-700 dark:text-gray-200">
                  {renderCeldaGrupo(grupo, id, monedaBase)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TablaRentabilidadVentas;
