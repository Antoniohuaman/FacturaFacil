import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "@/contasis";
import type { Module } from "@/contasis";
import { useComprobanteContext } from "../../pages/Private/features/comprobantes-electronicos/lista-comprobantes/contexts/ComprobantesListContext";
import { useDocumentoContext } from "../../pages/Private/features/Documentos-negociacion/contexts/DocumentosContext";
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

  // Obtener conteo de documentos (cotizaciones + notas de venta)
  const { state: documentoState } = useDocumentoContext();
  const documentosCount = documentoState.documentos.length;

  // Determinar el módulo activo basado en la ruta
  const [activeModule, setActiveModule] = useState<string>("");

  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/comprobantes')) setActiveModule('comprobantes');
    else if (path.startsWith('/punto-venta')) setActiveModule('punto-venta');
    else if (path.startsWith('/documentos-negociacion')) setActiveModule('documentos');
    else if (path.startsWith('/catalogo')) setActiveModule('productos');
    else if (path.startsWith('/inventario')) setActiveModule('inventario');
    else if (path.startsWith('/lista-precios')) setActiveModule('precios');
    else if (path.startsWith('/control-caja')) setActiveModule('caja');
    else if (path.startsWith('/cobranzas')) setActiveModule('cobranzas');
    else if (path.startsWith('/clientes')) setActiveModule('clientes');
    else if (path.startsWith('/indicadores')) setActiveModule('indicadores');
    else setActiveModule('');
  }, [location.pathname]);

  const modules: Module[] = [
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
      id: "documentos",
      title: "Documentos",
      icon: "Receipt",
      badge: documentosCount > 0 ? String(documentosCount) : undefined
    },
    {
      id: "productos",
      title: "Productos",
      icon: "Package"
    },
    {
      id: "inventario",
      title: "Control Stock",
      icon: "Boxes"
    },
    {
      id: "precios",
      title: "Precios",
      icon: "DollarSign"
    },
    {
      id: "caja",
      title: "Caja",
      icon: "Wallet"
    },
    {
      id: "cobranzas",
      title: "Cobranzas",
      icon: "Coins"
    },
    {
      id: "clientes",
      title: "Clientes",
      icon: "Users"
    },
    {
      id: "indicadores",
      title: "Indicadores",
      icon: "BarChart3"
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
    'documentos': [
      'ventas.documentos.ver',
      'ventas.documentos.crear',
      'ventas.documentos.editar',
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
      'documentos': '/documentos-negociacion',
      'productos': '/catalogo',
      'inventario': '/inventario',
      'precios': '/lista-precios',
      'caja': '/control-caja',
      'cobranzas': '/cobranzas',
      'clientes': '/clientes',
      'indicadores': '/indicadores'
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
