import { createBrowserRouter } from "react-router-dom";
import AppShell from "../layouts/AppShell";

// Pages por módulo
// import NuevoComprobante from "../../features/comprobantes-electronicos/pages/NuevoComprobante";
import NuevoComprobante from "../../features/comprobantes-electronicos/pages/NuevoComprobante";
import ComprobantesTabs from "../../features/comprobantes-electronicos/pages/ComprobantesTabs";
import ImportarClientesPage from "../../features/gestion-clientes/pages/ImportarClientesPage";
import HistorialCompras from "../../features/gestion-clientes/pages/HistorialCompras";
import ControlCajaHome from "../../features/control-caja/pages/Home";
import ClientesPage from "../../features/gestion-clientes/pages/ClientesPage";
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
      { path: "/clientes", element: <ClientesPage /> },
  { path: "/clientes/:clienteId/:clienteName/historial", element: <HistorialCompras /> },
  { path: "/importar-clientes", element: <ImportarClientesPage /> },
  { path: "/indicadores", element: <IndicadoresPage /> },
      { path: "/configuracion", element: <ConfiguracionHome /> },
    ],
  },
]);
