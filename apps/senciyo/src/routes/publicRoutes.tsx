import type { RouteObject } from "react-router-dom";
import { authRoutes } from "../pages/Private/features/autenticacion/routes";

export const publicRoutes: RouteObject[] = [
  // Rutas de autenticación (públicas)
  ...authRoutes,
];
