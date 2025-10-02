import React, { useState } from 'react';
import { useCaja } from '../context/CajaContext';
import { FileBarChart, Download, Filter, X, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';

const ReportesCaja: React.FC = () => {
  const { movimientos, aperturaActual, showToast, getResumen } = useCaja();
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [usuarioFiltro, setUsuarioFiltro] = useState('');

  const reportesFiltrados = movimientos.filter(m => {
    const desdeOk = !fechaDesde || m.fecha >= new Date(fechaDesde);
    const hastaOk = !fechaHasta || m.fecha <= new Date(fechaHasta);
    const usuarioOk = !usuarioFiltro || (m.usuarioNombre && m.usuarioNombre.toLowerCase().includes(usuarioFiltro.toLowerCase()));
    return desdeOk && hastaOk && usuarioOk;
  });

  const limpiarFiltros = () => {
    setFechaDesde('');
    setFechaHasta('');
    setUsuarioFiltro('');
  };

  const tienesFiltrosActivos = fechaDesde || fechaHasta || usuarioFiltro;

  // Estadísticas del reporte
  const totalIngresos = reportesFiltrados.filter(m => m.tipo === 'Ingreso').reduce((sum, m) => sum + m.monto, 0);
  const totalEgresos = reportesFiltrados.filter(m => m.tipo === 'Egreso').reduce((sum, m) => sum + m.monto, 0);
  const balance = totalIngresos - totalEgresos;

  const exportarCSV = () => {
    if (reportesFiltrados.length === 0) {
      showToast('warning', 'Sin datos', 'No hay datos para exportar.');
      return;
    }

    try {
      // Generar CSV
      const headers = ['Fecha', 'Hora', 'Tipo', 'Concepto', 'Medio de Pago', 'Monto', 'Referencia', 'Usuario'];
      const csvRows = [headers.join(',')];

      reportesFiltrados.forEach(m => {
        const fecha = new Date(m.fecha);
        const row = [
          fecha.toLocaleDateString('es-PE'),
          fecha.toLocaleTimeString('es-PE'),
          m.tipo,
          `"${m.concepto}"`,
          m.medioPago,
          m.monto.toFixed(2),
          m.referencia || '',
          m.usuarioNombre || ''
        ];
        csvRows.push(row.join(','));
      });

      // Agregar totales
      csvRows.push('');
      csvRows.push(`Total Ingresos,,,,,${totalIngresos.toFixed(2)}`);
      csvRows.push(`Total Egresos,,,,,${totalEgresos.toFixed(2)}`);
      csvRows.push(`Balance,,,,,${balance.toFixed(2)}`);

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `reporte_caja_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('success', 'Exportado', 'Reporte exportado exitosamente como CSV.');
    } catch (error) {
      showToast('error', 'Error', 'No se pudo exportar el reporte.');
    }
  };

  if (movimientos.length === 0) {
    return (
      <EmptyState
        icon={FileBarChart}
        title="Sin datos para reportes"
        description="Aún no hay movimientos registrados para generar reportes. Los reportes estarán disponibles una vez que se registren operaciones."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas del reporte */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 sm:p-6 rounded-lg border border-green-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Total Ingresos</p>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-900">S/ {totalIngresos.toFixed(2)}</p>
          <p className="text-xs text-green-600 mt-1">
            {reportesFiltrados.filter(m => m.tipo === 'Ingreso').length} movimientos
          </p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 sm:p-6 rounded-lg border border-red-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Total Egresos</p>
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-900">S/ {totalEgresos.toFixed(2)}</p>
          <p className="text-xs text-red-600 mt-1">
            {reportesFiltrados.filter(m => m.tipo === 'Egreso').length} movimientos
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-6 rounded-lg border-2 border-blue-300 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Balance Neto</p>
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900">S/ {balance.toFixed(2)}</p>
          <p className="text-xs text-blue-600 mt-1">{reportesFiltrados.length} movimientos totales</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">Filtros de Reporte</h3>
          </div>
          <div className="flex items-center gap-2">
            {tienesFiltrosActivos && (
              <button
                onClick={limpiarFiltros}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Limpiar
              </button>
            )}
            <button
              onClick={exportarCSV}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium flex items-center gap-2 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <label className="block text-xs font-medium text-gray-700 mb-1">Usuario</label>
            <input
              type="text"
              value={usuarioFiltro}
              onChange={e => setUsuarioFiltro(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Buscar por usuario..."
            />
          </div>
        </div>
      </div>

      {/* Tabla de reportes - Desktop */}
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Usuario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reportesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                    No se encontraron movimientos con los filtros aplicados
                  </td>
                </tr>
              ) : (
                reportesFiltrados.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {new Date(m.fecha).toLocaleString('es-PE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        m.tipo === 'Ingreso' ? 'bg-green-100 text-green-800' :
                        m.tipo === 'Egreso' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {m.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{m.concepto}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {m.medioPago}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold whitespace-nowrap">
                      <span className={m.tipo === 'Ingreso' ? 'text-green-600' : 'text-red-600'}>
                        {m.tipo === 'Egreso' ? '-' : '+'}S/ {m.monto.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{m.usuarioNombre || 'N/A'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards - Mobile/Tablet */}
      <div className="lg:hidden space-y-3">
        {reportesFiltrados.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center border border-gray-200">
            <p className="text-sm text-gray-500">No se encontraron movimientos con los filtros aplicados</p>
          </div>
        ) : (
          reportesFiltrados.map((m) => (
            <div key={m.id} className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      m.tipo === 'Ingreso' ? 'bg-green-100 text-green-800' :
                      m.tipo === 'Egreso' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {m.tipo}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {m.medioPago}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">{m.concepto}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(m.fecha).toLocaleString('es-PE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${m.tipo === 'Ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                    {m.tipo === 'Egreso' ? '-' : '+'}S/ {m.monto.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReportesCaja;
