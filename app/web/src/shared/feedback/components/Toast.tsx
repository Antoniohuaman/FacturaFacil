import type { ToastItem } from "../types";

const toneStyles: Record<ToastItem["tone"], { ring: string; iconBg: string; icon: string }> = {
  success: { ring: "ring-green-200", iconBg: "bg-green-50", icon: "text-green-600" },
  info: { ring: "ring-blue-200", iconBg: "bg-blue-50", icon: "text-blue-600" },
  warning: { ring: "ring-amber-200", iconBg: "bg-amber-50", icon: "text-amber-600" },
  error: { ring: "ring-red-200", iconBg: "bg-red-50", icon: "text-red-600" },
};

function Icon({ tone }: { tone: ToastItem["tone"] }) {
  const cls = toneStyles[tone].icon;
  // ícono simple (sin libs)
  return (
    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${toneStyles[tone].iconBg}`}>
      <span className={`text-sm font-bold ${cls}`}>!</span>
    </span>
  );
}

export function Toast({ toast, onClose }: { toast: ToastItem; onClose: (id: string) => void }) {
  const styles = toneStyles[toast.tone];

  return (
    <div className={`w-[360px] max-w-[90vw] rounded-xl bg-white shadow-lg ring-1 ${styles.ring}`}>
      <div className="flex gap-3 p-4">
        <Icon tone={toast.tone} />

        <div className="min-w-0 flex-1">
          {toast.title ? <div className="truncate text-sm font-semibold text-slate-900">{toast.title}</div> : null}
          <div className="mt-0.5 text-sm text-slate-700">{toast.message}</div>
        </div>

        <button
          type="button"
          className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          onClick={() => onClose(toast.id)}
          aria-label="Cerrar notificación"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
