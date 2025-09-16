import React, { useState } from 'react';
import { CalendarDays, Download } from 'lucide-react';

interface ReporteMovimiento {
  id: string;
  fecha: Date;
  tipo: 'Ingreso' | 'Egreso' | 'Transferencia' | 'Cierre';
  concepto: string;
  monto: number;
  usuario: string;
}

const mockReportes: ReporteMovimiento[] = [
  {
    id: 'r1',
    fecha: new Date('2025-09-01T09:00:00'),
    tipo: 'Ingreso',
    concepto: 'Apertura de caja',
    monto: 500.00,
    usuario: 'Carlos Rueda'
  },
  {
    id: 'r2',
    fecha: new Date('2025-09-01T12:30:00'),
    tipo: 'Ingreso',
    concepto: 'Venta - Boleta B001-00000052',
    monto: 120.00,
    usuario: 'Carlos Rueda'
  },
  {
    id: 'r3',
    fecha: new Date('2025-09-01T18:00:00'),
    tipo: 'Cierre',
    concepto: 'Cierre de caja',
    monto: 709.50,
    usuario: 'Carlos Rueda'
  }
];

const ReportesCaja: React.FC = () => {
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [usuarioFiltro, setUsuarioFiltro] = useState('');

  const reportesFiltrados = mockReportes.filter(r => {
    const desdeOk = !fechaDesde || r.fecha >= new Date(fechaDesde);
    const hastaOk = !fechaHasta || r.fecha <= new Date(fechaHasta);
    const usuarioOk = !usuarioFiltro || r.usuario === usuarioFiltro;
    return desdeOk && hastaOk && usuarioOk;
  });

  const exportarCSV = () => {
    // Simulación de exportación CSV
    alert('Reporte exportado como CSV');
  };

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-lg shadow p-8 mt-8">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <CalendarDays className="w-6 h-6 text-gray-600" /> Reportes de Caja
      </h2>
      {/* Filtros */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6 grid grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Fecha Desde</label>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Fecha Hasta</label>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Usuario</label>
          <input type="text" value={usuarioFiltro} onChange={e => setUsuarioFiltro(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Filtrar por usuario" />
        </div>
        <div>
          <button type="button" onClick={exportarCSV} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2">
            <Download className="w-5 h-5" /> Exportar CSV
          </button>
        </div>
      </div>
      {/* Tabla de reportes */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Fecha/Hora</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Tipo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Concepto</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Monto</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Usuario</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {reportesFiltrados.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">{r.fecha.toLocaleString('es-PE')}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    r.tipo === 'Ingreso' ? 'bg-green-100 text-green-800' :
                    r.tipo === 'Egreso' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {r.tipo}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{r.concepto}</td>
                <td className="px-4 py-3 text-sm text-right font-medium">
                  <span className={r.tipo === 'Ingreso' ? 'text-green-600' : 'text-red-600'}>
                    {r.tipo === 'Egreso' ? '-' : ''}S/ {r.monto.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{r.usuario}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportesCaja;
