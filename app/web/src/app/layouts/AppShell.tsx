import { Outlet } from "react-router-dom";
import { useState } from "react";
import Header from "../components/Header";
import SideNav from "../components/SideNav";
import Footer from "../components/Footer";
import { ConfigurationProvider } from "../../features/configuracion-sistema/context/ConfigurationContext";
import { ThemeProvider } from "../../contexts/ThemeContext";

export default function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <ThemeProvider>
      <ConfigurationProvider>
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
            <div className={`${sidebarCollapsed ? 'w-[88px]' : 'w-[260px]'} flex-shrink-0 z-40 transition-all duration-300 ease-in-out overflow-y-auto`}>
              <SideNav 
                collapsed={sidebarCollapsed}
              />
            </div>
            {/* Contenido principal */}
            <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out`}>
              <div className="flex-1 overflow-auto">
                <Outlet />
              </div>
              <Footer />
            </div>
          </div>
        </div>
      </ConfigurationProvider>
    </ThemeProvider>
  );
}
