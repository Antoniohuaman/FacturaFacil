import React, { useState } from 'react';
import { useCaja } from '../context/CajaContext';
import { TrendingUp, TrendingDown, Calculator, Eye, Filter, X, Receipt } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import type { TipoMovimiento, MedioPago } from '../models';

const MovimientosCaja: React.FC = () => {
  const { movimientos, status } = useCaja();
  const [tipoFiltro, setTipoFiltro] = useState<TipoMovimiento | ''>('');
  const [medioFiltro, setMedioFiltro] = useState<MedioPago | ''>('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Filtros básicos
  const movimientosFiltrados = movimientos.filter(mov => {
    const tipoOk = !tipoFiltro || mov.tipo === tipoFiltro;
    const medioOk = !medioFiltro || mov.medioPago === medioFiltro;
    const desdeOk = !fechaDesde || mov.fecha >= new Date(fechaDesde);
    const hastaOk = !fechaHasta || mov.fecha <= new Date(fechaHasta);
    return tipoOk && medioOk && desdeOk && hastaOk;
  });

  // Resúmenes
  const totalIngresos = movimientosFiltrados.filter(m => m.tipo === 'Ingreso').reduce((sum, m) => sum + m.monto, 0);
  const totalEgresos = movimientosFiltrados.filter(m => m.tipo === 'Egreso').reduce((sum, m) => sum + m.monto, 0);
  const saldoNeto = totalIngresos - totalEgresos;

  const limpiarFiltros = () => {
    setTipoFiltro('');
    setMedioFiltro('');
    setFechaDesde('');
    setFechaHasta('');
  };

  const tienesFiltrosActivos = tipoFiltro || medioFiltro || fechaDesde || fechaHasta;

  if (status === 'cerrada') {
    return (
      <EmptyState
        icon={Receipt}
        title="No hay caja abierta"
        description="Debe abrir una caja para poder registrar y visualizar movimientos."
      />
    );
  }

  if (movimientos.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Sin movimientos registrados"
        description="Aún no se han registrado movimientos en esta caja. Los ingresos y egresos aparecerán aquí."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 sm:p-6 rounded-lg border border-green-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-green-700 font-medium">Total Ingresos</p>
              <p className="text-xl sm:text-2xl font-bold text-green-900 mt-1">S/ {totalIngresos.toFixed(2)}</p>
            </div>
            <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 sm:p-6 rounded-lg border border-red-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-red-700 font-medium">Total Egresos</p>
              <p className="text-xl sm:text-2xl font-bold text-red-900 mt-1">S/ {totalEgresos.toFixed(2)}</p>
            </div>
            <TrendingDown className="w-8 h-8 sm:w-10 sm:h-10 text-red-600" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-6 rounded-lg border border-blue-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-blue-700 font-medium">Saldo Neto</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-900 mt-1">S/ {saldoNeto.toFixed(2)}</p>
            </div>
            <Calculator className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">Filtros</h3>
          </div>
          {tienesFiltrosActivos && (
            <button
              onClick={limpiarFiltros}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Limpiar
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fecha Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fecha Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={tipoFiltro}
              onChange={e => setTipoFiltro(e.target.value as TipoMovimiento | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="Ingreso">Ingreso</option>
              <option value="Egreso">Egreso</option>
              <option value="Transferencia">Transferencia</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Medio de Pago</label>
            <select
              value={medioFiltro}
              onChange={e => setMedioFiltro(e.target.value as MedioPago | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Yape">Yape</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Plin">Plin</option>
              <option value="Deposito">Deposito</option>
            </select>
          </div>
        </div>
      </div>

      {/* Desktop: Tabla */}
      <div className="hidden lg:block bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Fecha/Hora</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Concepto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Medio</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">Monto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Referencia</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {movimientosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    No se encontraron movimientos con los filtros aplicados
                  </td>
                </tr>
              ) : (
                movimientosFiltrados.map((movimiento) => (
                  <tr
                    key={movimiento.id}
                    data-focus={`caja:mov:${movimiento.id}`}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {new Date(movimiento.fecha).toLocaleString('es-PE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        movimiento.tipo === 'Ingreso' ? 'bg-green-100 text-green-800' :
                        movimiento.tipo === 'Egreso' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {movimiento.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{movimiento.concepto}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {movimiento.medioPago}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold whitespace-nowrap">
                      <span className={movimiento.tipo === 'Ingreso' ? 'text-green-600' : 'text-red-600'}>
                        {movimiento.tipo === 'Egreso' ? '-' : '+'}S/ {movimiento.monto.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{movimiento.referencia || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <button className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile/Tablet: Cards */}
      <div className="lg:hidden space-y-3">
        {movimientosFiltrados.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center border border-gray-200">
            <p className="text-sm text-gray-500">No se encontraron movimientos con los filtros aplicados</p>
          </div>
        ) : (
          movimientosFiltrados.map((movimiento) => (
            <div
              key={movimiento.id}
              data-focus={`caja:mov:${movimiento.id}`}
              className="bg-white rounded-lg shadow-md p-4 border border-gray-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      movimiento.tipo === 'Ingreso' ? 'bg-green-100 text-green-800' :
                      movimiento.tipo === 'Egreso' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {movimiento.tipo}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {movimiento.medioPago}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">{movimiento.concepto}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(movimiento.fecha).toLocaleString('es-PE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${movimiento.tipo === 'Ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                    {movimiento.tipo === 'Egreso' ? '-' : '+'}S/ {movimiento.monto.toFixed(2)}
                  </p>
                </div>
              </div>
              {movimiento.referencia && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500">Ref: {movimiento.referencia}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MovimientosCaja;
