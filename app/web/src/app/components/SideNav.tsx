
import { NavLink } from "react-router-dom";
import { FileText, Package, DollarSign, ShoppingCart, Users, BarChart3, Settings, Receipt, Wallet } from "lucide-react";
import CompanySelector from "../../components/CompanySelector";
import { useUserSession } from "../../contexts/UserSessionContext";

interface SideNavProps {
  collapsed?: boolean;
}

const mainItems = [
  {
    to: "/comprobantes",
    label: "Comprobantes",
    description: "Facturación detallada",
    badge: "12",
    icon: FileText
  },
  {
    to: "/punto-venta",
    label: "Punto de Venta",
    description: "Ventas rápidas",
    badge: "Rápido",
    badgeColor: "emerald",
    icon: ShoppingCart
  },
  {
    to: "/documentos-comerciales",
    label: "Documentos",
    description: "Cotizaciones y notas de venta",
    icon: Receipt
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
    icon: Wallet
  },
  { 
    to: "/clientes", 
    label: "Clientes", 
    description: "Base de datos",
    icon: Users
  },
  { 
    to: "/indicadores", 
    label: "Indicadores", 
    description: "Analytics y KPIs",
    icon: BarChart3
  },
];

// Módulos secundarios/administrativos (aparecen al final del sidebar)
const secondaryItems = [
  { 
    to: "/configuracion", 
    label: "Configuración", 
    description: "Ajustes del sistema",
    icon: Settings
  },
];

export default function SideNav({ collapsed = false }: SideNavProps) {
  const { session } = useUserSession();
  const currentCompany = session?.currentCompany;
  const currentEstablishment = session?.currentEstablishment;

  // Obtener iniciales de la empresa para el botón compacto
  const companyName = currentCompany?.tradeName || currentCompany?.businessName || 'Empresa';
  const companyInitials = companyName
    .split(' ').slice(0, 2).map((word: string) => word[0]).join('').toUpperCase();

  const companyTitle = currentCompany && currentEstablishment
    ? `${companyName} - ${currentEstablishment.name}`
    : 'Sin empresa seleccionada';

  return (
    <aside
      className={`h-full flex flex-col bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-gray-700 transition-all duration-300 shadow-sm overflow-hidden`}
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
      {/* Header con título */}
      <div className="p-2 border-b border-gray-100/50 dark:border-gray-700/50">
        <div className="flex items-center justify-center">
          {/* Título removido para simplificar */}
        </div>
      </div>

      {/* Selector de empresa - MOVIDO MÁS ARRIBA */}
      {!collapsed ? (
        <div className="border-b border-gray-100/50 dark:border-gray-700/50">
          <div className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-4 pt-3">
            Mi empresa y sucursal
          </div>
          <CompanySelector />
        </div>
      ) : (
        /* Versión compacta del selector cuando está contraído */
        <div className="p-2 border-b border-gray-100/50 dark:border-gray-700/50 flex justify-center">
          <div className="relative">
            <button
              className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm transition-all duration-200"
              title={companyTitle}
            >
              {companyInitials}
            </button>
            {/* Indicador de empresa activa */}
            {session && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>}
          </div>
        </div>
      )}
      
      {/* Navegación principal */}
      <nav className="flex-1 flex flex-col p-2 overflow-y-auto overscroll-contain">
        {!collapsed && (
          <div className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-4 px-2 pt-4">
            Módulos Principales
          </div>
        )}
        
        <div className="space-y-1 mt-2">
          {mainItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={() =>
              `flex items-center rounded-lg transition-all group relative ${
                collapsed ? 'justify-center p-3 mx-1' : 'px-1 py-1'
              }`
            }
            title={collapsed ? `${item.label}` : undefined}
          >
            {({ isActive }) => (
              <>
                <div
                  className={`w-full flex items-center rounded-lg transition-colors duration-150 ${
                    collapsed ? 'justify-center p-3' : 'px-4 py-2.5'
                  } ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-700/50'
                      : 'text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700/70 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  style={{
                    minHeight: '40px'
                  }}
                >
                  <span className={`flex items-center justify-center flex-shrink-0 w-5 h-5 transition-colors duration-150`}>
                    <item.icon size={20} />
                  </span>
                  
                  {!collapsed && (
                    <>
                      <span className="ml-3 text-sm font-medium transition-colors duration-200">{item.label}</span>
                      
                      {item.badge && (
                        <span className={`ml-auto px-2 py-1 text-xs font-medium rounded-full transition-colors duration-200 ${
                          item.badgeColor === 'green'
                            ? 'bg-green-100 text-green-700'
                            : item.badgeColor === 'emerald'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
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

        {/* Separador y módulos secundarios al final */}
        <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-1">
            {secondaryItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={() =>
                  `flex items-center rounded-lg transition-all group relative ${
                    collapsed ? 'justify-center p-3 mx-1' : 'px-1 py-1'
                  }`
                }
                title={collapsed ? `${item.label}` : undefined}
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={`w-full flex items-center rounded-lg transition-colors duration-150 ${
                        collapsed ? 'justify-center p-3' : 'px-4 py-2.5'
                      } ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-700/50'
                          : 'text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700/70 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      style={{
                        minHeight: '40px'
                      }}
                    >
                      <span className={`flex items-center justify-center flex-shrink-0 w-5 h-5 transition-colors duration-150`}>
                        <item.icon size={20} />
                      </span>
                      
                      {!collapsed && (
                        <span className="ml-3 text-sm font-medium transition-colors duration-200">{item.label}</span>
                      )}
                    </div>
                    
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
        </div>
      </nav>
    </aside>
  );
}
