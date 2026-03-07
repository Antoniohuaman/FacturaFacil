import { createContext } from "react";
import type { FeedbackApi } from "./types";

export const FeedbackContext = createContext<FeedbackApi | null>(null);
