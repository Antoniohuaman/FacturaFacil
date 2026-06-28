import { Outlet } from 'react-router-dom';
import { GuiasRemisionProvider } from '../contexto/ContextoGuiasRemision';

export default function GuiasRemisionLayout() {
  return (
    <GuiasRemisionProvider>
      <Outlet />
    </GuiasRemisionProvider>
  );
}
