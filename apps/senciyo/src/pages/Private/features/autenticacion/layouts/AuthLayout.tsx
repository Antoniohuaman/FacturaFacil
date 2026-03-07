// src/features/autenticacion/layouts/AuthLayout.tsx
import type { ReactNode } from 'react';

/**
 * ============================================
 * AUTH LAYOUT - Diseño 60/40 con Hero
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
      {/* ==================== HERO SECTION (Izquierda - 65%) ==================== */}
      {showHero && (
        <div className="hidden lg:flex lg:w-[65%] relative overflow-hidden bg-gradient-to-br from-[#0a1628] via-[#1e3a8a] to-[#1e40af]">
          {/* Grid futurista de fondo */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(96, 165, 250, 0.1) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(96, 165, 250, 0.1) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px',
              }}
            />
          </div>

          {/* Líneas diagonales decorativas */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-blue-400 to-transparent" />
            <div className="absolute top-0 left-2/4 w-px h-full bg-gradient-to-b from-transparent via-cyan-400 to-transparent" />
            <div className="absolute top-0 left-3/4 w-px h-full bg-gradient-to-b from-transparent via-blue-300 to-transparent" />
          </div>

          {/* Blobs de luz futuristas */}
          <div className="absolute top-0 -left-20 w-[500px] h-[500px] bg-gradient-radial from-blue-500/30 via-blue-600/10 to-transparent rounded-full blur-3xl animate-blob" />
          <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-gradient-radial from-cyan-400/30 via-blue-500/10 to-transparent rounded-full blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute bottom-0 left-1/3 w-[450px] h-[450px] bg-gradient-radial from-indigo-500/30 via-purple-600/10 to-transparent rounded-full blur-3xl animate-blob animation-delay-4000" />

          {/* Efecto de brillo superior */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

          {/* Círculos decorativos flotantes */}
          <div className="absolute top-20 right-20 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          <div className="absolute top-40 right-32 w-1 h-1 bg-blue-300 rounded-full animate-pulse animation-delay-1000" />
          <div className="absolute bottom-32 right-16 w-1.5 h-1.5 bg-indigo-300 rounded-full animate-pulse animation-delay-2000" />

          {/* Contenido del Hero */}
          <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-white">
            {/* Título con efecto futurista */}
            <h1 className="text-5xl xl:text-6xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent">
                Facturación
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-blue-200 bg-clip-text text-transparent">
                Simple y Rápida
              </span>
            </h1>

            {/* Descripción */}
            <p className="text-xl text-blue-100/90 mb-8 max-w-md leading-relaxed backdrop-blur-sm">
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

            {/* Stats con diseño futurista */}
            <div className="mt-12 grid grid-cols-3 gap-6">
              <StatItem value="1000+" label="Empresas" />
              <StatItem value="99.9%" label="Uptime" />
              <StatItem value="24/7" label="Soporte" />
            </div>
          </div>

          {/* Línea decorativa inferior con efecto de brillo */}
          <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
        </div>
      )}

      {/* ==================== FORM SECTION (Derecha - 35%) ==================== */}
      <div 
        className={`flex-1 ${showHero ? 'lg:w-[35%]' : 'w-full'} flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-gray-50 dark:bg-gray-900`}
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
    <div className="flex items-start gap-3 group">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400/30 to-blue-500/30 backdrop-blur-sm flex items-center justify-center text-sm font-bold border border-cyan-400/30 shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all duration-300">
        {icon}
      </div>
      <p className="text-blue-50/95 text-base group-hover:text-white transition-colors duration-300">{text}</p>
    </div>
  );
}

interface StatItemProps {
  value: string;
  label: string;
}

function StatItem({ value, label }: StatItemProps) {
  return (
    <div className="text-center group cursor-default">
      <div className="relative inline-block">
        <div className="text-2xl font-bold bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent mb-1 group-hover:from-cyan-200 group-hover:to-white transition-all duration-300">
          {value}
        </div>
        {/* Efecto de brillo inferior */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent group-hover:w-full transition-all duration-300" />
      </div>
      <div className="text-sm text-blue-200/80 group-hover:text-blue-100 transition-colors duration-300">{label}</div>
    </div>
  );
}

// ==================== ESTILOS ADICIONALES ====================
/*
Los estilos personalizados para las animaciones futuristas (blob, animation-delay, bg-gradient-radial)
están definidos en src/index.css
*/