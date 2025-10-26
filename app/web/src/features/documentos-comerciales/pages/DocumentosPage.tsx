// app/web/src/features/documentos-comerciales/pages/DocumentosPage.tsx

import { useState } from 'react';
import { 
  FileText, 
  Receipt,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  Package,
  AlertCircle
} from 'lucide-react';
import { useDocumentos } from '../hooks/useDocumentos';
import { CotizacionesView } from '../components/cotizaciones/CotizacionesView';
import { NotasVentaView } from '../components/notas-venta/NotasVentaView';

type TabId = 'cotizaciones' | 'notas-venta';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

export function DocumentosPage() {
  const [activeTab, setActiveTab] = useState<TabId>('cotizaciones');
  const { 
    estadisticasCotizaciones, 
    estadisticasNotasVenta,
    loading,
    error 
  } = useDocumentos();

  // Configuración de tabs
  const tabs: TabConfig[] = [
    {
      id: 'cotizaciones',
      label: 'Cotizaciones',
      icon: <FileText className="w-5 h-5" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-600'
    },
    {
      id: 'notas-venta',
      label: 'Notas de Venta',
      icon: <Receipt className="w-5 h-5" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-600'
    }
  ];

  const activeTabConfig = tabs.find(tab => tab.id === activeTab)!;
  const estadisticas = activeTab === 'cotizaciones' ? estadisticasCotizaciones : estadisticasNotasVenta;

  // Formatear moneda
  const formatMoney = (amount: number, decimals: number = 0) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Principal */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          {/* Título y descripción */}
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-xl ${activeTabConfig.bgColor}`}>
                  <Package className={`w-8 h-8 ${activeTabConfig.color}`} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Documentos Comerciales
                  </h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Gestiona cotizaciones y notas de venta de manera eficiente
                  </p>
                </div>
              </div>
              
              {/* Info de la empresa */}
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">Mi Empresa SAC</p>
                <p className="text-xs text-gray-500">Tienda Sur • Usuario: Admin</p>
              </div>
            </div>
          </div>

          {/* Tabs de navegación */}
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative py-4 px-1 flex items-center space-x-2
                  text-sm font-medium transition-all duration-200
                  border-b-2
                  ${activeTab === tab.id
                    ? `${tab.color} ${tab.borderColor}`
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <span className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${tab.bgColor} ${tab.color}`}>
                    {estadisticas.total}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards de estadísticas */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Card: Total Documentos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">
                  Total {activeTab === 'cotizaciones' ? 'Cotizaciones' : 'Notas de Venta'}
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {estadisticas.total}
                </p>
                <div className="mt-2 flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Este mes</span>
                  <div className="flex items-center text-green-600">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    <span className="text-xs font-medium">+12%</span>
                  </div>
                </div>
              </div>
              <div className={`p-3 rounded-lg ${activeTabConfig.bgColor}`}>
                {activeTabConfig.icon}
              </div>
            </div>
          </div>

          {/* Card: Pendientes/Emitidos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">
                  {activeTab === 'cotizaciones' ? 'Pendientes' : 'Emitidas'}
                </p>
                <p className="mt-2 text-3xl font-bold text-orange-600">
                  {activeTab === 'cotizaciones' 
                    ? estadisticas.borradores + estadisticas.emitidos
                    : estadisticas.emitidos
                  }
                </p>
                <div className="mt-2">
                  <span className="text-xs text-gray-500">Requieren atención</span>
                </div>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Card: Monto Total */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Monto Total</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {formatMoney(estadisticas.montoTotal)}
                </p>
                <div className="mt-2">
                  <span className="text-xs text-gray-500">
                    Promedio: {formatMoney(estadisticas.promedioMonto)}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Card: Tasa de Conversión */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Conversión</p>
                <p className="mt-2 text-3xl font-bold text-purple-600">
                  {estadisticas.tasaConversion.toFixed(1)}%
                </p>
                <div className="mt-2">
                  <span className="text-xs text-gray-500">
                    {estadisticas.convertidos} convertidos
                  </span>
                </div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Contenido de la pestaña activa */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {activeTab === 'cotizaciones' && <CotizacionesView />}
              {activeTab === 'notas-venta' && <NotasVentaView />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}