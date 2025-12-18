import { RouterProvider } from "react-router-dom";
import { router } from "./app/routes/router";
import { CajaProvider, useCaja } from "./features/control-caja/context/CajaContext";
import { ToastContainer } from "./features/control-caja/components/common/Toast";

import { FeedbackHost } from "./shared/feedback/FeedbackHost"; // 👈 agrega esto

function AppContent() {
  const { toasts, removeToast } = useCaja();

  return (
    <>
      <RouterProvider router={router} />

      {/* Nuevo sistema global (aún no lo usamos en todos lados, pero ya está montado) */}
      <FeedbackHost />

      {/* Viejo (temporal, para que no se rompa nada mientras migramos) */}
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
