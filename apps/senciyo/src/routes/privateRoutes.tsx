import { lazy, type ReactElement } from "react";
import type { RouteObject } from "react-router-dom";
import { redirect } from "react-router-dom";

import AppShell from "../layouts/PrivateLayout";
import { ProtectedRoute } from "../pages/Private/features/autenticacion";

// Página de aterrizaje post-login ("/" y "/comprobantes") - eager a propósito
import ComprobantesTabs from "../pages/Private/features/comprobantes-electronicos/lista-comprobantes/pages/ComprobantesTabs";

// Pages por módulo - Comprobantes (diferidas: no forman parte del primer render)
const SelectorModoEmision = lazy(() =>
  import("../pages/Private/features/comprobantes-electronicos/pages/SelectorModoEmision").then((m) => ({ default: m.SelectorModoEmision }))
);
const EmisionTradicional = lazy(() => import("../pages/Private/features/comprobantes-electronicos/pages/EmisionTradicional"));
const PuntoVenta = lazy(() => import("../pages/Private/features/comprobantes-electronicos/punto-venta/pages/PuntoVenta"));
const ImportarClientesPage = lazy(() => import("../pages/Private/features/gestion-clientes/pages/ImportarClientesPage"));
const HistorialCompras = lazy(() => import("../pages/Private/features/gestion-clientes/pages/HistorialCompras"));
const ControlCajaHome = lazy(() => import("../pages/Private/features/control-caja/pages/Home"));
const SesionesCajaPage = lazy(() =>
  import("../pages/Private/features/control-caja/pages/SesionesCajaPage").then((m) => ({ default: m.SesionesCajaPage }))
);
const ClientesPage = lazy(() => import("../pages/Private/features/gestion-clientes/pages/ClientesPage"));
const IndicadoresPage = lazy(() => import("../pages/Private/features/indicadores-negocio/pages/IndicadoresPage"));
const ConfigurationDashboard = lazy(() =>
  import("../pages/Private/features/configuracion-sistema/paginas/PanelConfiguracion").then((m) => ({ default: m.ConfigurationDashboard }))
);
const CompanyConfiguration = lazy(() =>
  import("../pages/Private/features/configuracion-sistema/paginas/ConfiguracionEmpresa").then((m) => ({ default: m.CompanyConfiguration }))
);
const EstablecimientosConfiguration = lazy(() =>
  import("../pages/Private/features/configuracion-sistema/paginas/ConfiguracionEstablecimientos").then((m) => ({ default: m.EstablecimientosConfiguration }))
);
const ConfiguracionAlmacenes = lazy(() =>
  import("../pages/Private/features/configuracion-sistema/paginas/ConfiguracionAlmacenes").then((m) => ({ default: m.ConfiguracionAlmacenes }))
);
const ConfiguracionUsuarios = lazy(() =>
  import("../pages/Private/features/configuracion-sistema/paginas/ConfiguracionUsuarios").then((m) => ({ default: m.ConfiguracionUsuarios }))
);
const SeriesConfiguration = lazy(() =>
  import("../pages/Private/features/configuracion-sistema/paginas/ConfiguracionSeries").then((m) => ({ default: m.SeriesConfiguration }))
);
const BusinessConfiguration = lazy(() =>
  import("../pages/Private/features/configuracion-sistema/paginas/ConfiguracionNegocio").then((m) => ({ default: m.BusinessConfiguration }))
);
const VoucherDesignConfigurationNew = lazy(() =>
  import("../pages/Private/features/configuracion-sistema/paginas/ConfiguracionDisenoComprobante").then((m) => ({ default: m.VoucherDesignConfigurationNew }))
);
const CajasConfiguration = lazy(() =>
  import("../pages/Private/features/configuracion-sistema/paginas/ConfiguracionCajas").then((m) => ({ default: m.CajasConfiguration }))
);
const CajaFormPage = lazy(() =>
  import("../pages/Private/features/configuracion-sistema/paginas/PaginaFormularioCaja").then((m) => ({ default: m.CajaFormPage }))
);
const ConfiguracionConexionSunat = lazy(() =>
  import("../pages/Private/features/configuracion-sistema/paginas/ConfiguracionConexionSunat").then((m) => ({ default: m.ConfiguracionConexionSunat }))
);
const ConfiguracionTransporte = lazy(() =>
  import("../pages/Private/features/configuracion-sistema/paginas/ConfiguracionTransporte").then((m) => ({ default: m.ConfiguracionTransporte }))
);
const CatalogoArticulosMain = lazy(() => import("../pages/Private/features/catalogo-articulos/pages/CatalogoArticulosMain"));
const ListaPrecios = lazy(() =>
  import("../pages/Private/features/lista-precios/components/ListaPrecios").then((m) => ({ default: m.ListaPrecios }))
);
const InventoryPage = lazy(() =>
  import("../pages/Private/features/gestion-inventario/pages/InventoryPage").then((m) => ({ default: m.InventoryPage }))
);
const CobranzasDashboard = lazy(() => import("../pages/Private/features/gestion-cobranzas/pages/CobranzasDashboard"));
const NotificationsCenterPage = lazy(() => import("../pages/Private/features/notifications/pages/NotificationsCenterPage"));
const AdministrarEmpresas = lazy(() =>
  import("../pages/Private/features/administracion-empresas/paginas/AdministrarEmpresas").then((m) => ({ default: m.AdministrarEmpresas }))
);

// Documentos Comerciales (nuevo módulo) - diferido
const DocumentosComerciales = lazy(() => import("../pages/Private/features/documentos-comerciales/pages/DocumentosComerciales"));
const FormularioDocumentoComercialPage = lazy(() => import("../pages/Private/features/documentos-comerciales/pages/FormularioDocumentoComercialPage"));
const DocumentosComercialesLayout = lazy(() => import("../pages/Private/features/documentos-comerciales/pages/DocumentosComercialesLayout"));

// Compras - diferido
const PaginaCompras = lazy(() => import("../pages/Private/features/compras/paginas/PaginaCompras"));
const PaginaRegistrarPagoCompra = lazy(() => import("../pages/Private/features/compras/paginas/PaginaRegistrarPagoCompra"));
const ComprasLayout = lazy(() => import("../pages/Private/features/compras/paginas/ComprasLayout"));

// Guías de Remisión - diferido
const GuiasRemision = lazy(() => import("../pages/Private/features/guias-remision/paginas/GuiasRemision"));
const FormularioGREPage = lazy(() => import("../pages/Private/features/guias-remision/paginas/FormularioGREPage"));
const GuiasRemisionLayout = lazy(() => import("../pages/Private/features/guias-remision/paginas/GuiasRemisionLayout"));

// Gastos - diferido
const PaginaGastos = lazy(() => import("../pages/Private/features/gastos/paginas/PaginaGastos"));
const GastosLayout = lazy(() => import("../pages/Private/features/gastos/paginas/GastosLayout"));

import RouteErrorBoundary from "./RouteErrorBoundary";
import { PermisoGuard } from "./PermisoGuard";
import { SinPermiso } from "../pages/Private/SinPermiso";

// Página de prueba solo-dev - diferida
const ClientesTestPage = lazy(() => import("../pages/Private/features/gestion-clientes/pages/ClientesTestPage"));

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
      { path: "/punto-venta/nueva-venta", element: conPermisos(<PuntoVenta />, ['ventas.pos.ver', 'ventas.pos.vender']) },
      { path: "/catalogo", element: conPermisos(<CatalogoArticulosMain />, ['catalogo.ver', 'catalogo.crear', 'catalogo.editar']) },
      { path: "/lista-precios", element: conPermisos(<ListaPrecios />, ['precios.ver', 'precios.editar']) },
      { path: "/inventario", element: conPermisos(<InventoryPage />, ['inventario.ver', 'inventario.ajustar', 'inventario.transferir']) },
      { path: "/control-caja", element: conPermisos(<ControlCajaHome />, ['caja.ver', 'caja.abrir', 'caja.cerrar']) },
      { path: "/caja/sesiones", element: conPermisos(<SesionesCajaPage />, ['caja.ver', 'caja.abrir', 'caja.cerrar']) },
      { path: "/cobranzas", element: conPermisos(<CobranzasDashboard />, ['cobranzas.ver', 'cobranzas.registrar']) },

      // Documentos Comerciales — layout route garantiza el provider para todas las rutas hijas
      {
        element: <DocumentosComercialesLayout />,
        children: [
          { path: "/documentos-comerciales", element: conPermisos(<DocumentosComerciales />, ['ventas.documentos.ver', 'ventas.documentos.crear']) },
          { path: "/documentos-comerciales/nuevo/:tipo", element: conPermisos(<FormularioDocumentoComercialPage />, ['ventas.documentos.crear']) },
          { path: "/documentos-comerciales/editar/:id", element: conPermisos(<FormularioDocumentoComercialPage />, ['ventas.documentos.editar']) },
        ],
      },

      // Guías de Remisión — layout route garantiza el provider GRE para todas las rutas hijas
      {
        element: <GuiasRemisionLayout />,
        children: [
          { path: "/guias-remision", element: conPermisos(<GuiasRemision />, ['ventas.gre.ver']) },
          { path: "/guias-remision/nuevo/:tipoParam", element: conPermisos(<FormularioGREPage />, ['ventas.gre.emitir']) },
          { path: "/guias-remision/editar/:id", element: conPermisos(<FormularioGREPage />, ['ventas.gre.emitir']) },
          { path: "/guias-remision/:id", element: conPermisos(<GuiasRemision />, ['ventas.gre.ver']) },
        ],
      },
      
      { path: "/clientes", element: conPermisos(<ClientesPage />, ['clientes.ver', 'clientes.crear', 'clientes.editar']) },
      ...(showClientesTestPage ? [{ path: "/clientes/test-api", element: <ClientesTestPage /> }] : []),
      { path: "/clientes/:clienteId/:clienteName/historial", element: conPermisos(<HistorialCompras />, ['clientes.ver', 'clientes.editar']) },
      { path: "/importar-clientes", element: conPermisos(<ImportarClientesPage />, ['clientes.importar']) },
      { path: "/indicadores", element: conPermisos(<IndicadoresPage />, ['indicadores.ver']) },
      // Rentabilidad de ventas ahora vive dentro de Indicadores (pestaña "Rentabilidad") — la
      // ruta anterior se conserva como alias, nunca como una segunda página productiva. Preserva
      // todos los parámetros reales (autoExport, from, to, EstablecimientoId, returnTo, etc.).
      {
        path: "/indicadores/reportes/rentabilidad-ventas",
        loader: ({ request }) => {
          const url = new URL(request.url);
          url.searchParams.set("view", "rentabilidad");
          return redirect(`/indicadores?${url.searchParams.toString()}`);
        },
      },
      { path: "/administrar-empresas", element: conPermisos(<AdministrarEmpresas />, ['config.panel.ver']) },
      { path: "/configuracion", element: conPermisos(<ConfigurationDashboard />, ['config.panel.ver']) },
      { path: "/configuracion/empresa", element: conPermisos(<CompanyConfiguration />, ['config.empresa.ver', 'config.empresa.editar']) },
      { path: "/configuracion/establecimientos", element: conPermisos(<EstablecimientosConfiguration />, ['config.establecimientos.gestionar']) },
      { path: "/configuracion/almacenes", element: conPermisos(<ConfiguracionAlmacenes />, ['config.almacenes.gestionar']) },
      { path: "/configuracion/usuarios", element: conPermisos(<ConfiguracionUsuarios />, ['config.usuarios.gestionar', 'config.usuarios.accesos.gestionar']) },
      { path: "/configuracion/empleados", loader: () => redirect("/configuracion/usuarios") },
      { path: "/configuracion/series", element: conPermisos(<SeriesConfiguration />, ['config.series.gestionar']) },
      { path: "/configuracion/negocio", element: conPermisos(<BusinessConfiguration />, ['config.negocio.gestionar', 'gastos.categorias.gestionar']) },
      { path: "/configuracion/diseno", element: conPermisos(<VoucherDesignConfigurationNew />, ['config.diseno_comprobante.gestionar']) },
      { path: "/configuracion/cajas", element: conPermisos(<CajasConfiguration />, ['config.cajas.gestionar']) },
      { path: "/configuracion/cajas/new", element: conPermisos(<CajaFormPage />, ['config.cajas.gestionar']) },
      { path: "/configuracion/cajas/:id", element: conPermisos(<CajaFormPage />, ['config.cajas.gestionar']) },
      { path: "/configuracion/conexion-sunat", element: conPermisos(<ConfiguracionConexionSunat />, ['config.conexion-sunat.gestionar']) },
      { path: "/configuracion/transporte", element: conPermisos(<ConfiguracionTransporte />, ['config.transporte.gestionar']) },
      // Compras — layout route garantiza el provider para todas las rutas hijas
      {
        element: <ComprasLayout />,
        children: [
          { path: "/compras", element: conPermisos(<PaginaCompras />, ['compras.ordenes.ver']) },
          { path: "/compras/pagos/nuevo", element: conPermisos(<PaginaRegistrarPagoCompra />, ['compras.ordenes.ver']) },
        ],
      },
      // Gastos — layout route garantiza el provider para todas las rutas hijas
      {
        element: <GastosLayout />,
        children: [
          { path: "/gastos", element: conPermisos(<PaginaGastos />, ['gastos.ver']) },
        ],
      },
      { path: "/notificaciones", element: conPermisos(<NotificationsCenterPage />, ['notificaciones.ver']) },
      { path: "/sin-permiso", element: <SinPermiso /> },
    ],
  },
];
