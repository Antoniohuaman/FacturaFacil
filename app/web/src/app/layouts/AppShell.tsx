import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import SideNav from "../components/SideNav";
import SidebarHeader from "../../components/SidebarHeader";
import Footer from "../components/Footer";

export default function AppShell() {
  return (
    <div className="min-h-screen grid grid-rows-[auto,1fr,auto] bg-slate-50">
      <Header />
      <div className="flex min-h-0">
        <div className="flex flex-col">
          <SidebarHeader
            empresa={{
              logoUrl: "/logo.png",
              razonSocial: "Mi Empresa SAC",
              ruc: "20123456789",
              multiEmpresa: true
            }}
            usuario={{
              nombre: "Antonio Huamán",
              rol: "Administrador"
            }}
            onEmpresaChange={() => alert('Cambiar empresa')}
          />
          <SideNav />
        </div>
        <div className="flex-1 min-w-0 overflow-auto">
          <Outlet />
        </div>
      </div>
      <Footer />
    </div>
  );
}
