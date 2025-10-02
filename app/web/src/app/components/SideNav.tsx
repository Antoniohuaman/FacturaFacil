
import { NavLink } from "react-router-dom";
import { Menu, FileText, Package, DollarSign, ShoppingCart, Users, BarChart3, Settings } from "lucide-react";
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
    icon: FileText
  },
  { 
    to: "/catalogo", 
    label: "Productos", 
    description: "Gestionar inventario",
    icon: Package
  },
  { 
    to: "/lista-precios", 
    label: "Precios", 
    description: "Configurar tarifas",
    icon: DollarSign
  },
  { 
    to: "/control-caja", 
    label: "Caja", 
    description: "Control de efectivo",
    badge: "Activa",
    badgeColor: "green",
    icon: ShoppingCart
  },
  { 
    to: "/clientes", 
    label: "Clientes", 
    description: "Base de datos",
    icon: Users
  },
  { 
    to: "/indicadores", 
    label: "Reportes", 
    description: "Analytics y KPIs",
    icon: BarChart3
  },
];

const configItem = {
  to: "/configuracion", 
  label: "Configuración", 
  description: "Ajustes del sistema",
  icon: Settings
};

export default function SideNav({ collapsed = false, onToggle }: SideNavProps) {
  return (
    <aside 
      className={`h-full flex flex-col bg-gradient-to-b from-slate-50 to-white border-r border-slate-200 transition-all duration-300 shadow-sm overflow-hidden`}
      onWheel={(e) => {
        // Prevenir el scroll del contenido principal cuando se hace scroll en el sidebar
        const sidebar = e.currentTarget;
        const scrollTop = sidebar.scrollTop;
        const scrollHeight = sidebar.scrollHeight;
        const clientHeight = sidebar.clientHeight;
        
        // Si estamos en el tope y queremos subir más, o en el fondo y queremos bajar más
        if ((scrollTop === 0 && e.deltaY < 0) || (scrollTop >= scrollHeight - clientHeight && e.deltaY > 0)) {
          e.preventDefault();
        }
      }}
    >
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
      <nav className="flex-1 flex flex-col p-4 overflow-y-auto overscroll-contain">
        {!collapsed && (
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">
            Módulos Principales
          </div>
        )}
        
        <div className="space-y-1">
          {mainItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={() =>
              `flex items-center rounded-lg transition-all group relative ${
                collapsed ? 'justify-center p-3 mx-1' : 'px-1 py-3'
              }`
            }
            title={collapsed ? `${item.label}` : undefined}
          >
            {({ isActive }) => (
              <>
                <div
                  className={`w-full flex items-center rounded-lg transition-all duration-200 ${
                    collapsed ? 'justify-center p-3' : 'px-4 py-3'
                  } ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  style={{
                    backgroundColor: isActive ? '#E6F0FF' : 'transparent',
                    color: isActive ? '#0040A2' : '#64748b'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#f1f5f9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span className={`flex items-center justify-center flex-shrink-0 w-5 h-5 transition-colors duration-200`}>
                    <item.icon size={20} />
                  </span>
                  
                  {!collapsed && (
                    <>
                      <span className="ml-3 text-sm font-medium transition-colors duration-200">{item.label}</span>
                      
                      {item.badge && (
                        <span className={`ml-auto px-2 py-1 text-xs font-medium rounded-full transition-colors duration-200 ${
                          item.badgeColor === 'green' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </div>
                
                {collapsed && item.badge && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></div>
                )}
                
                {collapsed && (
                  <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-[60]">
                    {item.label}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
        </div>

        {/* Separador y configuración */}
        <div className="mt-auto pt-4">
          {!collapsed && (
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2 border-t border-slate-100 pt-4">
              Sistema
            </div>
          )}
          
          <NavLink
            to={configItem.to}
            className={() =>
              `flex items-center rounded-lg transition-all group relative ${
                collapsed ? 'justify-center p-3 mx-1' : 'px-1 py-3'
              }`
            }
            title={collapsed ? `${configItem.label}` : undefined}
          >
            {({ isActive }) => (
              <>
                <div
                  className={`w-full flex items-center rounded-lg transition-all duration-200 ${
                    collapsed ? 'justify-center p-3' : 'px-4 py-3'
                  } ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  style={{
                    backgroundColor: isActive ? '#E6F0FF' : 'transparent',
                    color: isActive ? '#0040A2' : '#64748b'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#f1f5f9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span className={`flex items-center justify-center flex-shrink-0 w-5 h-5 transition-colors duration-200`}>
                    <configItem.icon size={20} />
                  </span>
                  {!collapsed && (
                    <span className="ml-3 text-sm font-medium transition-colors duration-200">{configItem.label}</span>
                  )}
                </div>
                
                {collapsed && (
                  <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-[60]">
                    {configItem.label}
                  </div>
                )}
              </>
            )}
          </NavLink>
        </div>
      </nav>
    </aside>
  );
}
