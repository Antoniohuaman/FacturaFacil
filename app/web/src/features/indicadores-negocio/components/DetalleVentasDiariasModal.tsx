import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type VentaDiaria = {
  fecha: string;
  ventas: number;
  igv?: number;
  comprobantes: number;
  ticket: number;
  boletas?: number;
  facturas?: number;
};

const ventasDiariasData: VentaDiaria[] = [
  { fecha: "09/09", ventas: 1200, igv: 216, comprobantes: 30, boletas: 18, facturas: 12, ticket: 40.0 },
  { fecha: "08/09", ventas: 3200, igv: 576, comprobantes: 60, boletas: 36, facturas: 24, ticket: 53.33 },
  { fecha: "07/09", ventas: 4800, igv: 864, comprobantes: 90, boletas: 54, facturas: 36, ticket: 53.33 },
  { fecha: "06/09", ventas: 2500, igv: 450, comprobantes: 50, boletas: 30, facturas: 20, ticket: 50.0 },
  { fecha: "05/09", ventas: 4100, igv: 738, comprobantes: 80, boletas: 48, facturas: 32, ticket: 51.25 },
  { fecha: "04/09", ventas: 4700, igv: 846, comprobantes: 95, boletas: 57, facturas: 38, ticket: 49.47 },
  { fecha: "03/09", ventas: 1800, igv: 324, comprobantes: 40, boletas: 24, facturas: 16, ticket: 45.0 },
  { fecha: "02/09", ventas: 3500, igv: 630, comprobantes: 70, boletas: 42, facturas: 28, ticket: 50.0 },
  { fecha: "01/09", ventas: 3900, igv: 702, comprobantes: 75, boletas: 45, facturas: 30, ticket: 52.0 },
];

interface DetalleVentasDiariasModalProps {
  open: boolean;
  onClose: () => void;
}

const DetalleVentasDiariasModal: React.FC<DetalleVentasDiariasModalProps> = ({ open, onClose }) => {
  const [tipoComprobante, setTipoComprobante] = useState<"Todos" | "Boletas" | "Facturas">("Todos");

  if (!open) return null;

  // Filtrar datos según tipo seleccionado
  const filteredData = ventasDiariasData
    .filter((row) => {
      if (tipoComprobante === "Boletas") return (row.boletas ?? 0) > 0;
      if (tipoComprobante === "Facturas") return (row.facturas ?? 0) > 0;
      return true;
    })
    .map((row) => {
      if (tipoComprobante === "Boletas") {
        // Simula que ventas y ticket promedio corresponden solo a boletas
        const ventasBoletas = row.ventas * ((row.boletas ?? 0) / row.comprobantes);
        const ticketBoletas = (row.boletas ?? 0) ? ventasBoletas / (row.boletas ?? 1) : 0;
        return {
          ...row,
          ventas: Math.round(ventasBoletas * 100) / 100,
          comprobantes: row.boletas ?? 0,
          ticket: Math.round(ticketBoletas * 100) / 100,
          igv: undefined, // para mostrar '--'
        };
      }
      if (tipoComprobante === "Facturas") {
        // Simula que ventas y ticket promedio corresponden solo a facturas
        const ventasFacturas = row.ventas * ((row.facturas ?? 0) / row.comprobantes);
        const ticketFacturas = (row.facturas ?? 0) ? ventasFacturas / (row.facturas ?? 1) : 0;
        return {
          ...row,
          ventas: Math.round(ventasFacturas * 100) / 100,
          comprobantes: row.facturas ?? 0,
          ticket: Math.round(ticketFacturas * 100) / 100,
        };
      }
      return row;
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-8 relative">
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          ✕
        </button>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Detalle de Ventas Diarias</h2>
          <div className="flex items-center gap-3">
            <label className="text-base font-medium text-gray-700">Comprobantes:</label>
            <select
              value={tipoComprobante}
              onChange={(e) => setTipoComprobante(e.target.value as "Todos" | "Boletas" | "Facturas")}
              className="border rounded-lg px-4 py-2 text-base min-w-[140px] text-gray-900 focus:outline-none"
              style={{ height: "40px", fontSize: "1rem", verticalAlign: "middle" }}
            >
              <option value="Todos">Todos</option>
              <option value="Boletas">Boletas</option>
              <option value="Facturas">Facturas</option>
            </select>
          </div>
        </div>

        <div className="mb-8">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="fecha"
                tickFormatter={(value: string) => {
                  const [day, month] = value.split("/");
                  const monthNames: Record<string, string> = {
                    "09": "Set",
                    "08": "Ago",
                    "07": "Jul",
                    "06": "Jun",
                    "05": "May",
                    "04": "Abr",
                    "03": "Mar",
                    "02": "Feb",
                    "01": "Ene",
                  };
                  return `${day} ${monthNames[month] || month}`;
                }}
              />
              <YAxis
                ticks={[0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000]}
                domain={[0, 5000]}
                interval={0}
                tickFormatter={(value: number) => value.toLocaleString("es-PE").replace(/,/g, " ")}
              />
              <RechartsTooltip />
              <Bar dataKey="ventas" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b">
                <th className="py-2 px-3 text-left">FECHA</th>
                <th className="py-2 px-3 text-left">TOTAL VENTAS</th>
                <th className="py-2 px-3 text-left">IGV</th>
                <th className="py-2 px-3 text-left">N° COMPROBANTES</th>
                <th className="py-2 px-3 text-left">TICKET PROMEDIO</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row) => (
                <tr key={row.fecha} className="border-b">
                  <td className="py-2 px-3">{
                    (() => {
                      const [day, month] = row.fecha.split("/");
                      const monthNames: Record<string, string> = {
                        "09": "Set",
                        "08": "Ago",
                        "07": "Jul",
                        "06": "Jun",
                        "05": "May",
                        "04": "Abr",
                        "03": "Mar",
                        "02": "Feb",
                        "01": "Ene",
                      };
                      return `${day} ${monthNames[month] || month}`;
                    })()
                  }</td>
                  <td className="py-2 px-3 font-semibold text-gray-900">S/ {row.ventas.toLocaleString()}</td>
                  <td className="py-2 px-3">{tipoComprobante === "Boletas" ? "--" : `S/ ${row.igv?.toLocaleString()}`}</td>
                  <td className="py-2 px-3">
                    <span className="bg-blue-100 text-blue-700 rounded-full px-2 py-1 text-xs font-semibold">{row.comprobantes}</span>
                  </td>
                  <td className="py-2 px-3 font-semibold text-gray-900">S/ {row.ticket.toLocaleString()}</td>
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
