import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "@/contasis";
import type { Module } from "@/contasis";
import { useComprobanteContext } from "../../pages/Private/features/comprobantes-electronicos/lista-comprobantes/contexts/ComprobantesListContext";
import { useDocumentoContext } from "../../pages/Private/features/Documentos-negociacion/contexts/DocumentosContext";
import { useTheme } from "../../contexts/ThemeContext";

interface SideNavProps {
  collapsed?: boolean;
}

export default function SideNav({ collapsed = false }: SideNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  
  // Obtener conteo de comprobantes del contexto
  const { state } = useComprobanteContext();
  const comprobantesCount = state.comprobantes.length;

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
      modules={modules}
      activeModule={activeModule}
      onModuleChange={handleModuleChange}
      theme={theme}
    />
  );
}
