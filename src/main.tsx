import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./contexts/ThemeContext";
import { FeedbackProvider } from "./shared/feedback/FeedbackProvider";
import { TenantProvider } from "./shared/tenant/TenantProvider";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <FeedbackProvider>
      <TenantProvider>
        <App />
      </TenantProvider>
    </FeedbackProvider>
  </ThemeProvider>
);
