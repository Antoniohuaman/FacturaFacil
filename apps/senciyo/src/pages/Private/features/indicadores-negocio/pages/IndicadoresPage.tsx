import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Award, Settings, ShoppingCart, Users } from "lucide-react";
import DetalleVentasDiariasModal from "../components/DetalleVentasDiariasModal";
import DetalleCrecimientoModal from "../components/DetalleCrecimientoModal";
import Toolbar from "../components/Toolbar";
import ReportsHub from "../components/ReportsHub";
import KpiCards from "../components/KpiCards";
import RentabilidadVentasPage from "./RentabilidadVentasPage";
import VentasPorComprobanteCard from "../components/VentasPorComprobanteCard";
import VentasPorEstablecimientoCard from "../components/VentasPorEstablecimientoCard";
import DetalleVentasDiariasCard from "../components/DetalleVentasDiariasCard";
import RankingCard from "../components/RankingCard";
import ClientesInsightsCard from "../components/ClientesInsightsCard";
import FormasPagoCard from "../components/FormasPagoCard";
import NotificacionIndicadorModal from "../components/NotificacionIndicadorModal";
import PageHeader from "../../../../../components/PageHeader";
import { useIndicadores } from "../hooks/useIndicadores";
import { useIndicadoresFilters } from "../hooks/useIndicadoresFilters";
import { useNotificacionesIndicador } from "../hooks/useNotificacionesIndicador";
import { createEmptyNotificacionPayload } from "../models/notificacionesDefaults";
import {
  resolverVistaIndicadores,
  construirNavegacionVista,
  construirNormalizacionVista,
  type IndicadoresFilters,
  type IndicadoresView
} from "../models/indicadores";
import type { NotificacionIndicadorPayload } from "../models/notificaciones";
import { useConfigurationContext } from "../../configuracion-sistema/contexto/ContextoConfiguracion";
import { useComprobanteContext } from "../../comprobantes-electronicos/lista-comprobantes/contexts/ComprobantesListContext";
import { useFocusFromQuery } from "../../../../../hooks/useFocusFromQuery";
import { StockRepository } from "../../gestion-inventario/repositories/stock.repository";
import { listarConsumosCapaCostoInventarioPorEmpresa } from "../../gestion-inventario/repositories/consumoCapaCostoInventario.repository";
import { listarCapasCostoInventarioPorEmpresa } from "../../gestion-inventario/repositories/capaCostoInventario.repository";
import { proyectarFilasRentabilidadVentas, calcularIndicadoresRentabilidad } from "../services/consultaRentabilidadVentas.service";
import { getTenantEmpresaId } from "@/shared/tenant";
import { currencyManager } from "@/shared/currency";

const NOTIFICADOR_GENERAL_ID = "indicadores-general";
type IndicatorsTab = IndicadoresView;

// Orden obligatorio de navegación (mejora de UX/visibilidad, §3-§6): Resumen → Rentabilidad →
// Reportes. Única definición visual — reutilizada tal cual, nunca copiada a otra página.
const INDICADORES_TABS: Array<{ id: IndicatorsTab; label: string }> = [
  { id: "resumen", label: "Resumen" },
  { id: "rentabilidad", label: "Rentabilidad" },
  { id: "reportes", label: "Reportes" }
];

const IndicadoresPage: React.FC = () => {
  useFocusFromQuery();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawView = searchParams.get("view");
  const activeView: IndicatorsTab = resolverVistaIndicadores(rawView);

  // Único punto de navegación entre pestañas (nunca una segunda función/lógica de navegación).
  // Por defecto genera una entrada de historial real (Atrás/Adelante deben poder recuperar la
  // pestaña anterior); `options.replace` se reserva para normalización/compatibilidad, nunca para
  // un cambio de pestaña iniciado por el usuario.
  const handleViewChange = useCallback((nextView: IndicatorsTab, options?: { replace?: boolean }) => {
    const decision = construirNavegacionVista(Object.fromEntries(searchParams), nextView);
    if (!decision) {
      return;
    }
    setSearchParams(decision.params, { replace: options?.replace ?? decision.replace });
  }, [searchParams, setSearchParams]);

  // Normaliza una URL inválida (view desconocido o "resumen" explícito redundante) sin generar
  // historial — nunca window.location, nunca una segunda función de navegación: misma decisión
  // pura (`construirNormalizacionVista`) que ya usa `handleViewChange` para los cambios reales.
  useEffect(() => {
    const decision = construirNormalizacionVista(Object.fromEntries(searchParams));
    if (decision) {
      setSearchParams(decision.params, { replace: decision.replace });
    }
  }, [searchParams, setSearchParams]);
  const isReportView = activeView === "reportes";
  const isRentabilidadView = activeView === "rentabilidad";
  const isResumenView = activeView === "resumen";
  const [openDetalleModal, setOpenDetalleModal] = useState(false);
  const [openDetalleCrecimientoModal, setOpenDetalleCrecimientoModal] = useState(false);
  const [openNotificacionesModal, setOpenNotificacionesModal] = useState(false);
  const { dateRange, EstablecimientoId } = useIndicadoresFilters();
  const { state: configState } = useConfigurationContext();
  const { state: comprobanteState } = useComprobanteContext();

  const filters = useMemo<IndicadoresFilters>(() => ({
    dateRange,
    EstablecimientoId
  }), [dateRange, EstablecimientoId]);

  const { data, status, error } = useIndicadores(filters);

  // Utilidad bruta del carrusel (§10-§11) — reutiliza la MISMA proyección central de
  // Rentabilidad de Ventas, nunca una fórmula duplicada en este archivo ni en KpiCards.tsx.
  // Solo se lee/calcula en la vista Resumen (§19): en Rentabilidad/Reportes esta tarjeta no se
  // renderiza, así que recalcularla ahí sería trabajo duplicado e innecesario.
  const empresaId = getTenantEmpresaId();
  const monedaBaseRentabilidad = currencyManager.getSnapshot().baseCurrency.code;
  const movimientosRentabilidad = useMemo(() => (isResumenView ? StockRepository.getMovements() : []), [isResumenView]);
  const consumosRentabilidad = useMemo(() => (isResumenView ? listarConsumosCapaCostoInventarioPorEmpresa(empresaId) : []), [isResumenView, empresaId]);
  const capasRentabilidad = useMemo(() => (isResumenView ? listarCapasCostoInventarioPorEmpresa(empresaId) : []), [isResumenView, empresaId]);

  const indicadoresRentabilidad = useMemo(() => {
    if (!isResumenView) return null;
    const filas = proyectarFilasRentabilidadVentas({
      empresaId,
      monedaBase: monedaBaseRentabilidad,
      comprobantes: comprobanteState.comprobantes,
      movimientos: movimientosRentabilidad,
      consumos: consumosRentabilidad,
      capas: capasRentabilidad,
      periodo: { desde: dateRange.startDate, hasta: dateRange.endDate },
      establecimientoId: EstablecimientoId,
    });
    return calcularIndicadoresRentabilidad(filas);
  }, [isResumenView, empresaId, monedaBaseRentabilidad, comprobanteState.comprobantes, movimientosRentabilidad, consumosRentabilidad, capasRentabilidad, dateRange.startDate, dateRange.endDate, EstablecimientoId]);

  // Navega cambiando únicamente el query param "view" — la MISMA función que usan las pestañas,
  // nunca una segunda lógica de navegación ni window.location; conserva periodo/establecimiento
  // porque ambos viven en el store compartido `useIndicadoresFilters`, no en la URL.
  const handleVerRentabilidad = () => handleViewChange("rentabilidad");

  const normalizedEstablecimientoId = EstablecimientoId || "Todos";
  const notificationsFilters = useMemo(() => ({
    indicatorId: NOTIFICADOR_GENERAL_ID,
    establecimientoId: normalizedEstablecimientoId !== "Todos" ? normalizedEstablecimientoId : undefined
  }), [normalizedEstablecimientoId]);

  const notificationsState = useNotificacionesIndicador(notificationsFilters);

  const EstablecimientoOptions = useMemo(() => {
    const activos = configState.Establecimientos.filter(
      (est) => est.estaActivoEstablecimiento !== false
    );
    return [
      { value: "Todos", label: "Todos los establecimientos" },
      ...activos.map((est) => ({
        value: est.id,
        label: `${est.codigoEstablecimiento ?? est.id} - ${est.nombreEstablecimiento}`
      }))
    ];
  }, [configState.Establecimientos]);

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
  const companyName = configState.company?.razonSocial ?? configState.company?.nombreComercial ?? "Empresa actual";

  const createNotificationPayload = useCallback((): NotificacionIndicadorPayload => {
    const rest = createEmptyNotificacionPayload();
    return {
      ...rest,
      indicadorId: NOTIFICADOR_GENERAL_ID,
      segmento: {
        empresaId: companyId,
        establecimientoId: normalizedEstablecimientoId,
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
  }, [companyId, normalizedEstablecimientoId, defaultCurrencyCode]);

  return (
    <div>
      {/* HEADER DE PÁGINA - Título separado */}
      <PageHeader
        title="Indicadores de Gestión"
        actions={(
          <div className="flex items-center gap-3">
            <div className="flex rounded-full border border-slate-200 bg-white p-1 text-sm font-semibold text-slate-600 shadow-sm dark:border-gray-600 dark:bg-gray-800">
              {INDICADORES_TABS.map((tab) => {
                const isActive = activeView === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleViewChange(tab.id)}
                    aria-pressed={isActive}
                    className={`rounded-full px-4 py-1.5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${isActive ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:text-slate-900 dark:text-gray-300 dark:hover:text-white"}`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setOpenNotificacionesModal(true)}
              className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 hover:text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              aria-label="Configurar notificaciones"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        )}
      />
      
      {/* TOOLBAR - Controles y acciones (solo Resumen; Rentabilidad tiene su propio bloque de
          Período/Establecimiento y Reportes el suyo — nunca duplicar el filtro) */}
      {isResumenView && <Toolbar />}

      {isReportView ? (
        <ReportsHub />
      ) : isRentabilidadView ? (
        <RentabilidadVentasPage />
      ) : (
        <div className="p-4 md:p-6">
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
              <KpiCards
                data={data.kpis}
                onViewGrowthDetails={() => setOpenDetalleCrecimientoModal(true)}
                rentabilidad={indicadoresRentabilidad ? {
                  utilidadBruta: indicadoresRentabilidad.utilidadBrutaCubierta,
                  margenBrutoCubierto: indicadoresRentabilidad.margenBrutoCubierto,
                  coberturaPorcentaje: indicadoresRentabilidad.coberturaPorcentaje,
                  monedaBase: monedaBaseRentabilidad
                } : undefined}
                onVerRentabilidad={handleVerRentabilidad}
              />

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
      )}

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
        Establecimientos={EstablecimientoOptions}
        currencies={currencyOptions}
        createPayload={createNotificationPayload}
        notificationsState={notificationsState}
      />
    </div>
  );
};

export default IndicadoresPage;
