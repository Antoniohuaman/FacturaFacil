import { useState } from 'react';
import { useCaja } from '../context/CajaContext';
import { DollarSign, Lock, Clock, User, Calendar, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import AperturaCaja from './AperturaCaja';
import CierreCaja from './CierreCaja';
import MovimientosCaja from './MovimientosCaja';
import DetalleMovimientoCaja from './DetalleMovimientoCaja';
import ConfiguracionCaja from './ConfiguracionCaja';
import ReportesCaja from './ReportesCaja';

const TABS = [
  { key: 'apertura', label: 'Apertura' },
  { key: 'cierre', label: 'Cierre' },
  { key: 'movimientos', label: 'Movimientos' },
  { key: 'detalle', label: 'Detalle' },
  { key: 'configuracion', label: 'Configuración' },
  { key: 'reportes', label: 'Reportes' }
];

export default function ControlCajaHome() {
  const [activeTab, setActiveTab] = useState('apertura');
  const { status, aperturaActual, getResumen } = useCaja();
  const resumen = getResumen();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header with status */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Control de Caja</h1>

            {/* Status badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm ${
              status === 'abierta'
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              {status === 'abierta' ? (
                <>
                  <DollarSign className="w-5 h-5" />
                  Caja Abierta
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Caja Cerrada
                </>
              )}
            </div>
          </div>
        </div>

        {/* Caja info when open */}
        {status === 'abierta' && aperturaActual && (
          <div className="mb-6">
            {/* Apertura info card */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 border border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Fecha de Apertura</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(aperturaActual.fechaHoraApertura).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Hora de Apertura</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(aperturaActual.fechaHoraApertura).toLocaleTimeString('es-PE', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <User className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Usuario/Cajero</p>
                    <p className="text-sm font-semibold text-gray-900">{aperturaActual.usuarioNombre}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Wallet className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Monto Inicial</p>
                    <p className="text-sm font-semibold text-gray-900">S/ {aperturaActual.montoInicialTotal.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Resumen cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Apertura</p>
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-900">S/ {resumen.apertura.toFixed(2)}</p>
                <p className="text-xs text-blue-600 mt-1">{resumen.cantidadMovimientos} movimientos</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Ingresos</p>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-900">S/ {resumen.ingresos.toFixed(2)}</p>
                <p className="text-xs text-green-600 mt-1">Efectivo, tarjeta, yape</p>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-red-700 uppercase tracking-wide">Egresos</p>
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-2xl font-bold text-red-900">S/ {resumen.egresos.toFixed(2)}</p>
                <p className="text-xs text-red-600 mt-1">Salidas registradas</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg p-4 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">Saldo Actual</p>
                  <Wallet className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-purple-900">S/ {resumen.saldo.toFixed(2)}</p>
                <p className="text-xs text-purple-600 mt-1">En caja ahora</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs navigation */}
        <div className="mb-6">
          {/* Desktop tabs */}
          <nav className="hidden sm:flex gap-2 border-b border-gray-200">
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={`px-4 py-3 font-medium border-b-2 transition-all ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Mobile dropdown */}
          <div className="sm:hidden">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TABS.map(tab => (
                <option key={tab.key} value={tab.key}>
                  {tab.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'apertura' && <AperturaCaja />}
          {activeTab === 'cierre' && <CierreCaja />}
          {activeTab === 'movimientos' && <MovimientosCaja />}
          {activeTab === 'detalle' && <DetalleMovimientoCaja />}
          {activeTab === 'configuracion' && <ConfiguracionCaja />}
          {activeTab === 'reportes' && <ReportesCaja />}
        </div>
      </div>
    </div>
  );
}
