import { memo, useEffect, useState, useRef, useCallback } from "react";
import type { ToastItem } from "../types";

const toneStyles: Record<
  ToastItem["tone"],
  {
    accent: string;
    iconBg: string;
    icon: string;
    progress: string;
    progressGlow: string;
    border: string;
    glow: string;
  }
> = {
  success: {
    accent: "bg-emerald-500",
    iconBg: "bg-emerald-50",
    icon: "text-emerald-600",
    progress: "bg-emerald-500",
    progressGlow: "shadow-emerald-400",
    border: "border-emerald-100",
    glow: "shadow-emerald-500/10",
  },
  info: {
    accent: "bg-blue-500",
    iconBg: "bg-blue-50",
    icon: "text-blue-600",
    progress: "bg-blue-500",
    progressGlow: "shadow-blue-400",
    border: "border-blue-100",
    glow: "shadow-blue-500/10",
  },
  warning: {
    accent: "bg-amber-500",
    iconBg: "bg-amber-50",
    icon: "text-amber-600",
    progress: "bg-amber-500",
    progressGlow: "shadow-amber-400",
    border: "border-amber-100",
    glow: "shadow-amber-500/10",
  },
  error: {
    accent: "bg-red-500",
    iconBg: "bg-red-50",
    icon: "text-red-600",
    progress: "bg-red-500",
    progressGlow: "shadow-red-400",
    border: "border-red-100",
    glow: "shadow-red-500/10",
  },
};

const iconPaths: Record<ToastItem["tone"], string> = {
  success:
    "M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z",
  info: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z",
  warning:
    "M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z",
  error:
    "M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z",
};

function ToastIcon({ tone }: { tone: ToastItem["tone"] }) {
  const styles = toneStyles[tone];
  return (
    <span
      className={`
        inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg
        ${styles.iconBg} ${styles.icon}
        transition-all duration-300 ease-out
        group-hover:scale-110 group-hover:rotate-6
      `}
    >
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d={iconPaths[tone]} clipRule="evenodd" />
      </svg>
    </span>
  );
}

interface ToastProps {
  toast: ToastItem;
  onClose: (id: string) => void;
}

function ToastComponent({ toast, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const styles = toneStyles[toast.tone];

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onClose(toast.id), 300); // Match exit animation duration
  }, [onClose, toast.id]);

  // Auto-dismiss ULTRA FLUIDO con RAF optimizado
  useEffect(() => {
    if (toast.sticky) return;

    const duration = toast.durationMs ?? 4500;
    let startTime = performance.now(); // Usar performance.now() para mayor precisión
    let pausedAt: number | null = null;
    let rafId: number;

    const animate = (currentTime: number) => {
      // Pausa en hover
      if (isHovered) {
        if (pausedAt === null) {
          pausedAt = currentTime;
        }
        rafId = requestAnimationFrame(animate);
        return;
      }

      // Reanudar después de hover
      if (pausedAt !== null) {
        startTime += currentTime - pausedAt;
        pausedAt = null;
      }

      const elapsed = currentTime - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);

      // Actualizar progreso con interpolación suave
      setProgress(remaining);

      // Continuar animación
      if (remaining > 0) {
        rafId = requestAnimationFrame(animate);
      } else {
        // Auto-cerrar cuando llegue a 0
        handleClose();
      }
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [toast.sticky, toast.durationMs, isHovered, handleClose]);

  const handleActionClick = () => {
    if (toast.action?.onClick) {
      toast.action.onClick();
      handleClose();
    }
  };

  return (
    <div
      className={`
        group relative w-[420px] max-w-[92vw] overflow-hidden rounded-xl
        bg-white shadow-xl border ${styles.border} ${styles.glow}
        backdrop-blur-sm transition-all duration-300 ease-out
        ${isExiting ? "translate-x-[130%] opacity-0 scale-90" : "translate-x-0 opacity-100 scale-100"}
        ${!isExiting && "animate-in slide-in-from-right duration-300"}
      `}
      role="alert"
      aria-live="polite"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Accent bar with enhanced gradient */}
      <div className={`absolute left-0 top-0 h-full w-1.5 ${styles.accent}`}>
        <div className={`absolute inset-0 ${styles.accent} opacity-60 blur-md`} />
      </div>

      {/* Content */}
      <div className="flex gap-3.5 p-4 pl-5">
        <ToastIcon tone={toast.tone} />

        <div className="min-w-0 flex-1">
          {toast.title && (
            <div className="font-semibold leading-tight text-slate-900 text-sm mb-1">
              {toast.title}
            </div>
          )}
          <div className={`text-sm leading-relaxed text-slate-700 ${!toast.title && "font-medium"}`}>
            {toast.message}
          </div>
          {toast.description && (
            <div className="mt-2 text-xs leading-relaxed text-slate-500 bg-slate-50 rounded-md px-2 py-1.5">
              {toast.description}
            </div>
          )}

          {/* Action button */}
          {toast.action && (
            <button
              type="button"
              className={`
                mt-3 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2
                text-xs font-semibold transition-all duration-200
                ${
                  toast.action.variant === "primary"
                    ? `${styles.accent} ${styles.icon} hover:opacity-90 active:scale-95 shadow-sm`
                    : `text-slate-700 hover:bg-slate-100 active:bg-slate-200 active:scale-95 border border-slate-200`
                }
              `}
              onClick={handleActionClick}
            >
              {toast.action.label}
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>

        <button
          type="button"
          className="
            -mr-1 -mt-1 inline-flex h-7 w-7 shrink-0 items-center
            justify-center rounded-lg text-slate-400
            transition-all duration-200
            hover:bg-slate-100 hover:text-slate-700 hover:scale-110
            active:scale-95
          "
          onClick={handleClose}
          aria-label="Cerrar notificación"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>

      {/* BARRA DE PROGRESO ULTRA MEJORADA - RAPIDÍSIMA Y PERFECTA */}
      {!toast.sticky && (
        <div className="h-1.5 bg-slate-100/80 relative overflow-hidden rounded-b-xl">
          {/* Barra principal con sombra y glow */}
          <div
            ref={progressRef}
            className={`
              h-full ${styles.progress} relative
              transition-all duration-75 ease-linear
              ${styles.progressGlow} shadow-lg
            `}
            style={{
              width: `${progress}%`,
              transform: `scaleX(${progress > 5 ? 1 : 0.95})`,
              transformOrigin: 'left'
            }}
          >
            {/* Gradiente superior para efecto 3D */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-black/10" />

            {/* Shimmer effect ultra suave - animación inline */}
            <div
              className="absolute inset-0 opacity-60 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)',
                animation: 'toast-shimmer 2s infinite ease-in-out',
                willChange: 'transform'
              }}
            />

            {/* Glow pulsante en el borde derecho */}
            <div
              className={`absolute right-0 top-0 h-full w-2 ${styles.progress} opacity-80 blur-sm pointer-events-none`}
              style={{
                animation: 'toast-pulse 1.5s infinite ease-in-out',
                willChange: 'opacity'
              }}
            />
          </div>

          {/* Efecto de brillo de fondo difuminado */}
          <div
            className={`absolute inset-0 ${styles.progress} opacity-5 pointer-events-none`}
            style={{
              width: `${progress}%`,
              filter: 'blur(4px)',
              transition: 'width 75ms linear'
            }}
          />
        </div>
      )}
    </div>
  );
}

export const Toast = memo(ToastComponent);
