import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCaja } from '../context/CajaContext';
import { DollarSign, Lock, Clock, User, Calendar, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { PageHeader } from '@/contasis';
import AperturaCaja from './AperturaCaja';
import CierreCaja from './CierreCaja';
import MovimientosCaja from './MovimientosCaja';
import RegistrarMovimiento from './RegistrarMovimiento';
import DetalleMovimientoCaja from './DetalleMovimientoCaja';
import ConfiguracionCaja from './ConfiguracionCaja';
import ReportesCaja from './ReportesCaja';
import { useFocusFromQuery } from '../../../../../hooks/useFocusFromQuery';
import { useAutoExportRequest } from '@/shared/export/useAutoExportRequest';

const TABS = [
  { key: 'apertura', label: 'Apertura' },
  { key: 'cierre', label: 'Cierre' },
  { key: 'registrar', label: 'Registrar' },
  { key: 'movimientos', label: 'Movimientos' },
  { key: 'detalle', label: 'Detalle' },
  { key: 'configuracion', label: 'Configuración' },
  { key: 'reportes', label: 'Reportes' }
];

export default function ControlCajaHome() {
  useFocusFromQuery();
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'apertura');
  const { status, aperturaActual, getResumen } = useCaja();
  const resumen = getResumen();
  const { request: cajaAutoExportRequest, finish: finishCajaAutoExport } = useAutoExportRequest('caja-movimientos');
  const cajaAutoExportHandledRef = useRef(false);

  // Actualizar tab cuando cambie el parámetro URL
  useEffect(() => {
    if (tabFromUrl && TABS.some(t => t.key === tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  useEffect(() => {
    if (!cajaAutoExportRequest || cajaAutoExportHandledRef.current) {
      return;
    }

    if (activeTab !== 'reportes') {
      setActiveTab('reportes');
      return;
    }

    cajaAutoExportHandledRef.current = true;
  }, [activeTab, cajaAutoExportRequest]);

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <PageHeader 
        title="Control de Caja"
      />

      {/* Toolbar - Tabs + Status */}
      <div className="bg-white dark:bg-gray-800 border-b border-slate-300 dark:border-gray-600 shadow-sm" style={{ minHeight: '72px' }}>
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Tabs navigation - Desktop */}
            <nav className="hidden sm:flex gap-2">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  className={`px-4 py-2 font-semibold text-sm rounded-md transition-colors ${
                    activeTab === tab.key
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-600'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Tabs navigation - Mobile */}
            <div className="sm:hidden">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TABS.map(tab => (
                  <option key={tab.key} value={tab.key}>
                    {tab.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm ${
              status === 'abierta'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-700'
                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-700'
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
      </div>

      {/* Content */}
      <div>
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {/* Caja info when open */}
          {status === 'abierta' && aperturaActual && (
            <div className="mb-6">
              {/* Apertura info card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 mb-4 border border-gray-200 dark:border-gray-600">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Fecha de Apertura</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {new Date(aperturaActual.fechaHoraApertura).toLocaleDateString('es-PE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Hora de Apertura</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {new Date(aperturaActual.fechaHoraApertura).toLocaleTimeString('es-PE', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <User className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Usuario/Cajero</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{aperturaActual.usuarioNombre}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <Wallet className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Monto Inicial</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">S/ {aperturaActual.montoInicialTotal.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumen cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                  className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 shadow-sm"
                  data-focus="caja:resumen:apertura"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Apertura</p>
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-900">S/ {resumen.apertura.toFixed(2)}</p>
                  <p className="text-xs text-blue-600 mt-1">{resumen.cantidadMovimientos} movimientos</p>
                </div>

                <div
                  className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4 shadow-sm"
                  data-focus="caja:resumen:ingresos"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Ingresos</p>
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-900">S/ {resumen.ingresos.toFixed(2)}</p>
                  <p className="text-xs text-green-600 mt-1">Efectivo, tarjeta, yape</p>
                </div>

                <div
                  className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4 shadow-sm"
                  data-focus="caja:resumen:egresos"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-red-700 uppercase tracking-wide">Egresos</p>
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                  <p className="text-2xl font-bold text-red-900">S/ {resumen.egresos.toFixed(2)}</p>
                  <p className="text-xs text-red-600 mt-1">Salidas registradas</p>
                </div>

                <div
                  className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg p-4 shadow-md"
                  data-focus="caja:resumen:saldo"
                >
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

          {/* Tab content */}
          <div>
            {activeTab === 'apertura' && <AperturaCaja />}
            {activeTab === 'cierre' && <CierreCaja />}
            {activeTab === 'registrar' && <RegistrarMovimiento />}
            {activeTab === 'movimientos' && <MovimientosCaja />}
            {activeTab === 'detalle' && <DetalleMovimientoCaja />}
            {activeTab === 'configuracion' && <ConfiguracionCaja />}
            {activeTab === 'reportes' && (
              <ReportesCaja
                autoExportRequest={cajaAutoExportRequest}
                onAutoExportFinished={finishCajaAutoExport}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
