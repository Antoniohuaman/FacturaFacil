import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const dataComparativo = [
  { semana: "Semana pasada", ventas: 14200 },
  { semana: "Semana actual", ventas: 15900 },
];

const DetalleCrecimientoModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  if (!open) return null;

  const crecimiento = ((15900 - 14200) / 14200 * 100).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-8 relative">
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          ✕
        </button>
        <h2 className="text-xl font-bold mb-4 text-gray-900">Detalle de Crecimiento</h2>

        <p className="text-gray-700 mb-6">
          Tus ventas crecieron <span className="font-bold text-green-600">{crecimiento}%</span> 
          respecto a la semana anterior.
        </p>

        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={dataComparativo}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="semana" />
            <YAxis tickFormatter={(value) => `S/ ${value.toLocaleString()}`} />
            <Tooltip formatter={(value: number) => `S/ ${value.toLocaleString()}`} />
            <Bar dataKey="ventas" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={50} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DetalleCrecimientoModal;
