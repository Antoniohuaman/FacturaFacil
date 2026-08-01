import { Outlet } from 'react-router-dom';
import { GastosProvider } from '../contexto/ContextoGastos';

export default function GastosLayout() {
  return (
    <GastosProvider>
      <Outlet />
    </GastosProvider>
  );
}
