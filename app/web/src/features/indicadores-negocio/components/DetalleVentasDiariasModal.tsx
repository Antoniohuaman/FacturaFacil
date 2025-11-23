import { useEffect, useMemo, useState, useId } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { VentaDiaria } from "../models/indicadores";
import { formatCurrency, formatShortLabelFromString } from "../utils/formatters";

type FiltroComprobante = "Todos" | "Boletas" | "Facturas";

interface DetalleVentasDiariasModalProps {
  open: boolean;
  onClose: () => void;
  data: VentaDiaria[];
}

const proyectarPorTipo = (row: VentaDiaria, tipo: FiltroComprobante): VentaDiaria => {
  if (tipo === "Boletas" && row.boletas && row.comprobantes) {
    const ratio = row.boletas / row.comprobantes;
    const ventas = row.ventas * ratio;
    const comprobantes = row.boletas;
    return {
      ...row,
      ventas: Number(ventas.toFixed(2)),
      comprobantes,
      ticket: Number((ventas / Math.max(1, comprobantes)).toFixed(2)),
      igv: undefined,
    };
  }

  if (tipo === "Facturas" && row.facturas && row.comprobantes) {
    const ratio = row.facturas / row.comprobantes;
    const ventas = row.ventas * ratio;
    const comprobantes = row.facturas;
    return {
      ...row,
      ventas: Number(ventas.toFixed(2)),
      comprobantes,
      ticket: Number((ventas / Math.max(1, comprobantes)).toFixed(2)),
      igv: row.igv ? Number((row.igv * ratio).toFixed(2)) : undefined,
    };
  }

  return row;
};

const DetalleVentasDiariasModal: React.FC<DetalleVentasDiariasModalProps> = ({ open, onClose, data }) => {
  const [tipoComprobante, setTipoComprobante] = useState<FiltroComprobante>("Todos");
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      setTipoComprobante("Todos");
      return;
    }

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const filteredData = useMemo(() => {
    return data
      .filter((row) => {
        if (tipoComprobante === "Boletas") return (row.boletas ?? 0) > 0;
        if (tipoComprobante === "Facturas") return (row.facturas ?? 0) > 0;
        return true;
      })
      .map((row) => proyectarPorTipo(row, tipoComprobante));
  }, [data, tipoComprobante]);

  if (!open) {
    return null;
  }

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
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl p-8 relative"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 focus:outline-none"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ✕
        </button>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 id={titleId} className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Detalle de Ventas Diarias
            </h2>
            <p id={descriptionId} className="sr-only">
              Visualiza la evolución diaria por tipo de comprobante.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-base font-medium text-gray-700 dark:text-gray-300">Comprobantes:</label>
            <select
              value={tipoComprobante}
              onChange={(e) => setTipoComprobante(e.target.value as FiltroComprobante)}
              className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Todos">Todos</option>
              <option value="Boletas">Boletas</option>
              <option value="Facturas">Facturas</option>
            </select>
          </div>
        </div>

        <div className="mb-8">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.5)" />
              <XAxis dataKey="fecha" tickFormatter={formatShortLabelFromString} stroke="currentColor" />
              <YAxis
                stroke="currentColor"
                tickFormatter={(value: number) => `S/ ${value.toLocaleString('es-PE')}`}
                domain={[0, 'auto']}
              />
              <RechartsTooltip
                content={(props: { active?: boolean; payload?: Array<{ payload: VentaDiaria }> }) => {
                  const { active, payload } = props;
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border border-gray-200 dark:border-gray-700 text-sm">
                        <div className="font-semibold text-blue-700 dark:text-blue-300 mb-1">
                          {formatShortLabelFromString(item.fecha)}
                        </div>
                        <div className="text-gray-900 dark:text-gray-100">
                          {formatCurrency(item.ventas)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {item.comprobantes} comprobantes
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="ventas" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 text-xs border-b border-gray-200 dark:border-gray-800">
                <th className="py-2 px-3 text-left">FECHA</th>
                <th className="py-2 px-3 text-left">TOTAL VENTAS</th>
                <th className="py-2 px-3 text-left">IGV</th>
                <th className="py-2 px-3 text-left">N° COMPROBANTES</th>
                <th className="py-2 px-3 text-left">TICKET PROMEDIO</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    No hay información para el filtro seleccionado.
                  </td>
                </tr>
              )}
              {filteredData.map((row) => (
                <tr key={`${row.fecha}-${tipoComprobante}`} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 px-3 text-gray-900 dark:text-gray-100">{formatShortLabelFromString(row.fecha)}</td>
                  <td className="py-2 px-3 font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(row.ventas)}</td>
                  <td className="py-2 px-3 text-gray-700 dark:text-gray-200">
                    {tipoComprobante === "Boletas" ? "--" : row.igv ? formatCurrency(row.igv) : "--"}
                  </td>
                  <td className="py-2 px-3">
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full px-2 py-1 text-xs font-semibold">
                      {row.comprobantes}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(row.ticket)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DetalleVentasDiariasModal;
