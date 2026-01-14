// src/features/configuration/components/layout/TabNavigation.tsx
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  ShoppingCart, 
  FileText, 
  Users, 
  Printer,
  BarChart3
} from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  description: string;
  badge?: number;
}

export function TabNavigation() {
  const location = useLocation();

  const tabs: Tab[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      path: '/configuracion',
      description: 'Panel general de configuración'
    },
    {
      id: 'company',
      label: 'Empresa',
      icon: Building2,
      path: '/configuracion/empresa',
      description: 'Datos legales y tributarios'
    },
    {
      id: 'establishments',
      label: 'Establecimientos',
      icon: MapPin,
      path: '/configuracion/establecimientos',
      description: 'Sucursales y locales'
    },
    {
      id: 'business',
      label: 'Negocio',
      icon: ShoppingCart,
      path: '/configuracion/negocio',
      description: 'Pagos, monedas, unidades e impuestos'
    },
    {
      id: 'series',
      label: 'Series',
      icon: FileText,
      path: '/configuracion/series',
      description: 'Series de comprobantes'
    },
    {
      id: 'employees',
      label: 'Usuarios',
      icon: Users,
      path: '/configuracion/usuarios',
      description: 'Usuarios y roles'
    },
    {
      id: 'voucher-design',
      label: 'Diseño',
      icon: Printer,
      path: '/configuracion/diseno',
      description: 'Diseño de comprobantes'
    }
  ];

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto">
        <nav className="flex space-x-8 px-6 py-0 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.path || 
              (tab.id === 'dashboard' && location.pathname === '/configuracion');
            
            return (
              <NavLink
                key={tab.id}
                to={tab.path}
                className={({ isActive: linkIsActive }) => `
                  group flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                  transition-all duration-200 relative
                  ${isActive || linkIsActive
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
                title={tab.description}
              >
                <Icon className={`w-5 h-5 transition-colors ${
                  isActive 
                    ? 'text-blue-600' 
                    : 'text-gray-400 group-hover:text-gray-600'
                }`} />
                <span className="select-none">{tab.label}</span>
                
                {/* Badge for notifications or count */}
                {tab.badge && (
                  <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {tab.badge}
                  </span>
                )}

                {/* Hover tooltip */}
                <div className="
                  invisible group-hover:visible 
                  absolute top-full left-1/2 transform -translate-x-1/2 
                  mt-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg 
                  whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 
                  transition-opacity duration-200 pointer-events-none
                ">
                  {tab.description}
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                </div>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}