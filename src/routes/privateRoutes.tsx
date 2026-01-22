import type { RouteObject } from "react-router-dom";
import { redirect } from "react-router-dom";

import AppShell from "../layouts/PrivateLayout";
import { ProtectedRoute } from "../pages/Private/features/autenticacion/guards/ProtectedRoute";
import { RoleGuard } from "../pages/Private/features/autenticacion/guards/RoleGuard";
import { UserRole } from "../pages/Private/features/autenticacion/types/auth.types";

// Pages por módulo - Comprobantes
import ComprobantesTabs from "../pages/Private/features/comprobantes-electronicos/lista-comprobantes/pages/ComprobantesTabs";
import { SelectorModoEmision } from "../pages/Private/features/comprobantes-electronicos/pages/SelectorModoEmision";
import EmisionTradicional from "../pages/Private/features/comprobantes-electronicos/pages/EmisionTradicional";
import PuntoVenta from "../pages/Private/features/comprobantes-electronicos/punto-venta/pages/PuntoVenta";
import { PuntoVentaHome } from "../pages/Private/features/comprobantes-electronicos/punto-venta/pages/PuntoVentaHome";
import ImportarClientesPage from "../pages/Private/features/gestion-clientes/pages/ImportarClientesPage";
import HistorialCompras from "../pages/Private/features/gestion-clientes/pages/HistorialCompras";
import ControlCajaHome from "../pages/Private/features/control-caja/pages/Home";
import { SesionesCajaPage } from "../pages/Private/features/control-caja/pages/SesionesCajaPage";
import ClientesPage from "../pages/Private/features/gestion-clientes/pages/ClientesPage";
import IndicadoresPage from "../pages/Private/features/indicadores-negocio/pages/IndicadoresPage";
import { ConfigurationDashboard } from "../pages/Private/features/configuracion-sistema/paginas/PanelConfiguracion";
import { CompanyConfiguration } from "../pages/Private/features/configuracion-sistema/paginas/ConfiguracionEmpresa";
import { EstablecimientosConfiguration } from "../pages/Private/features/configuracion-sistema/paginas/ConfiguracionEstablecimientos";
import { ConfiguracionAlmacenes } from "../pages/Private/features/configuracion-sistema/paginas/ConfiguracionAlmacenes";
import { UsersConfiguration } from "../pages/Private/features/configuracion-sistema/paginas/ConfiguracionUsuarios";
import { SeriesConfiguration } from "../pages/Private/features/configuracion-sistema/paginas/ConfiguracionSeries";
import { BusinessConfiguration } from "../pages/Private/features/configuracion-sistema/paginas/ConfiguracionNegocio";
import { VoucherDesignConfigurationNew } from "../pages/Private/features/configuracion-sistema/paginas/ConfiguracionDisenoComprobante";
import { CajasConfiguration } from "../pages/Private/features/configuracion-sistema/paginas/ConfiguracionCajas";
import { CajaFormPage } from "../pages/Private/features/configuracion-sistema/paginas/PaginaFormularioCaja";
import CatalogoArticulosMain from "../pages/Private/features/catalogo-articulos/pages/CatalogoArticulosMain";
import { ListaPrecios } from "../pages/Private/features/lista-precios/components/ListaPrecios";
import { InventoryPage } from "../pages/Private/features/gestion-inventario/pages/InventoryPage";
import CobranzasDashboard from "../pages/Private/features/gestion-cobranzas/pages/CobranzasDashboard";
import NotificationsCenterPage from "../pages/Private/features/notifications/pages/NotificationsCenterPage";

// Documentos de Negociación
import DocumentosTabs from "../pages/Private/features/Documentos-negociacion/pages/DocumentosTabs";
import FormularioCotizacion from "../pages/Private/features/Documentos-negociacion/pages/FormularioCotizacion";
import FormularioNotaVenta from "../pages/Private/features/Documentos-negociacion/pages/FormularioNotaVenta";

import RouteErrorBoundary from "./RouteErrorBoundary";

export const privateRoutes: RouteObject[] = [
  {
    element: (
      <ProtectedRoute requireContext={true}>
        <AppShell />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: "/", element: <ComprobantesTabs /> },
      { path: "/comprobantes", element: <ComprobantesTabs /> },
      { path: "/comprobantes/nuevo", element: <SelectorModoEmision /> },
      { path: "/comprobantes/emision", element: <EmisionTradicional /> },
      { path: "/comprobantes/pos", element: <PuntoVenta /> },

      // Rutas del nuevo módulo Punto de Venta
      {
        path: "/punto-venta",
        loader: ({ request }) => {
          const url = new URL(request.url);
          const search = url.search;
          return redirect(`/punto-venta/nueva-venta${search}`);
        },
      },
      { path: "/punto-venta/dashboard", element: <PuntoVentaHome /> },
      { path: "/punto-venta/nueva-venta", element: <PuntoVenta /> },
      { path: "/catalogo", element: <CatalogoArticulosMain /> },
      { path: "/lista-precios", element: <ListaPrecios /> },
      { path: "/inventario", element: <InventoryPage /> },
      { path: "/control-caja", element: <ControlCajaHome /> },
      { path: "/caja/sesiones", element: <SesionesCajaPage /> },
      { path: "/cobranzas", element: <CobranzasDashboard /> },
      
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
      {
        path: "/configuracion",
        element: (
          <RoleGuard allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]} fallbackPath="/">
            <ConfigurationDashboard />
          </RoleGuard>
        )
      },
      {
        path: "/configuracion/empresa",
        element: (
          <RoleGuard allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]} fallbackPath="/">
            <CompanyConfiguration />
          </RoleGuard>
        )
      },
      {
        path: "/configuracion/establecimientos",
        element: (
          <RoleGuard allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]} fallbackPath="/">
            <EstablecimientosConfiguration />
          </RoleGuard>
        )
      },
      {
        path: "/configuracion/almacenes",
        element: (
          <RoleGuard allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]} fallbackPath="/">
            <ConfiguracionAlmacenes />
          </RoleGuard>
        )
      },
      {
        path: "/configuracion/usuarios",
        element: (
          <RoleGuard allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]} fallbackPath="/">
            <UsersConfiguration />
          </RoleGuard>
        )
      },
      { path: "/configuracion/empleados", loader: () => redirect("/configuracion/usuarios") },
      {
        path: "/configuracion/series",
        element: (
          <RoleGuard allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]} fallbackPath="/">
            <SeriesConfiguration />
          </RoleGuard>
        )
      },
      {
        path: "/configuracion/negocio",
        element: (
          <RoleGuard allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]} fallbackPath="/">
            <BusinessConfiguration />
          </RoleGuard>
        )
      },
      {
        path: "/configuracion/diseno",
        element: (
          <RoleGuard allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]} fallbackPath="/">
            <VoucherDesignConfigurationNew />
          </RoleGuard>
        )
      },
      {
        path: "/configuracion/cajas",
        element: (
          <RoleGuard allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]} fallbackPath="/">
            <CajasConfiguration />
          </RoleGuard>
        )
      },
      {
        path: "/configuracion/cajas/new",
        element: (
          <RoleGuard allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]} fallbackPath="/">
            <CajaFormPage />
          </RoleGuard>
        )
      },
      {
        path: "/configuracion/cajas/:id",
        element: (
          <RoleGuard allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]} fallbackPath="/">
            <CajaFormPage />
          </RoleGuard>
        )
      },
      { path: "/notificaciones", element: <NotificationsCenterPage /> },
    ],
  },
];
