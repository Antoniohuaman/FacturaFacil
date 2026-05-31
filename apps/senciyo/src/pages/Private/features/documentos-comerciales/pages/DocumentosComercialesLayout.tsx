import { Outlet } from 'react-router-dom';
import { DocumentosComercialesProvider } from '../contexts/DocumentosComercialesContext';

export default function DocumentosComercialesLayout() {
  return (
    <DocumentosComercialesProvider>
      <Outlet />
    </DocumentosComercialesProvider>
  );
}
