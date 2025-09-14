import { NavLink } from "react-router-dom";

const items = [
  { to: "/comprobantes/panel", label: "Comprobantes" },
  { to: "/control-caja",       label: "Control de Caja" },
  { to: "/catalogo",           label: "Catálogo" },
  { to: "/clientes",           label: "Clientes" },
  { to: "/lista-precios",      label: "Lista de Precios" },
  { to: "/indicadores",        label: "Indicadores" },
  { to: "/configuracion",      label: "Configuración" },
];

export default function SideNav() {
  return (
    <nav className="space-y-1 p-2">
      {items.map(it => (
        <NavLink
          key={it.to}
          to={it.to}
          className={({ isActive }) =>
            `block rounded-md px-3 py-2 text-sm ${
              isActive
                ? "bg-blue-600 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`
          }
        >
          {it.label}
        </NavLink>
      ))}
    </nav>
  );
}
