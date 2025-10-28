import { Outlet } from "react-router-dom";
import { useState } from "react";
import Header from "../components/Header";
import SideNav from "../components/SideNav";
import Footer from "../components/Footer";
import { ConfigurationProvider } from "../../features/configuracion-sistema/context/ConfigurationContext";
import { ComprobanteProvider } from "../../features/comprobantes-electronicos/lista-comprobantes/contexts/ComprobantesListContext";
import { DocumentoProvider } from "../../features/Documentos-negociacion/contexts/DocumentosContext";
import { ThemeProvider } from "../../contexts/ThemeContext";
import { UserSessionProvider } from "../../contexts/UserSessionContext";
import { SessionInitializer } from "../../contexts/SessionInitializer";
import { FieldsConfigurationProvider } from "../../features/comprobantes-electronicos/shared/form-core/contexts/FieldsConfigurationContext";

export default function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <ThemeProvider>
      <UserSessionProvider>
        <ConfigurationProvider>
          <SessionInitializer>
            <FieldsConfigurationProvider>
              <ComprobanteProvider>
                <DocumentoProvider>
                  <div className="h-screen flex flex-col bg-slate-50 dark:bg-gray-900 overflow-hidden">
                    {/* Header fijo */}
                    <div className="flex-shrink-0 z-50">
                      <Header
                        sidebarCollapsed={sidebarCollapsed}
                        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                      />
                    </div>
                    <div className="flex flex-1 overflow-hidden">
                      {/* Sidebar fijo */}
                      <div className={`${sidebarCollapsed ? 'w-[88px]' : 'w-[260px]'} flex-shrink-0 z-40 transition-all duration-300 ease-in-out overflow-y-auto overflow-x-hidden`}>
                        <SideNav
                          collapsed={sidebarCollapsed}
                        />
                      </div>
                      {/* Contenido principal */}
                      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out overflow-x-hidden`}>
                        <div className="flex-1 overflow-y-auto overflow-x-hidden">
                          <Outlet />
                        </div>
                        <Footer />
                      </div>
                    </div>
                  </div>
                </DocumentoProvider>
              </ComprobanteProvider>
            </FieldsConfigurationProvider>
          </SessionInitializer>
        </ConfigurationProvider>
      </UserSessionProvider>
    </ThemeProvider>
  );
}
