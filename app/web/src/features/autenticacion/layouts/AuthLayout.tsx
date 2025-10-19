// src/features/autenticacion/layouts/AuthLayout.tsx
import type { ReactNode } from 'react';

/**
 * ============================================
 * AUTH LAYOUT - Diseño 50/50 con Hero
 * ============================================
 * Layout principal para todas las páginas de autenticación
 * Diseño moderno con glassmorphism y gradientes
 */

interface AuthLayoutProps {
  children: ReactNode;
  showHero?: boolean;
}

export function AuthLayout({ children, showHero = true }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* ==================== HERO SECTION (Izquierda) ==================== */}
      {showHero && (
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
          {/* Patrón de fondo */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" 
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v6h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
          </div>

          {/* Blobs decorativos */}
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
          <div className="absolute bottom-0 left-20 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />

          {/* Contenido del Hero */}
          <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-white">
            {/* Logo */}
            <div className="mb-8">
              <img 
                src="/SenciYO.svg" 
                alt="SenciYO" 
                className="h-12 w-auto filter drop-shadow-lg"
              />
            </div>

            {/* Título */}
            <h1 className="text-5xl xl:text-6xl font-bold mb-6 leading-tight">
              Facturación <br />
              Electrónica <br />
              <span className="text-blue-200">Simple y Rápida</span>
            </h1>

            {/* Descripción */}
            <p className="text-xl text-blue-100 mb-8 max-w-md leading-relaxed">
              El ERP empresarial peruano que simplifica tu facturación electrónica
              y gestión comercial.
            </p>

            {/* Features */}
            <div className="space-y-4 max-w-md">
              <FeatureItem 
                icon="✓" 
                text="Emisión de comprobantes electrónicos SUNAT" 
              />
              <FeatureItem 
                icon="✓" 
                text="Gestión de inventario y ventas en tiempo real" 
              />
              <FeatureItem 
                icon="✓" 
                text="Control total de tu negocio desde cualquier lugar" 
              />
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-3 gap-6">
              <StatItem value="1000+" label="Empresas" />
              <StatItem value="99.9%" label="Uptime" />
              <StatItem value="24/7" label="Soporte" />
            </div>
          </div>
        </div>
      )}

      {/* ==================== FORM SECTION (Derecha) ==================== */}
      <div 
        className={`flex-1 ${showHero ? 'lg:w-1/2' : 'w-full'} flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-gray-50 dark:bg-gray-900`}
      >
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}

// ==================== COMPONENTES AUXILIARES ====================

interface FeatureItemProps {
  icon: string;
  text: string;
}

function FeatureItem({ icon, text }: FeatureItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-sm font-bold">
        {icon}
      </div>
      <p className="text-blue-50 text-base">{text}</p>
    </div>
  );
}

interface StatItemProps {
  value: string;
  label: string;
}

function StatItem({ value, label }: StatItemProps) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-blue-200">{label}</div>
    </div>
  );
}

// ==================== ESTILOS ADICIONALES NECESARIOS ====================
/*
Agregar a tu archivo global de estilos (App.css o index.css):

@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}

.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}
*/