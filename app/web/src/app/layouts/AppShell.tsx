import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import SideNav from "../components/SideNav";
import Footer from "../components/Footer";

export default function AppShell() {
  return (
    <div className="min-h-screen grid grid-rows-[auto,1fr,auto] bg-slate-50">
      <Header />
      <div className="flex min-h-0">
        <div className="flex flex-col">
          {/* Sidebar responsivo: ancho variable según breakpoint */}
          <div className="w-16 sm:w-24 md:w-40 lg:w-56 transition-all duration-300">
            <SideNav />
          </div>
        </div>
        {/* Contenido principal con padding y scroll horizontal en pantallas pequeñas */}
        <div className="flex-1 min-w-0 overflow-auto">
          <div className="max-w-[1440px] mx-auto w-full px-2 sm:px-4 md:px-6 lg:px-8">
            <div className="overflow-x-auto">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
