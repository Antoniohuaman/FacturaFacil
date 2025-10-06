// src/features/configuration/pages/ConfigurationDashboard.tsx
import { Link } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
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
  Shield
} from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { useConfigurationContext } from '../context/ConfigurationContext';
import { StatusIndicator } from '../components/common/StatusIndicator';

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
    establishments: {
      isConfigured: state.establishments.length > 0,
      completionPercentage: state.establishments.length > 0 ? 100 : 0,
      count: state.establishments.length
    },
    employees: {
      isConfigured: state.employees.length > 0,
      completionPercentage: state.employees.length > 0 ? 100 : 0
    },
    series: {
      isConfigured: state.series.length > 0,
      completionPercentage: state.series.length > 0 ? 100 : 0
    },
    business: {
      isConfigured: state.paymentMethods.length > 0,
      completionPercentage: state.paymentMethods.length > 0 ? 100 : 0
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
      id: 'establishments',
      title: 'Establecimientos',
      description: 'Configura tus sucursales, locales o puntos de venta',
      icon: MapPin,
      path: '/configuracion/establecimientos',
      status: status.establishments.isConfigured ? 'complete' : 'pending',
      completionPercentage: status.establishments.completionPercentage,
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
      id: 'employees',
      title: 'Empleados y Roles',
      description: 'Usuarios del sistema, roles y permisos por establecimiento',
      icon: Users,
      path: '/configuracion/empleados',
      status: status.employees.isConfigured ? 'complete' : 'pending',
      completionPercentage: status.employees.isConfigured ? 100 : 0,
      priority: 'medium',
      estimatedTime: '10 min'
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
      case 'complete': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'partial': return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default: return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const completedModules = modules.filter(m => m.status === 'complete').length;
  const overallProgress = Math.round((completedModules / modules.length) * 100);

  return (
    <div className="flex-1 bg-gray-50">
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
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Progreso General</p>
              <p className="text-2xl font-bold text-gray-900">{overallProgress}%</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Módulos Completados</p>
              <p className="text-2xl font-bold text-gray-900">{completedModules}/{modules.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Establecimientos</p>
              <p className="text-2xl font-bold text-gray-900">{status.establishments.count}</p>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Ambiente</p>
              <p className="text-lg font-semibold text-gray-900">
                {company?.sunatConfiguration?.environment === 'PRODUCTION' ? 'Producción' : 'Prueba'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              company?.sunatConfiguration?.environment === 'PRODUCTION' 
                ? 'bg-red-50' 
                : 'bg-yellow-50'
            }`}>
              <Shield className={`w-6 h-6 ${
                company?.sunatConfiguration?.environment === 'PRODUCTION' 
                  ? 'text-red-600' 
                  : 'text-yellow-600'
              }`} />
            </div>
          </div>
        </div>
      </div>

      {/* Environment Alert */}
      {company?.sunatConfiguration?.environment === 'TESTING' && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-800">
                Ambiente de Prueba Activo
              </h3>
              <p className="text-yellow-700 mt-1">
                Actualmente estás en modo de prueba. Los documentos emitidos no tienen validez legal. 
                Una vez que completes la configuración, podrás cambiar a producción.
              </p>
              <div className="mt-4">
                <Link
                  to="/configuracion/empresa"
                  className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors"
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
          <h2 className="text-xl font-semibold text-gray-900">
            Módulos de Configuración
          </h2>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
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
                className="group bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className={`
                      w-12 h-12 rounded-lg flex items-center justify-center
                      ${module.status === 'complete' 
                        ? 'bg-green-50' 
                        : module.status === 'partial'
                          ? 'bg-yellow-50'
                          : 'bg-gray-50'
                      }
                    `}>
                      <Icon className={`w-6 h-6 ${
                        module.status === 'complete' 
                          ? 'text-green-600' 
                          : module.status === 'partial'
                            ? 'text-yellow-600'
                            : 'text-gray-600'
                      }`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {module.title}
                        </h3>
                        {getStatusIcon(module.status)}
                      </div>
                      
                      <p className="text-gray-500 text-sm mt-1 leading-relaxed">
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
                          
                          <span className="text-xs text-gray-500">
                            ⏱️ {module.estimatedTime}
                          </span>
                        </div>
                        
                        {module.completionPercentage > 0 && (
                          <span className="text-xs font-medium text-gray-600">
                            {module.completionPercentage}%
                          </span>
                        )}
                      </div>
                      
                      {module.completionPercentage > 0 && (
                        <div className="mt-3">
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full transition-all duration-500 ${
                                module.status === 'complete' 
                                  ? 'bg-green-500' 
                                  : 'bg-yellow-500'
                              }`}
                              style={{ width: `${module.completionPercentage}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Acciones Rápidas
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group">
            <Play className="w-5 h-5 text-blue-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900 group-hover:text-blue-700">
                Configuración Inicial
              </p>
              <p className="text-sm text-gray-500">
                Completa los datos básicos
              </p>
            </div>
          </button>
          
          <Link
            to="/configuracion/empresa"
            className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-yellow-300 hover:bg-yellow-50 transition-all group"
          >
            <Shield className="w-5 h-5 text-yellow-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900 group-hover:text-yellow-700">
                Cambiar a Producción
              </p>
              <p className="text-sm text-gray-500">
                Activar facturación oficial
              </p>
            </div>
          </Link>
          
          <Link
            to="/configuracion/empleados"
            className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all group"
          >
            <Users className="w-5 h-5 text-purple-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900 group-hover:text-purple-700">
                Gestionar Usuarios
              </p>
              <p className="text-sm text-gray-500">
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