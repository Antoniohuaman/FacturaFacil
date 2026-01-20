// src/features/configuration/pages/ConfigurationDashboard.tsx
import { Link } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Boxes as IconoAlmacen,
  ShoppingCart,
  FileText,
  Users,
  Printer,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Play,
  Settings,
  TrendingUp,
  Shield,
  Banknote
} from 'lucide-react';
import { PageHeader } from '../../../../../components/PageHeader';
import { useConfigurationContext } from '../contexto/ContextoConfiguracion';
import { StatusIndicator } from '../components/comunes/IndicadorEstado';

interface ConfigurationModule {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  status: 'complete' | 'partial' | 'pending';
  completionPercentage: number;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
}

export function ConfigurationDashboard() {
  const { state } = useConfigurationContext();
  const { company } = state;
  
  // Calculate status from current data
  const status = {
    company: {
      isConfigured: !!company,
      completionPercentage: company ? 100 : 0
    },
    Establecimientos: {
      isConfigured: state.Establecimientos.length > 0,
      completionPercentage: state.Establecimientos.length > 0 ? 100 : 0,
      count: state.Establecimientos.length
    },
    almacenes: {
      isConfigured: state.almacenes.length > 0,
      completionPercentage: state.almacenes.length > 0 ? 100 : 0,
      count: state.almacenes.length
    },
    users: {
      isConfigured: state.users.length > 0,
      completionPercentage: state.users.length > 0 ? 100 : 0
    },
    series: {
      isConfigured: state.series.length > 0,
      completionPercentage: state.series.length > 0 ? 100 : 0
    },
    business: {
      isConfigured: state.paymentMethods.length > 0,
      completionPercentage: state.paymentMethods.length > 0 ? 100 : 0
    },
    cajas: {
      isConfigured: state.cajas.length > 0,
      completionPercentage: state.cajas.length > 0 ? 100 : 0
    }
  };

  const modules: ConfigurationModule[] = [
    {
      id: 'company',
      title: 'Datos de Empresa',
      description: 'RUC, razón social, dirección fiscal y configuración básica',
      icon: Building2,
      path: '/configuracion/empresa',
      status: status.company.isConfigured ? 'complete' : 'pending',
      completionPercentage: status.company.completionPercentage,
      priority: 'high',
      estimatedTime: '5 min'
    },
    {
      id: 'Establecimientos',
      title: 'Establecimientos',
      description: 'Configura tus sucursales, locales o puntos de venta',
      icon: MapPin,
      path: '/configuracion/establecimientos',
      status: status.Establecimientos.isConfigured ? 'complete' : 'pending',
      completionPercentage: status.Establecimientos.completionPercentage,
      priority: 'high',
      estimatedTime: '3 min'
    },
    {
      id: 'almacenes',
      title: 'Almacenes',
      description: 'Gestiona los almacenes donde se controla el inventario',
      icon: IconoAlmacen,
      path: '/configuracion/almacenes',
      status: status.almacenes.isConfigured ? 'complete' : 'pending',
      completionPercentage: status.almacenes.completionPercentage,
      priority: 'high',
      estimatedTime: '3 min'
    },
    {
      id: 'series',
      title: 'Series de Comprobantes',
      description: 'Series para facturas, boletas y otros documentos',
      icon: FileText,
      path: '/configuracion/series',
      status: status.series.isConfigured ? 'complete' : 'pending',
      completionPercentage: status.series.isConfigured ? 100 : 0,
      priority: 'high',
      estimatedTime: '4 min'
    },
    {
      id: 'business',
      title: 'Configuración de Negocio',
      description: 'Formas de pago, monedas, unidades de medida e impuestos',
      icon: ShoppingCart,
      path: '/configuracion/negocio',
      status: status.business.isConfigured ? 'complete' : 'partial',
      completionPercentage: status.business.isConfigured ? 100 : 60,
      priority: 'medium',
      estimatedTime: '8 min'
    },
    {
      id: 'users',
      title: 'Usuarios y Roles',
      description: 'Usuarios del sistema, roles y permisos por establecimiento',
      icon: Users,
      path: '/configuracion/usuarios',
      status: status.users.isConfigured ? 'complete' : 'pending',
      completionPercentage: status.users.isConfigured ? 100 : 0,
      priority: 'medium',
      estimatedTime: '10 min'
    },
    {
      id: 'cajas',
      title: 'Cajas',
      description: 'Gestiona las cajas registradoras por establecimiento',
      icon: Banknote,
      path: '/configuracion/cajas',
      status: status.cajas.isConfigured ? 'complete' : 'pending',
      completionPercentage: status.cajas.isConfigured ? 100 : 0,
      priority: 'medium',
      estimatedTime: '3 min'
    },
    {
      id: 'voucher-design',
      title: 'Diseño de Comprobantes',
      description: 'Personaliza el diseño de tus facturas y boletas',
      icon: Printer,
      path: '/configuracion/diseno',
      status: 'pending',
      completionPercentage: 0,
      priority: 'low',
      estimatedTime: '6 min'
    }
  ];



  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete': return <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'partial': return <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
      default: return <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />;
    }
  };

  const completedModules = modules.filter(m => m.status === 'complete').length;
  const overallProgress = Math.round((completedModules / modules.length) * 100);

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <PageHeader 
        title="Configuración del Sistema"
        icon={
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        }
      />

      {/* Content */}
      <div>
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
          {/* Header Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Progreso General</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{overallProgress}%</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Módulos Completados</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{completedModules}/{modules.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Establecimientos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{status.Establecimientos.count}</p>
            </div>
            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ambiente</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {company?.configuracionSunatEmpresa.entornoSunat === 'PRODUCTION' ? 'Producción' : 'Prueba'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              company?.configuracionSunatEmpresa.entornoSunat === 'PRODUCTION' 
                ? 'bg-red-50 dark:bg-red-900/30' 
                : 'bg-yellow-50 dark:bg-yellow-900/30'
            }`}>
              <Shield className={`w-6 h-6 ${
                company?.configuracionSunatEmpresa.entornoSunat === 'PRODUCTION' 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-yellow-600 dark:text-yellow-400'
              }`} />
            </div>
          </div>
        </div>
      </div>

      {/* Environment Alert */}
      {company?.configuracionSunatEmpresa.entornoSunat === 'TESTING' && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-6">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-800/30 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
                Ambiente de Prueba Activo
              </h3>
              <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                Actualmente estás en modo de prueba. Los documentos emitidos no tienen validez legal. 
                Una vez que completes la configuración, podrás cambiar a producción.
              </p>
              <div className="mt-4">
                <Link
                  to="/configuracion/empresa"
                  className="inline-flex items-center px-4 py-2 bg-yellow-600 dark:bg-yellow-700 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 dark:hover:bg-yellow-600 transition-colors"
                >
                  Configurar para Producción
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Modules */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Módulos de Configuración
          </h2>
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <Settings className="w-4 h-4" />
            <span>Configura cada módulo para comenzar a facturar</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.id}
                to={module.path}
                className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg dark:hover:shadow-gray-900/20 transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className={`
                      w-12 h-12 rounded-lg flex items-center justify-center
                      ${module.status === 'complete' 
                        ? 'bg-green-50 dark:bg-green-900/30' 
                        : module.status === 'partial'
                          ? 'bg-yellow-50 dark:bg-yellow-900/30'
                          : 'bg-gray-50 dark:bg-gray-700'
                      }
                    `}>
                      <Icon className={`w-6 h-6 ${
                        module.status === 'complete' 
                          ? 'text-green-600 dark:text-green-400' 
                          : module.status === 'partial'
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-gray-600 dark:text-gray-400'
                      }`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {module.title}
                        </h3>
                        {getStatusIcon(module.status)}
                      </div>
                      
                      <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 leading-relaxed">
                        {module.description}
                      </p>
                      
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center space-x-4">
                          <StatusIndicator
                            status={module.priority === 'high' ? 'error' : module.priority === 'medium' ? 'warning' : 'pending'}
                            label={module.priority === 'high' ? 'Prioritario' : module.priority === 'medium' ? 'Importante' : 'Opcional'}
                            size="sm"
                            showIcon={false}
                          />
                          
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ⏱️ {module.estimatedTime}
                          </span>
                        </div>
                        
                        {module.completionPercentage > 0 && (
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                            {module.completionPercentage}%
                          </span>
                        )}
                      </div>
                      
                      {module.completionPercentage > 0 && (
                        <div className="mt-3">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full transition-all duration-500 ${
                                module.status === 'complete' 
                                  ? 'bg-green-500 dark:bg-green-400' 
                                  : 'bg-yellow-500 dark:bg-yellow-400'
                              }`}
                              style={{ width: `${module.completionPercentage}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Acciones Rápidas
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group">
            <Play className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div className="text-left">
              <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                Configuración Inicial
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Completa los datos básicos
              </p>
            </div>
          </button>
          
          <Link
            to="/configuracion/empresa"
            className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-yellow-300 dark:hover:border-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-all group"
          >
            <Shield className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <div className="text-left">
              <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-yellow-700 dark:group-hover:text-yellow-300">
                Cambiar a Producción
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Activar facturación oficial
              </p>
            </div>
          </Link>
          
          <Link
            to="/configuracion/usuarios"
            className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all group"
          >
            <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <div className="text-left">
              <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-purple-700 dark:group-hover:text-purple-300">
                Gestionar Usuarios
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Invitar y asignar roles
              </p>
            </div>
          </Link>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}