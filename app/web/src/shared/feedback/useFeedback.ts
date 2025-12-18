import { useContext } from "react";
import { FeedbackContext } from "./FeedbackContext";
import type { FeedbackApi } from "./types";

export function useFeedback(): FeedbackApi {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error("useFeedback debe usarse dentro de <FeedbackProvider />");
  }
  return ctx;
}
