import { createBrowserRouter } from "react-router-dom";
import AppShell from "../layouts/AppShell";
import { authRoutes } from "../../features/autenticacion/routes";

// Pages por módulo - Comprobantes
import ComprobantesTabs from "../../features/comprobantes-electronicos/lista-comprobantes/pages/ComprobantesTabs";
import { SelectorModoEmision } from "../../features/comprobantes-electronicos/pages/SelectorModoEmision";
import EmisionTradicional from "../../features/comprobantes-electronicos/pages/EmisionTradicional";
import PuntoVenta from "../../features/comprobantes-electronicos/punto-venta/pages/PuntoVenta";
import { PuntoVentaHome } from "../../features/comprobantes-electronicos/punto-venta/pages/PuntoVentaHome";
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
import { VoucherDesignConfigurationNew } from "../../features/configuracion-sistema/pages/VoucherDesignConfigurationNew";
import CatalogoArticulosMain from "../../features/catalogo-articulos/pages/CatalogoArticulosMain";
import { ListaPrecios } from "../../features/lista-precios/components/ListaPrecios";
import { InventoryPage } from "../../features/gestion-inventario/pages/InventoryPage";

import RouteErrorBoundary from "./RouteErrorBoundary";

// Documentos de Negociación
import DocumentosTabs from "../../features/Documentos-negociacion/pages/DocumentosTabs";
import FormularioCotizacion from "../../features/Documentos-negociacion/pages/FormularioCotizacion";
import FormularioNotaVenta from "../../features/Documentos-negociacion/pages/FormularioNotaVenta";

export const router = createBrowserRouter([
  // Rutas de autenticación (públicas)
  ...authRoutes,

  // Rutas de la aplicación (protegidas)
  {
    element: <AppShell />,
    errorElement: <RouteErrorBoundary />,
    children: [
  { path: "/", element: <ComprobantesTabs /> },
  { path: "/comprobantes", element: <ComprobantesTabs /> },
  { path: "/comprobantes/nuevo", element: <SelectorModoEmision /> },
  { path: "/comprobantes/emision", element: <EmisionTradicional /> },
  { path: "/comprobantes/pos", element: <PuntoVenta /> },

  // Rutas del nuevo módulo Punto de Venta
  { path: "/punto-venta", element: <PuntoVentaHome /> },
  { path: "/punto-venta/nueva-venta", element: <PuntoVenta /> },
      { path: "/catalogo", element: <CatalogoArticulosMain /> },
      { path: "/lista-precios", element: <ListaPrecios /> },
      { path: "/inventario", element: <InventoryPage /> },
      // Nota: ruta "/documentos-comerciales" eliminada porque el módulo fue removido
      { path: "/control-caja", element: <ControlCajaHome /> },
      
      // Documentos de Negociación
      { path: "/documentos-negociacion", element: <DocumentosTabs /> },
      { path: "/documentos/cotizacion/nueva", element: <FormularioCotizacion /> },
      { path: "/documentos/nueva-cotizacion", element: <FormularioCotizacion /> },
      { path: "/documentos/nota-venta/nueva", element: <FormularioNotaVenta /> },
      { path: "/documentos/nueva-nota-venta", element: <FormularioNotaVenta /> },
      
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
      { path: "/configuracion/diseno", element: <VoucherDesignConfigurationNew /> },
    ],
  },
]);
