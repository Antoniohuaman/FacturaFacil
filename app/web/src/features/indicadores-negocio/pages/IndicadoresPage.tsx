import React, { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, Settings, ShoppingCart, Users } from "lucide-react";
import DetalleVentasDiariasModal from "../components/DetalleVentasDiariasModal";
import DetalleCrecimientoModal from "../components/DetalleCrecimientoModal";
import Toolbar from "../components/Toolbar";
import KpiCards from "../components/KpiCards";
import VentasPorComprobanteCard from "../components/VentasPorComprobanteCard";
import VentasPorEstablecimientoCard from "../components/VentasPorEstablecimientoCard";
import DetalleVentasDiariasCard from "../components/DetalleVentasDiariasCard";
import RankingCard from "../components/RankingCard";
import ClientesInsightsCard from "../components/ClientesInsightsCard";
import FormasPagoCard from "../components/FormasPagoCard";
import NotificacionIndicadorModal from "../components/NotificacionIndicadorModal";
import PageHeader from "../../../components/PageHeader";
import { useIndicadores } from "../hooks/useIndicadores";
import { formatRangeLabel } from "../utils/formatters";
import { useIndicadoresFilters } from "../hooks/useIndicadoresFilters";
import { useNotificacionesIndicador } from "../hooks/useNotificacionesIndicador";
import { createEmptyNotificacionPayload } from "../models/notificacionesDefaults";
import type { IndicadoresFilters } from "../models/indicadores";
import type { NotificacionIndicadorPayload } from "../models/notificaciones";
import { useConfigurationContext } from "../../configuracion-sistema/context/ConfigurationContext";
import { useFocusFromQuery } from "../../../hooks/useFocusFromQuery";

const NOTIFICADOR_GENERAL_ID = "indicadores-general";

const IndicadoresPage: React.FC = () => {
  useFocusFromQuery();
  const navigate = useNavigate();
  const [openDetalleModal, setOpenDetalleModal] = useState(false);
  const [openDetalleCrecimientoModal, setOpenDetalleCrecimientoModal] = useState(false);
  const [openNotificacionesModal, setOpenNotificacionesModal] = useState(false);
  const { dateRange, establishmentId } = useIndicadoresFilters();
  const { state: configState } = useConfigurationContext();

  const filters = useMemo<IndicadoresFilters>(() => ({
    dateRange,
    establishmentId
  }), [dateRange, establishmentId]);

  const { data, status, error, source } = useIndicadores(filters);

  const normalizedEstablishmentId = establishmentId || "Todos";
  const notificationsFilters = useMemo(() => ({
    indicatorId: NOTIFICADOR_GENERAL_ID,
    establecimientoId: normalizedEstablishmentId !== "Todos" ? normalizedEstablishmentId : undefined
  }), [normalizedEstablishmentId]);

  const notificationsState = useNotificacionesIndicador(notificationsFilters);

  const establishmentOptions = useMemo(() => {
    const activos = configState.establishments.filter((est) => est.isActive !== false);
    return [
      { value: "Todos", label: "Todos los establecimientos" },
      ...activos.map((est) => ({ value: est.id, label: `${est.code ?? est.id} - ${est.name}` }))
    ];
  }, [configState.establishments]);

  const currencyOptions = useMemo(() => {
    if (!configState.currencies.length) {
      return [{ value: "PEN", label: "PEN" }];
    }
    return configState.currencies.map((currency) => ({
      value: currency.code,
      label: `${currency.code} · ${currency.symbol}`
    }));
  }, [configState.currencies]);

  const defaultCurrencyCode = currencyOptions[0]?.value ?? "PEN";
  const companyId = configState.company?.id ?? "empresa-actual";
  const companyName = configState.company?.businessName ?? configState.company?.tradeName ?? "Empresa actual";

  const createNotificationPayload = useCallback((): NotificacionIndicadorPayload => {
    const rest = createEmptyNotificacionPayload();
    return {
      ...rest,
      indicadorId: NOTIFICADOR_GENERAL_ID,
      segmento: {
        empresaId: companyId,
        establecimientoId: normalizedEstablishmentId,
        moneda: defaultCurrencyCode
      },
      vigencia: {
        fechaInicio: rest.vigencia.fechaInicio,
        fechaFin: rest.vigencia.fechaFin ?? ''
      },
      destinatario: {
        email: '',
        telefono: ''
      }
    };
  }, [companyId, normalizedEstablishmentId, defaultCurrencyCode]);

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
      <PageHeader
        title="Indicadores de Gestión"
        actions={(
          <button
            type="button"
            onClick={() => setOpenNotificacionesModal(true)}
            className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 hover:text-gray-800"
            aria-label="Configurar notificaciones"
          >
            <Settings className="h-4 w-4" />
          </button>
        )}
      />
      
      {/* TOOLBAR - Controles y acciones */}
      <Toolbar
        onFilter={handleFiltrar}
        onCreateDocument={handleCrearComprobante}
      />

      <div className="p-4 md:p-6">
        {status === 'success' && (
          <div className="mb-2 flex flex-wrap gap-3 text-xs text-gray-500 leading-relaxed">
            <span>
              Origen de datos: {
                source === 'api'
                  ? 'Servicio real'
                  : source === 'dev-local'
                    ? 'Datos locales (dev)'
                    : source === 'fallback'
                      ? 'Fallback local'
                      : 'Sin definir'
              }
            </span>
            <span>
              Notificaciones: {notificationsState.hasActivas ? 'activas' : 'sin activar'}
            </span>
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
                footer={
                  data.ranking.productosConcentracion.topN > 0
                    ? `Top ${data.ranking.productosConcentracion.topN} productos concentran ${data.ranking.productosConcentracion.porcentaje.toFixed(1)}% de las ventas`
                    : undefined
                }
              />
              <RankingCard
                title="Clientes Principales"
                icon={<Users className="h-5 w-5" />}
                items={data.ranking.clientesPrincipales}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <ClientesInsightsCard data={data.clientesInsights} />
              <FormasPagoCard data={data.formasPagoDistribucion} />
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
      <NotificacionIndicadorModal
        open={openNotificacionesModal}
        onClose={() => setOpenNotificacionesModal(false)}
        companyName={companyName}
        establishments={establishmentOptions}
        currencies={currencyOptions}
        createPayload={createNotificationPayload}
        notificationsState={notificationsState}
      />
    </div>
  );
};

export default IndicadoresPage;
