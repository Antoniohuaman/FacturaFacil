import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ProveedorTema } from '@/aplicacion/proveedores/ProveedorTema'
import App from '@/App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProveedorTema>
      <App />
    </ProveedorTema>
  </StrictMode>
)
