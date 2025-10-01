
import { NavLink } from "react-router-dom";
import { Menu } from "lucide-react";
import CompanySelector from "../../components/CompanySelector";

interface SideNavProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const mainItems = [
  { 
    to: "/comprobantes", 
    label: "Comprobantes", 
    description: "Emitir facturas y boletas",
    badge: "12",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M9 12h6M9 16h6M9 8h6" />
        <rect x="4" y="4" width="16" height="16" rx="2" />
      </svg>
    )
  },
  { 
    to: "/catalogo", 
    label: "Productos", 
    description: "Gestionar inventario",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <rect x="9" y="9" width="6" height="6"/>
      </svg>
    )
  },
  { 
    to: "/lista-precios", 
    label: "Precios", 
    description: "Configurar tarifas",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    )
  },
  { 
    to: "/control-caja", 
    label: "Caja", 
    description: "Control de efectivo",
    badge: "Activa",
    badgeColor: "green",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        <circle cx="12" cy="14" r="2"/>
      </svg>
    )
  },
  { 
    to: "/clientes", 
    label: "Clientes", 
    description: "Base de datos",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    )
  },
  { 
    to: "/indicadores", 
    label: "Reportes", 
    description: "Analytics y KPIs",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M3 3v18h18"/>
        <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
      </svg>
    )
  },
];

const configItem = {
  to: "/configuracion", 
  label: "Configuración", 
  description: "Ajustes del sistema",
  icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
};

export default function SideNav({ collapsed = false, onToggle }: SideNavProps) {
  return (
    <aside className={`h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white border-r border-slate-200 transition-all duration-300 shadow-sm`}>
      {/* Header con título y botón colapsar */}
      <div className="p-4 border-b border-gray-100/50">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center">
              <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">NAVEGACIÓN</h2>
            </div>
          )}
          
          {/* Botón de colapsar/expandir */}
          {onToggle && (
            <button
              onClick={onToggle}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            >
              <Menu className="w-4 h-4 text-slate-600" />
            </button>
          )}
        </div>
      </div>

      {/* Selector de empresa */}
      {!collapsed ? (
        <CompanySelector />
      ) : (
        /* Versión compacta del selector cuando está contraído */
        <div className="p-3 border-b border-gray-100/50 flex justify-center">
          <div className="relative">
            <button 
              className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm hover:shadow-md transition-all duration-200"
              title="Mi Empresa SAC - Tienda Sur"
            >
              ME
            </button>
            {/* Indicador de empresa activa */}
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
        </div>
      )}
      
      {/* Navegación principal */}
      <nav className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
        {!collapsed && (
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">
            Módulos Principales
          </div>
        )}
        
        {mainItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 text-base transition-all duration-200 group rounded-lg mx-2 relative ${
                isActive
                  ? 'text-blue-700 bg-blue-50 border-l-4 border-blue-500 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:shadow-sm border-l-4 border-transparent'
              } ${collapsed ? 'justify-center px-3 mx-1' : ''}`
            }
            title={collapsed ? `${item.label}` : undefined}
          >
            {({ isActive }) => (
              <>
                <span className={`flex items-center justify-center flex-shrink-0 w-6 h-6 transition-colors duration-200 ${
                  isActive ? 'text-blue-700' : 'text-slate-500 group-hover:text-slate-700'
                }`}>
                  {item.icon}
                </span>
                
                {!collapsed && (
                  <span className="font-medium text-base transition-colors duration-200">{item.label}</span>
                )}
                
                {!collapsed && item.badge && (
                  <span className={`ml-auto px-3 py-1 text-sm font-medium rounded-full transition-colors duration-200 ${
                    item.badgeColor === 'green' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {item.badge}
                  </span>
                )}
                
                {collapsed && item.badge && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></div>
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* Separador y configuración */}
        <div className="mt-auto pt-4">
          {!collapsed && (
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2 border-t border-slate-100 pt-4">
              Sistema
            </div>
          )}
          
          <NavLink
            to={configItem.to}
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 text-base transition-all duration-200 group rounded-lg mx-2 relative ${
                isActive
                  ? 'text-blue-700 bg-blue-50 border-l-4 border-blue-500 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:shadow-sm border-l-4 border-transparent'
              } ${collapsed ? 'justify-center px-3 mx-1' : ''}`
            }
            title={collapsed ? `${configItem.label}` : undefined}
          >
            {({ isActive }) => (
              <>
                <span className={`flex items-center justify-center flex-shrink-0 w-6 h-6 transition-colors duration-200 ${
                  isActive ? 'text-blue-700' : 'text-slate-500 group-hover:text-slate-700'
                }`}>
                  {configItem.icon}
                </span>
                {!collapsed && (
                  <span className="font-medium text-base transition-colors duration-200">{configItem.label}</span>
                )}
              </>
            )}
          </NavLink>
        </div>
      </nav>
    </aside>
  );
}
