import { Outlet } from "react-router-dom";
import { useState } from "react";
import Header from "../components/Header";
import SideNav from "../components/SideNav";
import Footer from "../components/Footer";
import { ConfigurationProvider } from "../../features/configuracion-sistema/context/ConfigurationContext";

export default function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <ConfigurationProvider>
      <div className="min-h-screen grid grid-rows-[auto,1fr,auto] bg-slate-50">
        <Header />
        <div className="flex min-h-0">
          {/* Sidebar expandible/colapsable con medidas específicas */}
          <div className={`${sidebarCollapsed ? 'w-[88px]' : 'w-[280px]'} flex-shrink-0 transition-all duration-300 ease-in-out`}>
            <SideNav 
              collapsed={sidebarCollapsed} 
              onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
          </div>
          {/* Contenido principal que se ajusta automáticamente */}
          <div className="flex-1 min-w-0 overflow-auto">
            <div className="px-10">
              <Outlet />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </ConfigurationProvider>
  );
}
