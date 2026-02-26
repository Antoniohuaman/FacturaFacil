import { RouterProvider } from 'react-router-dom'
import { enrutadorPortal } from '@/aplicacion/enrutador/enrutador'

export default function App() {
  return <RouterProvider router={enrutadorPortal} />
}
