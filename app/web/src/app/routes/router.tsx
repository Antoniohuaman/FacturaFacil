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
import { ConfigurationDashboard } from "../../features/configuracion-sistema/pages/ConfigurationDashboard";
import { CompanyConfiguration } from "../../features/configuracion-sistema/pages/CompanyConfiguration";
import { EstablishmentsConfiguration } from "../../features/configuracion-sistema/pages/EstablishmentsConfiguration";
import { EmployeesConfiguration } from "../../features/configuracion-sistema/pages/EmployeesConfiguration";
import { SeriesConfiguration } from "../../features/configuracion-sistema/pages/SeriesConfiguration";
import { BusinessConfiguration } from "../../features/configuracion-sistema/pages/BusinessConfiguration";
import { VoucherDesignConfiguration } from "../../features/configuracion-sistema/pages/VoucherDesignConfiguration";
import CatalogoArticulosMain from "../../features/catalogo-articulos/pages/CatalogoArticulosMain";
import { ListaPrecios } from "../../features/lista-precios/components/ListaPrecios";

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
  { path: "/", element: <ComprobantesTabs /> },
  { path: "/comprobantes", element: <ComprobantesTabs /> },
  { path: "/comprobantes/nuevo", element: <NuevoComprobante /> },
      { path: "/catalogo", element: <CatalogoArticulosMain /> },
      { path: "/lista-precios", element: <ListaPrecios /> },
      { path: "/control-caja", element: <ControlCajaHome /> },
      { path: "/clientes", element: <ClientesPage /> },
  { path: "/clientes/:clienteId/:clienteName/historial", element: <HistorialCompras /> },
  { path: "/importar-clientes", element: <ImportarClientesPage /> },
  { path: "/indicadores", element: <IndicadoresPage /> },
      { path: "/configuracion", element: <ConfigurationDashboard /> },
      { path: "/configuracion/empresa", element: <CompanyConfiguration /> },
      { path: "/configuracion/establecimientos", element: <EstablishmentsConfiguration /> },
      { path: "/configuracion/empleados", element: <EmployeesConfiguration /> },
      { path: "/configuracion/series", element: <SeriesConfiguration /> },
      { path: "/configuracion/negocio", element: <BusinessConfiguration /> },
      { path: "/configuracion/diseno", element: <VoucherDesignConfiguration /> },
    ],
  },
]);
