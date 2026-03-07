import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes/router';
import { authRepository } from './pages/Private/features/autenticacion/services/AuthRepository';

export default function App() {
  useEffect(() => {
    void authRepository.initializeSession();
  }, []);

  return <RouterProvider router={router} />;
}
