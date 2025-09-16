import React, { useState } from 'react';
import { TrendingUp, Calculator, Eye } from 'lucide-react';

// Tipos
interface Movimiento {
  id: string;
  tipo: 'Ingreso' | 'Egreso' | 'Transferencia';
  concepto: string;
  medioPago: 'Efectivo' | 'Tarjeta' | 'Yape' | 'Transferencia';
  monto: number;
  referencia?: string;
  fecha: Date;
  usuario: string;
}

const mockMovimientos: Movimiento[] = [
  {
    id: 'mov1',
    tipo: 'Ingreso',
    concepto: 'Venta - Boleta B001-00000052',
    medioPago: 'Efectivo',
    monto: 120.00,
    referencia: 'B001-00000052',
    fecha: new Date('2025-09-16T10:30:00'),
    usuario: 'Carlos Rueda'
  },
  {
    id: 'mov2',
    tipo: 'Ingreso',
    concepto: 'Venta - Boleta B001-00000053',
    medioPago: 'Yape',
    monto: 89.50,
    referencia: 'B001-00000053',
    fecha: new Date('2025-09-16T11:15:00'),
    usuario: 'Carlos Rueda'
  }
];

const MovimientosCaja: React.FC = () => {
  const [movimientos] = useState<Movimiento[]>(mockMovimientos);
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [medioFiltro, setMedioFiltro] = useState('');
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

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-lg shadow p-8 mt-8">
      <h2 className="text-2xl font-bold mb-6">Movimientos de Caja</h2>
      {/* Filtros */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6 grid grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Fecha Desde</label>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Fecha Hasta</label>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
          <select value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option value="">Todos</option>
            <option value="Ingreso">Ingreso</option>
            <option value="Egreso">Egreso</option>
            <option value="Transferencia">Transferencia</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Medio de Pago</label>
          <select value={medioFiltro} onChange={e => setMedioFiltro(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option value="">Todos</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Tarjeta">Tarjeta</option>
            <option value="Yape">Yape</option>
            <option value="Transferencia">Transferencia</option>
          </select>
        </div>
      </div>
      {/* Tabla de movimientos */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto mb-8">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Fecha/Hora</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Tipo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Concepto</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Medio</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Monto</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Referencia</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Usuario</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {movimientosFiltrados.map((movimiento) => (
              <tr key={movimiento.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">{movimiento.fecha.toLocaleString('es-PE')}</td>
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
                <td className="px-4 py-3 text-sm text-gray-900">{movimiento.medioPago}</td>
                <td className="px-4 py-3 text-sm text-right font-medium">
                  <span className={movimiento.tipo === 'Ingreso' ? 'text-green-600' : 'text-red-600'}>
                    {movimiento.tipo === 'Egreso' ? '-' : ''}S/ {movimiento.monto.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{movimiento.referencia || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{movimiento.usuario}</td>
                <td className="px-4 py-3 text-center">
                  <button className="text-blue-600 hover:text-blue-800">
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Resumen rápido */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">Total Ingresos</p>
              <p className="text-2xl font-bold text-green-900">S/ {totalIngresos.toFixed(2)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700">Total Egresos</p>
              <p className="text-2xl font-bold text-red-900">S/ {totalEgresos.toFixed(2)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-red-600 rotate-180" />
          </div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700">Saldo Neto</p>
              <p className="text-2xl font-bold text-blue-900">S/ {saldoNeto.toFixed(2)}</p>
            </div>
            <Calculator className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovimientosCaja;
