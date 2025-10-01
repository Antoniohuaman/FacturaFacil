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
      <div className="min-h-screen bg-slate-50">
        {/* Header fijo */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <Header />
        </div>
        <div className="flex pt-16">
          {/* Sidebar fijo para evitar scroll */}
          <div className={`${sidebarCollapsed ? 'w-[88px]' : 'w-[280px]'} fixed top-16 bottom-0 left-0 z-40 transition-all duration-300 ease-in-out`}>
            <SideNav 
              collapsed={sidebarCollapsed} 
              onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
          </div>
          {/* Contenido principal con margen para el sidebar */}
          <div className={`flex-1 min-h-[calc(100vh-4rem)] ${sidebarCollapsed ? 'ml-[88px]' : 'ml-[280px]'} transition-all duration-300 ease-in-out flex flex-col`}>
            <div className="flex-1 px-10 py-6">
              <Outlet />
            </div>
            <Footer />
          </div>
        </div>
      </div>
    </ConfigurationProvider>
  );
}
