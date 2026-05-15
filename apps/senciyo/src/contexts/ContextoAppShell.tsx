/* eslint-disable react-refresh/only-export-components -- archivo comparte helpers/constantes; split diferido */
import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface ContextoAppShellValor {
  modoAmpliado: boolean;
  setModoAmpliado: (valor: boolean) => void;
}

const ContextoAppShell = createContext<ContextoAppShellValor>({
  modoAmpliado: false,
  setModoAmpliado: () => {},
});

export function AppShellProvider({ children }: { children: ReactNode }) {
  const [modoAmpliado, setModoAmpliado] = useState(false);
  return (
    <ContextoAppShell.Provider value={{ modoAmpliado, setModoAmpliado }}>
      {children}
    </ContextoAppShell.Provider>
  );
}

export function useModoAmpliado() {
  return useContext(ContextoAppShell);
}
