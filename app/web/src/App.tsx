
import { RouterProvider } from "react-router-dom";
import { router } from "./app/routes/router";
import { CajaProvider, useCaja } from "./features/control-caja/context/CajaContext";
import { ToastContainer } from "./features/control-caja/components/common/Toast";

function AppContent() {
  const { toasts, removeToast } = useCaja();

  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
}

export default function App() {
  return (
    <CajaProvider>
      <AppContent />
    </CajaProvider>
  );
}
