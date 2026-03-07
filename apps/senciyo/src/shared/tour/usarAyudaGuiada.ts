import { useContext } from "react";
import { ContextoAyudaGuiada } from "./ContextoAyudaGuiada";

export const useAyudaGuiada = () => {
  const contexto = useContext(ContextoAyudaGuiada);
  if (!contexto) {
    throw new Error("useAyudaGuiada debe usarse dentro de ProveedorAyudaGuiada");
  }
  return contexto;
};

// Alias en español (sin ejecutar hooks aquí)
export const usarAyudaGuiada = useAyudaGuiada;
