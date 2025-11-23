import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Award, ShoppingCart, Users } from "lucide-react";
import DetalleVentasDiariasModal from "../components/DetalleVentasDiariasModal";
import DetalleCrecimientoModal from "../components/DetalleCrecimientoModal";
import Toolbar, { PageHeader } from "../components/Toolbar";
import KpiCards from "../components/KpiCards";
import VentasPorComprobanteCard from "../components/VentasPorComprobanteCard";
import VentasPorEstablecimientoCard from "../components/VentasPorEstablecimientoCard";
import DetalleVentasDiariasCard from "../components/DetalleVentasDiariasCard";
import { createCurrentMonthRange } from "../models/dateRange";
import type { DateRange } from "../models/dateRange";
import { useIndicadores } from "../hooks/useIndicadores";
import { formatRangeLabel } from "../utils/formatters";

const topVendedores = [
  { name: "Ana García", value: "S/ 125,480.75", info: "Vendedor", change: "+15.2%", color: "text-green-600", no: 1 },
  { name: "Carlos López", value: "S/ 98,750.50", info: "Vendedor", change: "+8.7%", color: "text-green-600", no: 2 },
  { name: "María Rodríguez", value: "S/ 87,320.25", info: "Vendedor", change: "-3.1%", color: "text-red-500", no: 3 },
  { name: "José Martínez", value: "S/ 76,890.00", info: "Vendedor", change: "+22.4%", color: "text-green-600", no: 4 },
];

const productosMasVendidos = [
  { name: "Laptop HP Pavilion", value: "S/ 89,750.50", info: "145 unidades", change: "+18.5%", color: "text-green-600", no: 1 },
  { name: "Mouse Inalámbrico", value: "S/ 12,800.00", info: "320 unidades", change: "+25.3%", color: "text-green-600", no: 2 },
  { name: "Teclado Mecánico", value: "S/ 18,500.75", info: "185 unidades", change: "+12.1%", color: "text-green-600", no: 3 },
  { name: 'Monitor 24"', value: "S/ 35,280.00", info: "98 unidades", change: "-5.2%", color: "text-red-500", no: 4 },
];

const clientesPrincipales = [
  { name: "Empresa XYZ S.A.C.", value: "S/ 45,750.25", info: "28 compras", change: "+32.1%", color: "text-green-600", no: 1 },
  { name: "Comercial ABC E.I.R.L.", value: "S/ 38,920.50", info: "22 compras", change: "+18.7%", color: "text-green-600", no: 2 },
  { name: "Distribuidora 123", value: "S/ 32,150.75", info: "35 compras", change: "+8.9%", color: "text-green-600", no: 3 },
  { name: "Inversiones DEF", value: "S/ 28,480.00", info: "18 compras", change: "-12.3%", color: "text-red-500", no: 4 },
];

const IndicadoresPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedRange, setSelectedRange] = useState<DateRange>(() => createCurrentMonthRange());
  const [selectedEstablishment, setSelectedEstablishment] = useState<string>('Todos');
  const [openDetalleModal, setOpenDetalleModal] = useState(false);
  const [openDetalleCrecimientoModal, setOpenDetalleCrecimientoModal] = useState(false);

  const filters = useMemo(
    () => ({
      dateRange: selectedRange,
      establishmentId: selectedEstablishment,
    }),
    [selectedRange, selectedEstablishment]
  );

  const { data, loading, error } = useIndicadores(filters);

  const handleCrearComprobante = () => {
    navigate("/comprobantes/nuevo");
  };

  const handleFiltrar = () => {
    console.log("Filtros aplicados:", filters);
    alert(
      `Filtros aplicados:\nPeriodo: ${formatRangeLabel(selectedRange)}\nEstablecimiento: ${selectedEstablishment || "Todos"}`
    );
  };

  const handleRangeChange = (range: DateRange) => {
    setSelectedRange(range);
  };

  return (
    <div>
      {/* HEADER DE PÁGINA - Título separado */}
      <PageHeader title="Indicadores de Gestión" />
      
      {/* TOOLBAR - Controles y acciones */}
      <Toolbar
        onFilter={handleFiltrar}
        onCreateDocument={handleCrearComprobante}
        onEstablishmentChange={(establishment: string) => setSelectedEstablishment(establishment)}
        onDateRangeChange={handleRangeChange}
      />

      <div className="p-4 md:p-6">
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            No se pudieron cargar los indicadores. Intenta nuevamente.
          </div>
        )}
        {loading && !data && (
          <div className="text-sm text-gray-500">Cargando indicadores...</div>
        )}

        {data && (
          <>
            <KpiCards data={data.kpis} onViewGrowthDetails={() => setOpenDetalleCrecimientoModal(true)} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <VentasPorComprobanteCard data={data.ventasPorComprobante} dateRange={selectedRange} totalVentasPeriodo={data.totalVentasPeriodo} />
              <VentasPorEstablecimientoCard data={data.ventasPorEstablecimiento} dateRange={selectedRange} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-0">
                <div className="flex items-center justify-between px-6 pt-6 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg"><Award className="h-5 w-5 text-gray-700 dark:text-gray-300" /></span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">Top Vendedores</span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-semibold">Montos</span>
                </div>
                <div className="px-6 pb-4">
                  {topVendedores.map((v) => (
                    <div key={v.name} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-white ${v.no === 1 ? "bg-blue-700" : "bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300"}`}>{v.no}</div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">{v.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{v.info} <span className={`${v.color} font-semibold ml-1`}>{v.change}</span></div>
                        </div>
                      </div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{v.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-0">
                <div className="flex items-center justify-between px-6 pt-6 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg"><ShoppingCart className="h-5 w-5 text-gray-700 dark:text-gray-300" /></span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">Productos Más Vendidos</span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-semibold">Montos</span>
                </div>
                <div className="px-6 pb-4">
                  {productosMasVendidos.map((p) => (
                    <div key={p.name} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-white ${p.no === 1 ? "bg-blue-700" : "bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300"}`}>{p.no}</div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">{p.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{p.info} <span className={`${p.color} font-semibold ml-1`}>{p.change}</span></div>
                        </div>
                      </div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{p.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-0">
                <div className="flex items-center justify-between px-6 pt-6 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg"><Users className="h-5 w-5 text-gray-700 dark:text-gray-300" /></span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">Clientes Principales</span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-semibold">Montos</span>
                </div>
                <div className="px-6 pb-4">
                  {clientesPrincipales.map((c) => (
                    <div key={c.name} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-white ${c.no === 1 ? "bg-blue-700" : "bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300"}`}>{c.no}</div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">{c.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{c.info} <span className={`${c.color} font-semibold ml-1`}>{c.change}</span></div>
                        </div>
                      </div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{c.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DetalleVentasDiariasCard data={data.ventasDiarias} onViewMore={() => setOpenDetalleModal(true)} />
          </>
        )}
      </div>

      <DetalleVentasDiariasModal open={openDetalleModal} onClose={() => setOpenDetalleModal(false)} />
      <DetalleCrecimientoModal open={openDetalleCrecimientoModal} onClose={() => setOpenDetalleCrecimientoModal(false)} />
    </div>
  );
};

export default IndicadoresPage;
