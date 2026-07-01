import { Outlet } from 'react-router-dom';
import { ComprasProvider } from '../contexto/ContextoCompras';

export default function ComprasLayout() {
  return (
    <ComprasProvider>
      <Outlet />
    </ComprasProvider>
  );
}
