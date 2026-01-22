import { createBrowserRouter } from "react-router-dom";
import { publicRoutes } from "./publicRoutes";
import { privateRoutes } from "./privateRoutes";

export const router = createBrowserRouter([
  ...publicRoutes,
  ...privateRoutes,
]);
