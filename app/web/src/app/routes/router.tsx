import { createBrowserRouter } from "react-router-dom";
import AppShell from "../layouts/AppShell";

// Pages por módulo
import ComprobantesPanel from "../../features/comprobantes-electronicos/pages/Panel";
import ControlCajaHome from "../../features/control-caja/pages/Home";
import { Panel } from "../../features/catalogo-articulos/pages/Panel";
import ClientesHome from "../../features/gestion-clientes/pages/Home";
import ListaPreciosHome from "../../features/lista-precios/pages/Home";
import IndicadoresHome from "../../features/indicadores-negocio/pages/Home";
import ConfiguracionHome from "../../features/configuracion-sistema/pages/Home";

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <ComprobantesPanel /> },
      { path: "/comprobantes/panel", element: <ComprobantesPanel /> },
      { path: "/control-caja", element: <ControlCajaHome /> },
  { path: "/catalogo", element: <Panel /> },
      { path: "/clientes", element: <ClientesHome /> },
      { path: "/lista-precios", element: <ListaPreciosHome /> },
      { path: "/indicadores", element: <IndicadoresHome /> },
      { path: "/configuracion", element: <ConfiguracionHome /> },
    ],
  },
]);
