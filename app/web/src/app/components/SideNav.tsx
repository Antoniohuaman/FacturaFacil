
import { NavLink } from "react-router-dom";
import { useState } from "react";

const items = [
  { to: "/comprobantes/panel", label: "Comprobantes", icon: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 12h6M9 16h6M9 8h6" /><path d="M8 2v4M16 2v4" /></svg>
  ) },
  { to: "/control-caja", label: "Control de Caja", icon: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="13" rx="2" /><path d="M16 3v4M8 3v4M2 10h20" /><circle cx="12" cy="15" r="2" /></svg>
  ) },
  { to: "/catalogo", label: "Catálogo", icon: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 8h10M7 12h10M7 16h6" /></svg>
  ) },
  { to: "/clientes", label: "Clientes", icon: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20v-2a4 4 0 014-4h8a4 4 0 014 4v2" /></svg>
  ) },
  { to: "/lista-precios", label: "Lista de Precios", icon: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 12h8M8 16h6" /><path d="M8 8h8" /><circle cx="16" cy="16" r="1.5" /></svg>
  ) },
  { to: "/indicadores", label: "Indicadores", icon: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M3 17v-2a4 4 0 014-4h10a4 4 0 014 4v2" /><rect x="7" y="10" width="2" height="7" rx="1" /><rect x="11" y="7" width="2" height="10" rx="1" /><rect x="15" y="13" width="2" height="4" rx="1" /></svg>
  ) },
  { to: "/configuracion", label: "Configuración", icon: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33h.09a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51h.09a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.09a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
  ) },
];

export default function SideNav() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside className={`h-full flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}>
      {/* Botón de colapso/expandir */}
      <button
        className="mx-auto my-2 p-1 rounded hover:bg-slate-100 transition-colors"
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
      >
        <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          {collapsed
            ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            : <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />}
        </svg>
      </button>
      <nav className="flex-1 flex flex-col gap-1 mt-2">
        {items.map(it => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium transition-colors duration-200 group ${
                isActive
                  ? 'bg-rose-50 text-rose-600'
                  : 'text-slate-700 hover:bg-slate-100'
              } ${collapsed ? 'justify-center px-0' : ''}`
            }
            title={collapsed ? it.label : undefined}
          >
            <span className="w-6 h-6 flex items-center justify-center">
              {it.icon}
            </span>
            {!collapsed && <span>{it.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
