
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const data = [
  { fecha: "09/09", ventas: 15420, igv: 2775.6, comprobantes: 92, ticket: 167.61 },
  { fecha: "08/09", ventas: 13200, igv: 2376, comprobantes: 85, ticket: 155.29 },
  { fecha: "07/09", ventas: 9800, igv: 1764, comprobantes: 70, ticket: 140.00 },
  { fecha: "06/09", ventas: 11250, igv: 2025, comprobantes: 78, ticket: 144.23 },
  { fecha: "05/09", ventas: 14500, igv: 2610, comprobantes: 88, ticket: 164.77 },
  { fecha: "04/09", ventas: 12300, igv: 2214, comprobantes: 80, ticket: 153.75 },
  { fecha: "03/09", ventas: 11000, igv: 1980, comprobantes: 75, ticket: 146.67 },
  { fecha: "02/09", ventas: 9500, igv: 1710, comprobantes: 68, ticket: 139.71 },
  { fecha: "01/09", ventas: 10200, igv: 1836, comprobantes: 72, ticket: 141.67 },
];

const DetalleVentasDiariasModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-8 relative">
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          ✕
        </button>
        <h2 className="text-xl font-bold text-gray-900 mb-6">Detalle de Ventas Diarias</h2>
        <div className="mb-8">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" />
              <YAxis />
              <Tooltip />
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
              {data.map((row) => (
                <tr key={row.fecha} className="border-b">
                  <td className="py-2 px-3">{row.fecha}</td>
                  <td className="py-2 px-3 font-semibold text-gray-900">S/ {row.ventas.toLocaleString()}</td>
                  <td className="py-2 px-3">S/ {row.igv.toLocaleString()}</td>
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
