// src/features/autenticacion/index.ts

/**
 * ============================================
 * AUTENTICACIÓN - Barrel Export (ACTUALIZADO)
 * ============================================
 */

// Hooks
export { useAuth } from './hooks/useAuth';
export { usePasswordStrength } from './hooks/usePasswordStrength';
export { useDebounce } from './hooks/useDebounce';

// Stores
export { useAuthStore } from './store/AuthStore';
export { useTenantStore } from './store/TenantStore';

// Guards
export { ProtectedRoute } from './guards/ProtectedRoute';
export { RoleGuard } from './guards/RoleGuard';
export { RequireWorkspaceGuard } from './guards/RequireWorkspaceGuard';

// Providers
export { AuthProvider } from './providers/AuthProvider';

// Pages
export { LoginPage } from './pages/LoginPage';
export { RegisterPage } from './pages/RegisterPage';
export { TwoFactorPage } from './pages/TwoFactorPage';
export { ContextSelectPage } from './pages/ContextSelectPage';
export { PasswordResetRequestPage } from './pages/PasswordResetRequestPage';
export { PasswordResetPage } from './pages/PasswordResetPage';
export { SetPasswordPage } from './pages/SetPasswordPage';

// Layouts
export { AuthLayout } from './layouts/AuthLayout';

// Components
export { LoginForm } from './components/LoginForm';
export { EmailInput } from './components/EmailInput';
export { PasswordInput } from './components/PasswordInput';
export { RememberMeToggle } from './components/RememberMeToggle';
export { ContextSelector } from './components/ContextSelector';

// Services
export { authClient } from './services/AuthClient';
export { authRepository } from './services/AuthRepository';
export { tokenService } from './services/TokenService';
export { contextService } from './services/ContextService';
export { rateLimitService } from './services/RateLimitService';

// Types
export type {
  User,
  Empresa,
  Establecimiento,
  WorkspaceContext,
  LoginCredentials,
  RegisterData,
  AuthTokens,
  AuthResponse,
  AuthError,
  PasswordStrength,
} from './types/auth.types';

export {
  UserRole,
  UserStatus,
  AuthErrorCode,
  RegimenTributario,
  EmpresaStatus,
} from './types/auth.types';

// Schemas
export * from './schemas';

// Utils
export * from './utils/errorMapping';
export * from './utils/path';

// Routes
export { authRoutes } from './routes';
