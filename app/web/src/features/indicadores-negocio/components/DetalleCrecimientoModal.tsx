import { useEffect, useId } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { CrecimientoDetalle } from "../models/indicadores";
import { formatCurrency, formatPercentage } from "../utils/formatters";

interface DetalleCrecimientoModalProps {
  open: boolean;
  onClose: () => void;
  detalle?: CrecimientoDetalle | null;
}

const DetalleCrecimientoModal: React.FC<DetalleCrecimientoModalProps> = ({ open, onClose, detalle }) => {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const variation = detalle?.variationPercent ?? 0;
  const comparativo = detalle?.comparativo ?? [];
  const description = detalle?.description ?? "Comparativo de ventas recientes.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-xl w-full p-8 relative"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 focus:outline-none"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ✕
        </button>
        <h2 id={titleId} className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-50">
          Detalle de Crecimiento
        </h2>
        <p id={descriptionId} className="text-gray-700 dark:text-gray-300 mb-6">
          Tus ventas registran {formatPercentage(variation)} respecto al periodo anterior. {description}
        </p>

        {comparativo.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={comparativo}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.4)" />
              <XAxis dataKey="label" stroke="currentColor" />
              <YAxis stroke="currentColor" tickFormatter={(value) => `S/ ${value.toLocaleString('es-PE')}`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={(label) => label} />
              <Bar dataKey="ventas" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={50} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-sm text-gray-500 dark:text-gray-400">Sin datos comparativos disponibles.</div>
        )}
      </div>
    </div>
  );
};

export default DetalleCrecimientoModal;
