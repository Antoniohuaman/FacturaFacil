import React, { useMemo, useState } from "react";
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
import { useIndicadores } from "../hooks/useIndicadores";
import { formatRangeLabel } from "../utils/formatters";
import { useIndicadoresFilters } from "../hooks/useIndicadoresFilters";
import type { IndicadoresFilters } from "../models/indicadores";

const IndicadoresPage: React.FC = () => {
  const navigate = useNavigate();
  const [openDetalleModal, setOpenDetalleModal] = useState(false);
  const [openDetalleCrecimientoModal, setOpenDetalleCrecimientoModal] = useState(false);
  const { dateRange, establishmentId } = useIndicadoresFilters();

  const filters = useMemo<IndicadoresFilters>(() => ({
    dateRange,
    establishmentId
  }), [dateRange, establishmentId]);

  const { data, status, error, source } = useIndicadores(filters);

  const handleCrearComprobante = () => {
    navigate("/comprobantes/nuevo");
  };

  const handleFiltrar = () => {
    console.log("Filtros aplicados:", filters);
    alert(
      `Filtros aplicados:\nPeriodo: ${formatRangeLabel(dateRange)}\nEstablecimiento: ${establishmentId || "Todos"}`
    );
  };

  return (
    <div>
      {/* HEADER DE PÁGINA - Título separado */}
      <PageHeader title="Indicadores de Gestión" />
      
      {/* TOOLBAR - Controles y acciones */}
      <Toolbar
        onFilter={handleFiltrar}
        onCreateDocument={handleCrearComprobante}
      />

      <div className="p-4 md:p-6">
        {status === 'success' && (
          <div className="mb-4 text-xs text-gray-500">
            Origen de datos: {source === 'api' ? 'Servicio real' : source === 'fallback' ? 'Fallback local' : 'Sin definir'}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            No se pudieron cargar los indicadores. Intenta nuevamente.
          </div>
        )}
        {status === 'loading' && (
          <div className="text-sm text-gray-500">Cargando indicadores...</div>
        )}

        {data && (
          <>
            <KpiCards data={data.kpis} onViewGrowthDetails={() => setOpenDetalleCrecimientoModal(true)} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <VentasPorComprobanteCard data={data.ventasPorComprobante} dateRange={dateRange} totalVentasPeriodo={data.totalVentasPeriodo} />
              <VentasPorEstablecimientoCard data={data.ventasPorEstablecimiento} dateRange={dateRange} />
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
