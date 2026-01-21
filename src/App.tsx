import { RouterProvider } from "react-router-dom";
import { router } from "./routes/router";
import { AuthInitializer } from "./pages/Private/features/autenticacion/components/AuthInitializer";

export default function App() {
  return (
    <AuthInitializer>
      <RouterProvider router={router} />
    </AuthInitializer>
  );
}
