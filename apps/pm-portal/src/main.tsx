import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ProveedorTema } from '@/aplicacion/proveedores/ProveedorTema'
import { ProveedorSesionPortalPM } from '@/aplicacion/autenticacion/ProveedorSesionPortalPM'
import { ErrorBoundaryPortalPM } from '@/compartido/ui/ErrorBoundaryPortalPM'
import App from '@/App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundaryPortalPM>
      <ProveedorTema>
        <ProveedorSesionPortalPM>
          <App />
        </ProveedorSesionPortalPM>
      </ProveedorTema>
    </ErrorBoundaryPortalPM>
  </StrictMode>
)
