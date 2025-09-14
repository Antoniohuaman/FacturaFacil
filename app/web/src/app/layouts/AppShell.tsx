import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import SideNav from "../components/SideNav";
import Footer from "../components/Footer";

export default function AppShell() {
  return (
    <div className="min-h-screen grid grid-rows-[auto,1fr,auto] bg-slate-50">
      <Header />
      <div className="flex min-h-0">
        <SideNav />
        <div className="flex-1 min-w-0 overflow-auto">
          <Outlet />
        </div>
      </div>
      <Footer />
    </div>
  );
}
