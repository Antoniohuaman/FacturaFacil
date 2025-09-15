import { createBrowserRouter } from "react-router-dom";
import AppShell from "../layouts/AppShell";

// Pages por módulo
// import NuevoComprobante from "../../features/comprobantes-electronicos/pages/NuevoComprobante";
import NuevoComprobante from "../../features/comprobantes-electronicos/pages/NuevoComprobante";
import InvoiceListDashboard from "../../features/comprobantes-electronicos/pages/ListaComprobantes";
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
  { path: "/", element: <InvoiceListDashboard /> },
  { path: "/comprobantes", element: <InvoiceListDashboard /> },
  { path: "/comprobantes/nuevo", element: <NuevoComprobante /> },
      { path: "/control-caja", element: <ControlCajaHome /> },
  { path: "/catalogo", element: <Panel /> },
      { path: "/clientes", element: <ClientesHome /> },
      { path: "/lista-precios", element: <ListaPreciosHome /> },
      { path: "/indicadores", element: <IndicadoresHome /> },
      { path: "/configuracion", element: <ConfiguracionHome /> },
    ],
  },
]);
