import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

// Define caja status type
type CajaStatus = "abierta" | "cerrada";

interface CajaContextValue {
	status: CajaStatus;
	abrirCaja: () => void;
	cerrarCaja: () => void;
}

const CajaContext = createContext<CajaContextValue | undefined>(undefined);

export const useCaja = () => {
	const context = useContext(CajaContext);
	if (!context) {
		throw new Error("useCaja debe usarse dentro de CajaProvider");
	}
	return context;
};

interface CajaProviderProps {
	children: ReactNode;
}

export const CajaProvider = ({ children }: CajaProviderProps) => {
	const [status, setStatus] = useState<CajaStatus>("cerrada");

	const abrirCaja = () => setStatus("abierta");
	const cerrarCaja = () => setStatus("cerrada");

	return (
		<CajaContext.Provider value={{ status, abrirCaja, cerrarCaja }}>
			{children}
		</CajaContext.Provider>
	);
};
