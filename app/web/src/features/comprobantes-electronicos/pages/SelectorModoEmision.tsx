// ===================================================================
// SELECTOR DE MODO DE EMISIÓN - LANDING PAGE PREMIUM
// Inspirado en ConfigurationDashboard pero para comprobantes
// ===================================================================

import { useNavigate } from 'react-router-dom';
import {
  FileText,
  ShoppingCart,
  ArrowRight,
  Zap,
  Clock,
  CheckCircle2,
  TrendingUp,
  Package,
  BarChart3,
  Receipt,
  AlertCircle
} from 'lucide-react';
import { useCaja } from '../../control-caja/context/CajaContext';
import { useState, useEffect } from 'react';

interface ModoEmision {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  features: string[];
  recommended?: string;
  gradient: string;
  iconBg: string;
  iconColor: string;
  estimatedTime: string;
  idealFor: string[];
  badge?: string;
}

export function SelectorModoEmision() {
  const navigate = useNavigate();
  const { status: cajaStatus } = useCaja();
  const [stats, setStats] = useState({
    today: 0,
    thisMonth: 0,
    totalThisMonth: 0
  });

  // Cargar estadísticas (mock - en producción vendría del backend)
  useEffect(() => {
    // Simular carga de stats
    setStats({
      today: 15,
      thisMonth: 234,
      totalThisMonth: 12450.50
    });
  }, []);

  const modos: ModoEmision[] = [
    {
      id: 'emision',
      title: 'Emisión Tradicional',
      subtitle: 'Comprobantes completos y detallados',
      description: 'Ideal para empresas de servicios, B2B y ventas que requieren documentación detallada',
      icon: FileText,
      path: '/comprobantes/emision',
      features: [
        'Gestión completa de productos y servicios',
        'Notas, observaciones y referencias',
        'Sistema de borradores con fechas',
        'Vista previa antes de emitir',
        'Campos personalizables por item',
        'Ideal para contadores y administrativos'
      ],
      gradient: 'from-blue-50 via-indigo-50 to-blue-50',
      iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      iconColor: 'text-white',
      estimatedTime: '2-5 min',
      idealFor: ['Servicios profesionales', 'Empresas B2B', 'Oficinas administrativas'],
      badge: 'Completo'
    },
    {
      id: 'pos',
      title: 'Punto de Venta',
      subtitle: 'Ventas rápidas y eficientes',
      description: 'Perfecto para retail, restaurantes y negocios de alta rotación que necesitan velocidad',
      icon: ShoppingCart,
      path: '/comprobantes/pos',
      features: [
        'Búsqueda ultra-rápida con código de barras',
        'Interfaz visual optimizada para táctil',
        'Proceso de pago en 2 pasos',
        'Calculadora de vuelto automática',
        'Productos favoritos y categorías',
        'Optimizado para alta velocidad'
      ],
      recommended: 'Popular en retail',
      gradient: 'from-emerald-50 via-teal-50 to-emerald-50',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      iconColor: 'text-white',
      estimatedTime: '30 seg',
      idealFor: ['Tiendas y minimarkets', 'Restaurantes', 'Farmacias'],
      badge: 'Rápido'
    }
  ];

  const isCajaOpen = cajaStatus === 'abierta';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">

      {/* Header Premium */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Nuevo Comprobante Electrónico
              </h1>
              <p className="text-gray-600">
                Selecciona el modo de emisión que mejor se adapte a tu operación
              </p>
            </div>
            <button
              onClick={() => navigate('/comprobantes')}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ← Volver a comprobantes
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Comprobantes Hoy */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Hoy</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.today}</p>
                <p className="text-xs text-gray-500 mt-1">Comprobantes</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Receipt className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Comprobantes Este Mes */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Este Mes</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.thisMonth}</p>
                <p className="text-xs text-gray-500 mt-1">Comprobantes</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Total Facturado */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Facturado</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  S/ {stats.totalThisMonth.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">Este mes</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Estado de Caja */}
          <div className={`bg-white rounded-xl border p-6 hover:shadow-lg transition-shadow ${
            isCajaOpen ? 'border-green-200' : 'border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Caja</p>
                <p className={`text-lg font-bold mt-1 ${
                  isCajaOpen ? 'text-green-700' : 'text-red-700'
                }`}>
                  {isCajaOpen ? 'Abierta' : 'Cerrada'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {isCajaOpen ? 'Lista para ventas' : 'No disponible'}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                isCajaOpen ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <Package className={`w-6 h-6 ${
                  isCajaOpen ? 'text-green-600' : 'text-red-600'
                }`} />
              </div>
            </div>
          </div>
        </div>

        {/* Warning si caja cerrada */}
        {!isCajaOpen && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-amber-900">
                  Caja Cerrada
                </h3>
                <p className="text-amber-700 mt-1 text-sm">
                  Puedes crear comprobantes, pero no podrás procesarlos hasta que abras la caja.
                  El modo POS requiere caja abierta para funcionar.
                </p>
                <div className="mt-4">
                  <button
                    onClick={() => {
                      // Guardar la URL de retorno para volver después de aperturar
                      sessionStorage.setItem('returnAfterCajaOpen', '/comprobantes/nuevo');
                      navigate('/control-caja?returnTo=/comprobantes/nuevo');
                    }}
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

        {/* Hero Section */}
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-6 shadow-xl shadow-blue-500/30">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            ¿Cómo prefieres trabajar hoy?
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Elige el modo que mejor se adapte a tu negocio. Ambos modos te permiten crear comprobantes válidos,
            la diferencia está en la <span className="font-semibold text-blue-600">experiencia de uso</span> y
            la <span className="font-semibold text-blue-600">velocidad de operación</span>.
          </p>
        </div>

        {/* Modos Grid - Cards Premium */}
        <div className="grid md:grid-cols-2 gap-8">
          {modos.map((modo) => {
            const Icon = modo.icon;
            return (
              <div
                key={modo.id}
                onClick={() => navigate(modo.path)}
                className="group relative bg-white rounded-2xl border-2 border-gray-200 hover:border-blue-400 transition-all duration-300 cursor-pointer overflow-hidden hover:shadow-2xl hover:scale-[1.02]"
              >
                {/* Gradient Background on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${modo.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                {/* Recommended Badge */}
                {modo.recommended && (
                  <div className="absolute top-4 right-4 z-10">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg animate-pulse">
                      <Zap className="w-3 h-3 mr-1" />
                      {modo.recommended}
                    </span>
                  </div>
                )}

                {/* Badge Type */}
                {modo.badge && !modo.recommended && (
                  <div className="absolute top-4 right-4 z-10">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                      {modo.badge}
                    </span>
                  </div>
                )}

                {/* Content */}
                <div className="relative p-8">
                  {/* Icon con gradiente */}
                  <div className={`inline-flex items-center justify-center w-16 h-16 ${modo.iconBg} rounded-xl mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-8 h-8 ${modo.iconColor}`} />
                  </div>

                  {/* Title & Subtitle */}
                  <div className="mb-4">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {modo.title}
                    </h3>
                    <p className="text-sm font-medium text-blue-600 mb-3">
                      {modo.subtitle}
                    </p>
                    <p className="text-gray-600 leading-relaxed text-sm">
                      {modo.description}
                    </p>
                  </div>

                  {/* Estimated Time */}
                  <div className="flex items-center gap-2 mb-6 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                      Tiempo estimado: <span className="font-semibold text-gray-900">{modo.estimatedTime}</span>
                    </span>
                  </div>

                  {/* Features List */}
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Características principales
                    </p>
                    <ul className="space-y-2">
                      {modo.features.map((feature, index) => (
                        <li key={index} className="flex items-start text-sm">
                          <div className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                            <CheckCircle2 className="w-3 h-3 text-blue-600" />
                          </div>
                          <span className="ml-3 text-gray-700 leading-relaxed">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Ideal For */}
                  <div className="mb-8">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Ideal para
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {modo.idealFor.map((item, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 group-hover:shadow-2xl transition-all duration-300 text-base"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(modo.path);
                    }}
                  >
                    Seleccionar este modo
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Help Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-bold text-gray-900 mb-3">
                ¿No estás seguro cuál elegir?
              </h4>
              <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-600">
                <div>
                  <p className="font-semibold text-gray-900 mb-2">
                    Elige <span className="text-blue-600">Emisión Tradicional</span> si:
                  </p>
                  <ul className="space-y-1 ml-4 list-disc">
                    <li>Necesitas detallar observaciones o notas</li>
                    <li>Trabajas principalmente desde una oficina</li>
                    <li>Emites facturas con referencias complejas</li>
                    <li>Prefieres revisar antes de emitir</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-2">
                    Elige <span className="text-emerald-600">Punto de Venta</span> si:
                  </p>
                  <ul className="space-y-1 ml-4 list-disc">
                    <li>Necesitas velocidad en las ventas</li>
                    <li>Tienes productos con código de barras</li>
                    <li>Trabajas en mostrador o tienda física</li>
                    <li>Prefieres interfaz visual y táctil</li>
                  </ul>
                </div>
              </div>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">💡 Tip:</span> Puedes usar ambos modos según la situación.
                  Muchos negocios combinan Emisión Tradicional para B2B y POS para ventas al público.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
