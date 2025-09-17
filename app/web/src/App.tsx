
import { RouterProvider } from "react-router-dom";
import { router } from "./app/routes/router";
import { CajaProvider } from "./features/control-caja/store/CajaContext";

export default function App() {
  return (
    <CajaProvider>
      <RouterProvider router={router} />
    </CajaProvider>
  );
}
