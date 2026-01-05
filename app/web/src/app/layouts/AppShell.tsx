import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "../components/Header";
import SideNav from "../components/SideNav";
import { ConfigurationProvider } from "../../features/configuracion-sistema/context/ConfigurationContext";
import { ComprobanteProvider } from "../../features/comprobantes-electronicos/lista-comprobantes/contexts/ComprobantesListContext";
import { DocumentoProvider } from "../../features/Documentos-negociacion/contexts/DocumentosContext";
import { ThemeProvider } from "../../contexts/ThemeContext";
import { UserSessionProvider } from "../../contexts/UserSessionContext";
import { SessionInitializer } from "../../contexts/SessionInitializer";
import { FieldsConfigurationProvider } from "../../features/comprobantes-electronicos/shared/form-core/contexts/FieldsConfigurationContext";
import { CobranzasProvider } from "../../features/gestion-cobranzas/context/CobranzasContext";
import { useTenant } from "../../shared/tenant/TenantContext";
import { TenantDataResetEffect } from "../../shared/tenant/TenantDataResetEffect";

export default function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaces } = useTenant();

  useEffect(() => {
    if (workspaces.length === 0 && location.pathname !== "/configuracion/empresa") {
      navigate("/configuracion/empresa", {
        replace: true,
        state: { workspaceMode: "create_workspace" },
      });
    }
  }, [workspaces.length, location.pathname, navigate]);

  return (
    <ThemeProvider>
      <UserSessionProvider>
        <ConfigurationProvider>
          <SessionInitializer>
            <TenantDataResetEffect />
            <FieldsConfigurationProvider>
              <ComprobanteProvider>
                <CobranzasProvider>
                  <DocumentoProvider>
                  <div className="h-screen flex flex-col bg-slate-50 dark:bg-gray-900 overflow-hidden print:block print:h-auto print:min-h-0 print:bg-white print:overflow-visible">
                    {/* Header fijo */}
                    <div className="flex-shrink-0 z-50 print:hidden">
                      <Header
                        sidebarCollapsed={sidebarCollapsed}
                        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                      />
                    </div>
                    <div className="flex flex-1 overflow-hidden print:block print:overflow-visible">
                      {/* Sidebar fijo */}
                      <div className={`${sidebarCollapsed ? 'w-[88px]' : 'w-[260px]'} flex-shrink-0 z-40 transition-all duration-300 ease-in-out overflow-y-auto overflow-x-hidden print:hidden`}>
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
                  </DocumentoProvider>
                </CobranzasProvider>
              </ComprobanteProvider>
            </FieldsConfigurationProvider>
          </SessionInitializer>
        </ConfigurationProvider>
      </UserSessionProvider>
    </ThemeProvider>
  );
}
