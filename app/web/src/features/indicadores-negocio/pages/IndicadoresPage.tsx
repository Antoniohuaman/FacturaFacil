import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Award, ShoppingCart, Users } from "lucide-react";
import DetalleVentasDiariasModal from "../components/DetalleVentasDiariasModal";
import DetalleCrecimientoModal from "../components/DetalleCrecimientoModal";
import Toolbar from "../components/Toolbar";
import KpiCards from "../components/KpiCards";
import VentasPorComprobanteCard from "../components/VentasPorComprobanteCard";
import VentasPorEstablecimientoCard from "../components/VentasPorEstablecimientoCard";
import DetalleVentasDiariasCard from "../components/DetalleVentasDiariasCard";
import RankingCard from "../components/RankingCard";
import PageHeader from "../../../components/PageHeader";
import { createCurrentMonthRange } from "../models/dateRange";
import type { DateRange } from "../models/dateRange";
import { useIndicadores } from "../hooks/useIndicadores";
import { formatRangeLabel } from "../utils/formatters";

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
              <RankingCard
                title="Top Vendedores"
                icon={<Award className="h-5 w-5" />}
                items={data.ranking.topVendedores}
              />
              <RankingCard
                title="Productos Más Vendidos"
                icon={<ShoppingCart className="h-5 w-5" />}
                items={data.ranking.productosDestacados}
              />
              <RankingCard
                title="Clientes Principales"
                icon={<Users className="h-5 w-5" />}
                items={data.ranking.clientesPrincipales}
              />
            </div>

            <DetalleVentasDiariasCard data={data.ventasDiarias} onViewMore={() => setOpenDetalleModal(true)} />
          </>
        )}
      </div>

      <DetalleVentasDiariasModal
        open={openDetalleModal}
        onClose={() => setOpenDetalleModal(false)}
        data={data?.ventasDiarias ?? []}
      />
      <DetalleCrecimientoModal
        open={openDetalleCrecimientoModal}
        onClose={() => setOpenDetalleCrecimientoModal(false)}
        detalle={data?.crecimientoDetalle}
      />
    </div>
  );
};

export default IndicadoresPage;
