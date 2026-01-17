// src/features/autenticacion/routes.tsx
import type { RouteObject } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { TwoFactorPage } from './pages/TwoFactorPage';
import { ContextSelectPage } from './pages/ContextSelectPage';
import { PasswordResetRequestPage } from './pages/PasswordResetRequestPage';
import { PasswordResetPage } from './pages/PasswordResetPage';
import { SetPasswordPage } from './pages/SetPasswordPage';
import { ProtectedRoute } from './guards/ProtectedRoute';

/**
 * ============================================
 * RUTAS DE AUTENTICACIÓN - Actualizadas
 * ============================================
 */

export const authRoutes: RouteObject[] = [
  {
    path: '/auth',
    children: [
      // Públicas
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },
      {
        path: 'reset',
        element: <PasswordResetRequestPage />,
      },
      {
        path: 'reset/confirm',
        element: <PasswordResetPage />,
      },
      {
        path: 'set-password/:token',
        element: <SetPasswordPage />,
      },

      // Semi-protegidas (requieren auth pero NO workspace)
      {
        path: '2fa',
        element: (
          <ProtectedRoute requireContext={false}>
            <TwoFactorPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'context',
        element: (
          <ProtectedRoute requireContext={false}>
            <ContextSelectPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
];
