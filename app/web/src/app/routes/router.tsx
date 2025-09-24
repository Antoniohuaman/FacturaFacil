import { createBrowserRouter } from "react-router-dom";
import AppShell from "../layouts/AppShell";

// Pages por módulo
// import NuevoComprobante from "../../features/comprobantes-electronicos/pages/NuevoComprobante";
import NuevoComprobante from "../../features/comprobantes-electronicos/pages/NuevoComprobante";
import ComprobantesTabs from "../../features/comprobantes-electronicos/pages/ComprobantesTabs";
import ImportarClientesPage from "../../features/gestion-clientes/pages/ImportarClientesPage";
import ControlCajaHome from "../../features/control-caja/pages/Home";
import { Panel } from "../../features/catalogo-articulos/pages/Panel";
import ClientesPage from "../../features/gestion-clientes/pages/ClientesPage";
import ListaPreciosHome from "../../features/lista-precios/pages/Home";
import IndicadoresPage from "../../features/indicadores-negocio/pages/IndicadoresPage";
import ConfiguracionHome from "../../features/configuracion-sistema/pages/Home";

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
  { path: "/", element: <ComprobantesTabs /> },
  { path: "/comprobantes", element: <ComprobantesTabs /> },
  { path: "/comprobantes/nuevo", element: <NuevoComprobante /> },
      { path: "/control-caja", element: <ControlCajaHome /> },
  { path: "/catalogo", element: <Panel /> },
  { path: "/clientes", element: <ClientesPage /> },
  { path: "/importar-clientes", element: <ImportarClientesPage /> },
      { path: "/lista-precios", element: <ListaPreciosHome /> },
  { path: "/indicadores", element: <IndicadoresPage /> },
      { path: "/configuracion", element: <ConfiguracionHome /> },
    ],
  },
]);
