import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "./components/Header";
import ConfigurationTopBar from "./components/ConfigurationTopBar";
import { TopBar } from "../contasis/layout/TopBar/TopBar";
import SideNav from "./components/SideNav";
import { ConfigurationProvider } from "../pages/Private/features/configuracion-sistema/contexto/ContextoConfiguracion";
import { ComprobanteProvider } from "../pages/Private/features/comprobantes-electronicos/lista-comprobantes/contexts/ComprobantesListContext";
import { DocumentoProvider } from "../pages/Private/features/Documentos-negociacion/contexts/DocumentosContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { UserSessionProvider } from "../contexts/UserSessionContext";
import { SessionInitializer } from "../contexts/SessionInitializer";
import { FieldsConfigurationProvider } from "../pages/Private/features/comprobantes-electronicos/shared/form-core/contexts/FieldsConfigurationContext";
import { CobranzasProvider } from "../pages/Private/features/gestion-cobranzas/context/CobranzasContext";
import { useTenant } from "../shared/tenant/TenantContext";
import { TenantDataResetEffect } from "../shared/tenant/TenantDataResetEffect";
import { CajaProvider, useCaja } from "../pages/Private/features/control-caja/context/CajaContext";
import { ToastContainer } from "../pages/Private/features/control-caja/components/common/Toast";
import { FeedbackHost } from "../shared/feedback/FeedbackHost";
import { generateWorkspaceId } from "../shared/tenant";

export default function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaces, tenantId } = useTenant();
  const workspaceNavigationState = location.state as
    | { workspaceId?: string; workspaceMode?: "create_workspace" | "edit_workspace" }
    | null;
  const configurationTenantId = workspaceNavigationState?.workspaceId ?? tenantId;

  // Detectar si estamos en rutas de configuración
  const isInConfiguration = location.pathname === '/configuracion' || location.pathname.startsWith('/configuracion/');

  // Detectar si estamos en rutas de Comprobantes o Punto de Venta
  const isInComprobantes = location.pathname === '/' || 
                           location.pathname === '/comprobantes' || 
                           location.pathname.startsWith('/comprobantes/') ||
                           location.pathname.startsWith('/punto-venta/');

  useEffect(() => {
    if (workspaces.length === 0 && location.pathname !== "/configuracion/empresa") {
      navigate("/configuracion/empresa", {
        replace: true,
        state: { workspaceMode: "create_workspace", workspaceId: generateWorkspaceId() },
      });
    }
  }, [workspaces.length, location.pathname, navigate]);

  return (
    <ThemeProvider>
      <UserSessionProvider>
        <ConfigurationProvider key={configurationTenantId ?? 'no-tenant'} tenantIdOverride={configurationTenantId}>
          <SessionInitializer>
            <TenantDataResetEffect />
            <CajaProvider>
              <FieldsConfigurationProvider>
                <ComprobanteProvider>
                  <CobranzasProvider>
                    <DocumentoProvider>
                      <div className="h-screen flex flex-col bg-slate-50 dark:bg-gray-900 overflow-hidden print:block print:h-auto print:min-h-0 print:bg-white print:overflow-visible">
                        {/* Header fijo */}
                        <div className="flex-shrink-0 z-50 print:hidden">
                          {isInConfiguration ? (
                            <ConfigurationTopBar
                              onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                            />
                          ) : isInComprobantes ? (
                            <Header
                              sidebarCollapsed={sidebarCollapsed}
                              onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                            />
                          ) : (
                            <TopBar
                              onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                            />
                          )}
                        </div>
                        <div className="flex flex-1 overflow-hidden print:block print:overflow-visible">
                          {/* Sidebar fijo */}
                          <div className="flex-shrink-0 h-full z-40 print:hidden">
                            <SideNav
                              collapsed={sidebarCollapsed}
                            />
                          </div>
                          {/* Contenido principal */}
                          <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out overflow-x-hidden print:block print:overflow-visible`}>
                            <div className="flex-1 overflow-y-auto overflow-x-hidden print:block print:overflow-visible">
                              <Outlet />
                            </div>
                          </div>
                        </div>
                      </div>
                      <CajaGlobalOverlays />
                    </DocumentoProvider>
                  </CobranzasProvider>
                </ComprobanteProvider>
              </FieldsConfigurationProvider>
            </CajaProvider>
          </SessionInitializer>
        </ConfigurationProvider>
      </UserSessionProvider>
    </ThemeProvider>
  );
}

function CajaGlobalOverlays() {
  const { toasts, removeToast } = useCaja();

  return (
    <>
      <FeedbackHost />
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
}
