
import { NavLink } from "react-router-dom";
import { useState } from "react";
import SidebarHeader from "../../components/SidebarHeader";

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

export default function SideNav() {
  const empresa = {
    logoUrl: "/starbucks-logo.png",
    razonSocial: "Mi Empresa SAC",
    ruc: "20123456789",
    multiEmpresa: true,
  };
  const usuario = {
    nombre: "Antonio Huamán",
    rol: "Administrador",
  };
  const [collapsed, setCollapsed] = useState(false);
  const [showEmpresaModal, setShowEmpresaModal] = useState(false);

  const handleEmpresaChange = () => {
    setShowEmpresaModal(true);
  };

  const empresasDisponibles = [
    { 
      id: 1, 
      razonSocial: "Mi Empresa SAC", 
      ruc: "20123456789",
      activa: true,
      descripcion: "Empresa principal - Retail"
    },
    { 
      id: 2, 
      razonSocial: "Comercial López EIRL", 
      ruc: "20987654321",
      activa: false,
      descripcion: "Distribución mayorista"
    },
    { 
      id: 3, 
      razonSocial: "Distribuidora Central S.A.", 
      ruc: "20456789123",
      activa: false,
      descripcion: "Logística y distribución"
    }
  ];

  const seleccionarEmpresa = (empresaSeleccionada: typeof empresasDisponibles[0]) => {
    setShowEmpresaModal(false);
    alert(`Cambiando a: ${empresaSeleccionada.razonSocial}\n\n(Aquí se implementaría el cambio real de empresa, actualización de contexto y recarga de datos)`);
  };

  return (
    <aside className={`h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white border-r border-slate-200 transition-all duration-300 shadow-sm ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Header con información de empresa */}
      <SidebarHeader 
        empresa={empresa} 
        usuario={usuario} 
        collapsed={collapsed} 
        onEmpresaChange={handleEmpresaChange}
      />
      
      {/* Botón de colapso minimalista */}
      <div className="px-4 py-3 border-b border-slate-100">
        <button
          className={`w-full flex items-center p-3 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors duration-200 rounded-lg ${
            collapsed ? 'justify-center' : 'justify-between'
          }`}
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          <div className="flex items-center">
            <svg 
              className={`w-4 h-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              strokeWidth={2} 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            
            {!collapsed && (
              <span className="ml-3 text-sm font-medium">Colapsar</span>
            )}
          </div>
        </button>
      </div>

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
              `flex items-center gap-4 px-4 py-4 text-base transition-colors duration-200 group ${
                isActive
                  ? 'text-slate-900 bg-slate-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              } ${collapsed ? 'justify-center px-3' : ''}`
            }
            title={collapsed ? `${item.label}` : undefined}
          >
            <span className="flex items-center justify-center flex-shrink-0 w-6 h-6">
              {item.icon}
            </span>
            
            {!collapsed && (
              <span className="font-medium text-base">{item.label}</span>
            )}
            
            {!collapsed && item.badge && (
              <span className={`ml-auto px-3 py-1 text-sm font-medium rounded-full ${
                item.badgeColor === 'green' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {item.badge}
              </span>
            )}
            
            {collapsed && item.badge && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
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
              `flex items-center gap-4 px-4 py-4 text-base transition-colors duration-200 group ${
                isActive
                  ? 'text-slate-900 bg-slate-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              } ${collapsed ? 'justify-center px-3' : ''}`
            }
            title={collapsed ? `${configItem.label}` : undefined}
          >
            <span className="flex items-center justify-center flex-shrink-0 w-6 h-6">
              {configItem.icon}
            </span>
            {!collapsed && (
              <span className="font-medium text-base">{configItem.label}</span>
            )}
          </NavLink>
        </div>
      </nav>

      {/* Modal de selección de empresa */}
      {showEmpresaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-96 max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Seleccionar Empresa</h3>
              
              <div className="space-y-3">
                {empresasDisponibles.map((empresa) => (
                  <button
                    key={empresa.id}
                    onClick={() => seleccionarEmpresa(empresa)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                      empresa.activa
                        ? 'border-blue-200 bg-blue-50 hover:bg-blue-100'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          {empresa.razonSocial}
                          {empresa.activa && (
                            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                              Activa
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">RUC: {empresa.ruc}</div>
                        <div className="text-xs text-gray-400 mt-1">{empresa.descripcion}</div>
                      </div>
                      <div className="ml-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowEmpresaModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
