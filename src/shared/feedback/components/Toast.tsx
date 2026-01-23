import { memo, useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import type { ToastItem } from "../types";

const toneMap = {
  success: {
    bg: "bg-green-50 border-green-200",
    title: "text-green-900",
    message: "text-green-700",
    bar: "bg-green-600",
    icon: "text-green-600",
    Icon: CheckCircle,
  },
  error: {
    bg: "bg-red-50 border-red-200",
    title: "text-red-900",
    message: "text-red-700",
    bar: "bg-red-600",
    icon: "text-red-600",
    Icon: XCircle,
  },
  warning: {
    bg: "bg-yellow-50 border-yellow-200",
    title: "text-yellow-900",
    message: "text-yellow-700",
    bar: "bg-yellow-600",
    icon: "text-yellow-600",
    Icon: AlertTriangle,
  },
  info: {
    bg: "bg-blue-50 border-blue-200",
    title: "text-blue-900",
    message: "text-blue-700",
    bar: "bg-blue-600",
    icon: "text-blue-600",
    Icon: Info,
  },
} satisfies Record<ToastItem["tone"], {
  bg: string;
  title: string;
  message: string;
  bar: string;
  icon: string;
  Icon: typeof CheckCircle;
}>;

interface ToastProps {
  toast: ToastItem;
  onClose: (id: string) => void;
}

function ToastComponent({ toast, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const duration = toast.durationMs ?? 4000;
  const tone = toneMap[toast.tone];
  const Icon = tone.Icon;

  const handleRemove = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => onClose(toast.id), 300);
  }, [onClose, toast.id]);

  useEffect(() => {
    const enterTimer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(enterTimer);
  }, []);

  useEffect(() => {
    if (toast.sticky) return;
    const timeoutId = setTimeout(() => {
      handleRemove();
    }, duration);

    return () => clearTimeout(timeoutId);
  }, [toast.sticky, duration, handleRemove]);

  const handleActionClick = () => {
    if (!toast.action) return;
    toast.action.onClick();
    handleRemove();
  };

  return (
    <div
      className={`
        transform transition-all duration-300 ease-out
        ${isVisible && !isLeaving
          ? 'translate-x-0 opacity-100 scale-100'
          : 'translate-x-full opacity-0 scale-95'
        }
        ${tone.bg}
        min-w-[320px] max-w-lg w-auto shadow-lg rounded-lg border pointer-events-auto
        ring-1 ring-black ring-opacity-5
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={`h-5 w-5 ${tone.icon}`} />
          </div>
          <div className="ml-3 flex-1">
            {toast.title && (
              <p className={`text-sm font-semibold ${tone.title}`}>
                {toast.title}
              </p>
            )}
            {toast.message && (
              <p className={`mt-1 text-sm ${tone.message}`}>
                {toast.message}
              </p>
            )}
            {toast.description && (
              <p className="mt-1 text-xs text-slate-500">
                {toast.description}
              </p>
            )}
            {toast.action && (
              <div className="mt-3">
                <button
                  onClick={handleActionClick}
                  className={`text-sm font-medium underline hover:no-underline focus:outline-none ${tone.title}`}
                >
                  {toast.action.label}
                </button>
              </div>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={handleRemove}
              className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors"
              aria-label="Cerrar notificación"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {!toast.sticky && (
        <div className="h-1 bg-black bg-opacity-10">
          <div
            className={`h-full ${tone.bar}`}
            style={{
              animation: `shrink ${duration}ms linear`,
              animationFillMode: 'forwards',
            }}
          />
        </div>
      )}
    </div>
  );
}

export const Toast = memo(ToastComponent);
