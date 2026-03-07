import type { ReactElement } from "react";
import type { RouteObject } from "react-router-dom";
import { redirect } from "react-router-dom";

import AppShell from "../layouts/PrivateLayout";
import { ProtectedRoute } from "../pages/Private/features/autenticacion";

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
import { ConfiguracionUsuarios } from "../pages/Private/features/configuracion-sistema/paginas/ConfiguracionUsuarios";
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
import { AdministrarEmpresas } from "../pages/Private/features/administracion-empresas/paginas/AdministrarEmpresas";

// Documentos de Negociación
import DocumentosTabs from "../pages/Private/features/Documentos-negociacion/pages/DocumentosTabs";
import FormularioCotizacion from "../pages/Private/features/Documentos-negociacion/pages/FormularioCotizacion";
import FormularioNotaVenta from "../pages/Private/features/Documentos-negociacion/pages/FormularioNotaVenta";

import RouteErrorBoundary from "./RouteErrorBoundary";
import ClientesTestPage from "../pages/Private/features/gestion-clientes/pages/ClientesTestPage";
import { PermisoGuard } from "./PermisoGuard";
import { SinPermiso } from "../pages/Private/SinPermiso";

const showClientesTestPage = import.meta.env.DEV || import.meta.env.VITE_DEV_MODE === "true";

const conPermisos = (element: ReactElement, permisos: string[]) => (
  <PermisoGuard permisos={permisos}>
    {element}
  </PermisoGuard>
);

export const privateRoutes: RouteObject[] = [
  {
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: "/", element: conPermisos(<ComprobantesTabs />, ['ventas.comprobantes.ver']) },
      { path: "/comprobantes", element: conPermisos(<ComprobantesTabs />, ['ventas.comprobantes.ver']) },
      { path: "/comprobantes/nuevo", element: conPermisos(<SelectorModoEmision />, ['ventas.comprobantes.emitir']) },
      { path: "/comprobantes/emision", element: conPermisos(<EmisionTradicional />, ['ventas.comprobantes.emitir']) },
      { path: "/comprobantes/pos", element: conPermisos(<PuntoVenta />, ['ventas.pos.ver', 'ventas.pos.vender']) },

      // Rutas del nuevo módulo Punto de Venta
      {
        path: "/punto-venta",
        loader: ({ request }) => {
          const url = new URL(request.url);
          const search = url.search;
          return redirect(`/punto-venta/nueva-venta${search}`);
        },
      },
      { path: "/punto-venta/dashboard", element: conPermisos(<PuntoVentaHome />, ['ventas.pos.ver', 'ventas.pos.vender']) },
      { path: "/punto-venta/nueva-venta", element: conPermisos(<PuntoVenta />, ['ventas.pos.ver', 'ventas.pos.vender']) },
      { path: "/catalogo", element: conPermisos(<CatalogoArticulosMain />, ['catalogo.ver', 'catalogo.crear', 'catalogo.editar']) },
      { path: "/lista-precios", element: conPermisos(<ListaPrecios />, ['precios.ver', 'precios.editar']) },
      { path: "/inventario", element: conPermisos(<InventoryPage />, ['inventario.ver', 'inventario.ajustar', 'inventario.transferir']) },
      { path: "/control-caja", element: conPermisos(<ControlCajaHome />, ['caja.ver', 'caja.abrir', 'caja.cerrar']) },
      { path: "/caja/sesiones", element: conPermisos(<SesionesCajaPage />, ['caja.ver', 'caja.abrir', 'caja.cerrar']) },
      { path: "/cobranzas", element: conPermisos(<CobranzasDashboard />, ['cobranzas.ver', 'cobranzas.registrar']) },
      
      // Documentos de Negociación
      { path: "/documentos-negociacion", element: conPermisos(<DocumentosTabs />, ['ventas.documentos.ver', 'ventas.documentos.crear']) },
      { path: "/documentos/cotizacion/nueva", element: conPermisos(<FormularioCotizacion />, ['ventas.documentos.crear']) },
      { path: "/documentos/nueva-cotizacion", element: conPermisos(<FormularioCotizacion />, ['ventas.documentos.crear']) },
      { path: "/documentos/nota-venta/nueva", element: conPermisos(<FormularioNotaVenta />, ['ventas.documentos.crear']) },
      { path: "/documentos/nueva-nota-venta", element: conPermisos(<FormularioNotaVenta />, ['ventas.documentos.crear']) },
      
      { path: "/clientes", element: conPermisos(<ClientesPage />, ['clientes.ver', 'clientes.crear', 'clientes.editar']) },
      ...(showClientesTestPage ? [{ path: "/clientes/test-api", element: <ClientesTestPage /> }] : []),
      { path: "/clientes/:clienteId/:clienteName/historial", element: conPermisos(<HistorialCompras />, ['clientes.ver', 'clientes.editar']) },
      { path: "/importar-clientes", element: conPermisos(<ImportarClientesPage />, ['clientes.importar']) },
      { path: "/indicadores", element: conPermisos(<IndicadoresPage />, ['indicadores.ver']) },
      { path: "/administrar-empresas", element: conPermisos(<AdministrarEmpresas />, ['config.panel.ver']) },
      { path: "/configuracion", element: conPermisos(<ConfigurationDashboard />, ['config.panel.ver']) },
      { path: "/configuracion/empresa", element: conPermisos(<CompanyConfiguration />, ['config.empresa.ver', 'config.empresa.editar']) },
      { path: "/configuracion/establecimientos", element: conPermisos(<EstablecimientosConfiguration />, ['config.establecimientos.gestionar']) },
      { path: "/configuracion/almacenes", element: conPermisos(<ConfiguracionAlmacenes />, ['config.almacenes.gestionar']) },
      { path: "/configuracion/usuarios", element: conPermisos(<ConfiguracionUsuarios />, ['config.usuarios.gestionar', 'config.usuarios.accesos.gestionar']) },
      { path: "/configuracion/empleados", loader: () => redirect("/configuracion/usuarios") },
      { path: "/configuracion/series", element: conPermisos(<SeriesConfiguration />, ['config.series.gestionar']) },
      { path: "/configuracion/negocio", element: conPermisos(<BusinessConfiguration />, ['config.negocio.gestionar']) },
      { path: "/configuracion/diseno", element: conPermisos(<VoucherDesignConfigurationNew />, ['config.diseno_comprobante.gestionar']) },
      { path: "/configuracion/cajas", element: conPermisos(<CajasConfiguration />, ['config.cajas.gestionar']) },
      { path: "/configuracion/cajas/new", element: conPermisos(<CajaFormPage />, ['config.cajas.gestionar']) },
      { path: "/configuracion/cajas/:id", element: conPermisos(<CajaFormPage />, ['config.cajas.gestionar']) },
      { path: "/notificaciones", element: conPermisos(<NotificationsCenterPage />, ['notificaciones.ver']) },
      { path: "/sin-permiso", element: <SinPermiso /> },
    ],
  },
];
