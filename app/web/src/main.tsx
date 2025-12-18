import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./contexts/ThemeContext";
import { FeedbackProvider } from "./shared/feedback/FeedbackProvider";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <FeedbackProvider>
      <App />
    </FeedbackProvider>
  </ThemeProvider>
);
