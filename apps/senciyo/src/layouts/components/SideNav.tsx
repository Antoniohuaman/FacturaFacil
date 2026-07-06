import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "@/contasis";
import type { Module } from "@/contasis";
import { useComprobanteContext } from "../../pages/Private/features/comprobantes-electronicos/lista-comprobantes/contexts/ComprobantesListContext";
import { useDocumentosComercialesContextOpcional } from "../../pages/Private/features/documentos-comerciales/contexts/DocumentosComercialesContext";
import { useGuiasRemisionOpcional } from "../../pages/Private/features/guias-remision/contexto/ContextoGuiasRemision";
import { useTheme } from "../../contexts/ThemeContext";
import { useConfigurationContext } from "../../pages/Private/features/configuracion-sistema/contexto/ContextoConfiguracion";
import { useUserSession } from "../../contexts/UserSessionContext";
import { obtenerUsuarioDesdeSesion, tieneAlgunoDePermisos } from "../../pages/Private/features/configuracion-sistema/utilidades/permisos";

interface SideNavProps {
  collapsed?: boolean;
}

export default function SideNav({ collapsed = false }: SideNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const { session } = useUserSession();
  const { state: configuracionState, rolesConfigurados } = useConfigurationContext();

  // Obtener conteo de comprobantes del contexto
  const { state: comprobantesState } = useComprobanteContext();
  const comprobantesCount = comprobantesState.comprobantes.length;

  // Obtener conteo de documentos comerciales (nuevo módulo — solo disponible dentro de sus rutas)
  const documentosComercialesCtx = useDocumentosComercialesContextOpcional();
  const documentosComercialesCount = documentosComercialesCtx
    ? documentosComercialesCtx.state.documentos.filter((d) => !d.esBorrador).length
    : 0;

  // Obtener conteo de guías de remisión (solo disponible dentro de sus rutas)
  const guiasRemisionCtx = useGuiasRemisionOpcional();
  const guiasRemisionCount = guiasRemisionCtx
    ? guiasRemisionCtx.state.guias.filter((g) => !g.esBorrador).length
    : 0;

  // Determinar el módulo activo basado en la ruta
  const [activeModule, setActiveModule] = useState<string>("");

  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/comprobantes')) setActiveModule('comprobantes');
    else if (path.startsWith('/punto-venta')) setActiveModule('punto-venta');
    else if (path.startsWith('/documentos-comerciales')) setActiveModule('documentos-comerciales');
    else if (path.startsWith('/guias-remision')) setActiveModule('guias-remision');
    else if (path.startsWith('/catalogo')) setActiveModule('productos');
    else if (path.startsWith('/inventario')) setActiveModule('inventario');
    else if (path.startsWith('/lista-precios')) setActiveModule('precios');
    else if (path.startsWith('/control-caja')) setActiveModule('caja');
    else if (path.startsWith('/cobranzas')) setActiveModule('cobranzas');
    else if (path.startsWith('/clientes')) setActiveModule('clientes');
    else if (path.startsWith('/indicadores')) setActiveModule('indicadores');
    else if (path.startsWith('/compras')) setActiveModule('compras');
    else setActiveModule('');
  }, [location.pathname]);

  const modules: Module[] = [
    {
      id: "indicadores",
      title: "Indicadores",
      icon: "BarChart3"
    },
    {
      id: "comprobantes",
      title: "Comprobantes",
      icon: "FileText",
      badge: comprobantesCount > 0 ? String(comprobantesCount) : undefined
    },
    {
      id: "punto-venta",
      title: "Punto de Venta",
      icon: "ShoppingCart"
    },
    {
      id: "documentos-comerciales",
      title: "Doc. Comerciales",
      icon: "FilePen",
      badge: documentosComercialesCount > 0 ? String(documentosComercialesCount) : undefined
    },
    {
      id: "guias-remision",
      title: "Guías de Remisión",
      icon: "Truck",
      badge: guiasRemisionCount > 0 ? String(guiasRemisionCount) : undefined
    },
    {
      id: "cobranzas",
      title: "Cobranzas",
      icon: "Coins"
    },
    {
      id: "caja",
      title: "Caja",
      icon: "Wallet"
    },
    {
      id: "compras",
      title: "Compras",
      icon: "ShoppingBag"
    },
    {
      id: "inventario",
      title: "Inventario",
      icon: "Boxes"
    },
    {
      id: "clientes",
      title: "Clientes",
      icon: "Users"
    },
    {
      id: "productos",
      title: "Productos",
      icon: "Package"
    },
    {
      id: "precios",
      title: "Precios",
      icon: "DollarSign"
    }
  ];

  const usuarioActual = obtenerUsuarioDesdeSesion(configuracionState.users, session);
  const permisosPorModulo: Record<string, string[]> = {
    'comprobantes': [
      'ventas.comprobantes.ver',
      'ventas.comprobantes.emitir',
      'ventas.comprobantes.borradores.ver',
      'ventas.comprobantes.imprimir',
    ],
    'punto-venta': [
      'ventas.pos.ver',
      'ventas.pos.vender',
      'ventas.pos.imprimir',
    ],
    'documentos-comerciales': [
      'ventas.documentos.ver',
      'ventas.documentos.crear',
      'ventas.documentos.editar',
    ],
    'guias-remision': [
      'ventas.gre.ver',
      'ventas.gre.emitir',
    ],
    'productos': [
      'catalogo.ver',
      'catalogo.crear',
      'catalogo.editar',
    ],
    'inventario': [
      'inventario.ver',
      'inventario.ajustar',
      'inventario.transferir',
      'inventario.actualizacion_masiva',
    ],
    'precios': [
      'precios.ver',
      'precios.editar',
    ],
    'caja': [
      'caja.ver',
      'caja.abrir',
      'caja.cerrar',
      'caja.movimientos.registrar',
    ],
    'cobranzas': [
      'cobranzas.ver',
      'cobranzas.registrar',
    ],
    'clientes': [
      'clientes.ver',
      'clientes.crear',
      'clientes.editar',
      'clientes.importar',
    ],
    'indicadores': [
      'indicadores.ver',
    ],
    'compras': [
      'compras.ordenes.ver',
      'compras.comprobantes.ver',
      'compras.cuentas_por_pagar.ver',
      'compras.pagos.ver',
    ],
  };

  const modulesDisponibles = modules.filter((module) => {
    const permisos = permisosPorModulo[module.id] ?? [];
    if (permisos.length === 0) {
      return true;
    }
    return tieneAlgunoDePermisos({
      usuario: usuarioActual,
      permisos,
      rolesDisponibles: rolesConfigurados,
      establecimientoId: session?.currentEstablecimientoId,
    });
  });

  const handleModuleChange = (moduleId: string) => {
    const routeMap: Record<string, string> = {
      'comprobantes': '/comprobantes',
      'punto-venta': '/punto-venta',
      'documentos-comerciales': '/documentos-comerciales',
      'guias-remision': '/guias-remision',
      'productos': '/catalogo',
      'inventario': '/inventario',
      'precios': '/lista-precios',
      'caja': '/control-caja',
      'cobranzas': '/cobranzas',
      'clientes': '/clientes',
      'indicadores': '/indicadores',
      'compras': '/compras'
    };

    const route = routeMap[moduleId];
    if (route) {
      navigate(route);
    }
  };


  return (
    <Sidebar
      isOpen={!collapsed}
      modules={modulesDisponibles}
      activeModule={activeModule}
      onModuleChange={handleModuleChange}
      theme={theme === "system" ? undefined : theme}
    />
  );
}
