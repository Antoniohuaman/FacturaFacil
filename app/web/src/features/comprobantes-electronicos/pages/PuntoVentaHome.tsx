// ===================================================================
// PUNTO DE VENTA - LANDING PAGE / DASHBOARD
// Dashboard principal del módulo de Punto de Venta
// ===================================================================

import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  ShoppingCart,
  TrendingUp,
  Package,
  Receipt,
  BarChart3,
  Clock,
  AlertCircle,
  ArrowRight,
  Zap,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useCaja } from '../../control-caja/context/CajaContext';
import { PageHeader } from '../../../components/PageHeader';

export function PuntoVentaHome() {
  const navigate = useNavigate();
  const { status: cajaStatus } = useCaja();
  const [stats, setStats] = useState({
    today: {
      sales: 0,
      amount: 0,
      products: 0,
      avgTicket: 0
    },
    month: {
      sales: 0,
      amount: 0
    }
  });

  // Cargar estadísticas (mock - en producción vendría del backend)
  useEffect(() => {
    // Simular carga de stats
    setStats({
      today: {
        sales: 23,
        amount: 2450.50,
        products: 47,
        avgTicket: 106.54
      },
      month: {
        sales: 234,
        amount: 24890.75
      }
    });
  }, []);

  const isCajaOpen = cajaStatus === 'abierta';

  return (
    <div className="flex-1 bg-gradient-to-br from-gray-50 via-emerald-50/30 to-gray-50">

      {/* Header */}
      <PageHeader
        title="Punto de Venta"
        icon={
          <ShoppingCart className="w-6 h-6 text-white" />
        }
      />

      {/* Main Content */}
      <div className="px-6 py-8">

        {/* Warning si caja cerrada */}
        {!isCajaOpen && (
          <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-amber-900">
                  Caja Cerrada
                </h3>
                <p className="text-amber-700 mt-1 text-sm">
                  Para usar el Punto de Venta necesitas abrir la caja primero.
                  Esto te permitirá registrar ventas y manejar efectivo de forma segura.
                </p>
                <div className="mt-4">
                  <button
                    onClick={() => navigate('/control-caja')}
                    className="inline-flex items-center px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    Ir a Control de Caja
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section - Acción Principal */}
        <div className="mb-8">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-8 text-white shadow-2xl shadow-emerald-500/30 relative overflow-hidden">
            {/* Patrón decorativo de fondo */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full -ml-48 -mb-48"></div>
            </div>

            <div className="relative flex items-center justify-between">
              <div className="flex-1">
                <div className="inline-flex items-center px-3 py-1 bg-white/20 rounded-full text-sm font-medium mb-4">
                  <Zap className="w-4 h-4 mr-2" />
                  Listo para vender
                </div>
                <h2 className="text-4xl font-bold mb-2">
                  Comienza una nueva venta
                </h2>
                <p className="text-emerald-100 text-lg mb-6">
                  Interfaz rápida y optimizada para ventas en mostrador
                </p>
                <button
                  onClick={() => navigate('/punto-venta/nueva-venta')}
                  disabled={!isCajaOpen}
                  className="inline-flex items-center px-8 py-4 bg-white text-emerald-600 text-lg font-bold rounded-xl hover:bg-emerald-50 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <ShoppingCart className="w-6 h-6 mr-3" />
                  Nueva Venta
                  <ArrowRight className="w-6 h-6 ml-3" />
                </button>
              </div>

              {/* Ilustración o ícono grande */}
              <div className="hidden lg:flex items-center justify-center">
                <div className="w-48 h-48 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <ShoppingCart className="w-24 h-24 text-white" strokeWidth={1.5} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

          {/* Ventas de Hoy */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Receipt className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
                Hoy
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {stats.today.sales}
            </p>
            <p className="text-sm text-gray-600">Ventas realizadas</p>
            <div className="mt-3 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-green-600 font-medium">+12%</span>
              <span className="text-gray-500 ml-1">vs ayer</span>
            </div>
          </div>

          {/* Monto Vendido Hoy */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
                Hoy
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              S/ {stats.today.amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-gray-600">Total facturado</p>
            <div className="mt-3 flex items-center text-sm">
              <span className="text-gray-600">Ticket promedio:</span>
              <span className="text-gray-900 font-medium ml-1">
                S/ {stats.today.avgTicket.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Productos Vendidos */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
                Hoy
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {stats.today.products}
            </p>
            <p className="text-sm text-gray-600">Productos vendidos</p>
            <div className="mt-3 flex items-center text-sm">
              <Clock className="w-4 h-4 text-gray-400 mr-1" />
              <span className="text-gray-600">Última venta hace 5 min</span>
            </div>
          </div>

          {/* Ventas del Mes */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
                Este mes
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {stats.month.sales}
            </p>
            <p className="text-sm text-gray-600">Ventas totales</p>
            <div className="mt-3 flex items-center text-sm">
              <span className="text-gray-600">Total:</span>
              <span className="text-gray-900 font-medium ml-1">
                S/ {stats.month.amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Ver Ventas del Día */}
          <button
            onClick={() => navigate('/comprobantes')}
            className="bg-white rounded-xl border-2 border-gray-200 p-6 text-left hover:border-blue-300 hover:shadow-lg transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Ver Ventas del Día
            </h3>
            <p className="text-gray-600">
              Revisa todas las ventas realizadas hoy y consulta el historial completo de comprobantes.
            </p>
          </button>

          {/* Control de Caja */}
          <button
            onClick={() => navigate('/control-caja')}
            className="bg-white rounded-xl border-2 border-gray-200 p-6 text-left hover:border-emerald-300 hover:shadow-lg transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${
                isCajaOpen
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30'
                  : 'bg-gradient-to-br from-gray-400 to-gray-500 shadow-gray-500/30'
              }`}>
                <Package className="w-7 h-7 text-white" />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-bold text-gray-900">
                Control de Caja
              </h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                isCajaOpen
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {isCajaOpen ? 'Abierta' : 'Cerrada'}
              </span>
            </div>
            <p className="text-gray-600">
              {isCajaOpen
                ? 'Revisa el estado de tu caja, realiza arqueos y cierra el turno.'
                : 'Abre la caja para comenzar a registrar ventas del día.'}
            </p>
          </button>
        </div>

        {/* Tips Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-bold text-blue-900 mb-2">
                💡 Consejos para usar el Punto de Venta
              </h4>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Usa el lector de código de barras para agregar productos rápidamente</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>La tecla F2 abre el buscador de productos y F3 finaliza la venta</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Recuerda cerrar la caja al final del día para cuadrar el efectivo</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
