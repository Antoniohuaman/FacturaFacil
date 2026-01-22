import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FileDown, Search } from "lucide-react";
import DateRangePicker from "./DateRangePicker";
import { useConfigurationContext } from "../../configuracion-sistema/contexto/ContextoConfiguracion";
import { useIndicadoresFilters } from "../hooks/useIndicadoresFilters";
import type { ReportCategory, ReportDefinition } from "../models/reportDefinitions";
import { reportCategories, reportDefinitions } from "../models/reportDefinitions";
import { REPORTS_HUB_PATH } from "@/shared/export/autoExportParams";

type GroupedReports = Record<ReportCategory, ReportDefinition[]>;

const ReportsHub: React.FC = () => {
  const { state: configState } = useConfigurationContext();
  const {
    dateRange,
    setDateRange,
    EstablecimientoId,
    setEstablecimientoId
  } = useIndicadoresFilters();
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const [exportingReportId, setExportingReportId] = useState<string | null>(null);

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

  const normalizedSearch = search.trim().toLowerCase();

  const groupedReports = useMemo(() => {
    const base: GroupedReports = reportCategories.reduce((acc, category) => {
      acc[category] = [];
      return acc;
    }, {} as GroupedReports);

    reportDefinitions.forEach((definition) => {
      if (!normalizedSearch) {
        base[definition.category].push(definition);
        return;
      }

      const haystack = `${definition.name} ${definition.description}`.toLowerCase();
      if (haystack.includes(normalizedSearch)) {
        base[definition.category].push(definition);
      }
    });

    return base;
  }, [normalizedSearch]);

  const totalResults = reportCategories.reduce((total, category) => total + groupedReports[category].length, 0);
  const hasResults = totalResults > 0;

  const handleExportClick = (definition: ReportDefinition) => {
    if (exportingReportId) {
      return;
    }

    setExportingReportId(definition.id);
    const [pathname, existingSearch = ""] = definition.modulePath.split("?");
    const params = new URLSearchParams(existingSearch);
    params.set("autoExport", "1");
    params.set("reportId", definition.id);
    if (dateRange.startDate) {
      params.set("from", dateRange.startDate);
    } else {
      params.delete("from");
    }
    if (dateRange.endDate) {
      params.set("to", dateRange.endDate);
    } else {
      params.delete("to");
    }
    if (EstablecimientoId && EstablecimientoId !== "Todos") {
      params.set("EstablecimientoId", EstablecimientoId);
    } else {
      params.delete("EstablecimientoId");
    }

    const hubReturnPath = location.pathname.startsWith("/indicadores")
      ? `${location.pathname}${location.search || ""}`
      : REPORTS_HUB_PATH;
    params.set("returnTo", encodeURIComponent(hubReturnPath));

    navigate({ pathname, search: `?${params.toString()}` });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">Período</p>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">Establecimiento</p>
            <select
              value={EstablecimientoId}
              onChange={(event) => setEstablecimientoId(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              {EstablecimientoOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">Buscar</p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar reporte..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        {hasResults ? (
          reportCategories.map((category) => {
            const items = groupedReports[category];
            if (!items.length) {
              return null;
            }

            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">{category}</h3>
                    <span className="text-xs font-medium text-slate-500 dark:text-gray-400">({items.length})</span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-md bg-blue-50 p-1.5 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.name}</p>
                          <p className="text-xs text-slate-500 dark:text-gray-400">{item.description}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <Link
                          to={item.modulePath}
                          className="inline-flex h-8 items-center justify-center rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:text-white"
                        >
                          Abrir módulo
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleExportClick(item)}
                          disabled={Boolean(exportingReportId)}
                          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400"
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          Exportar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm font-medium text-slate-900 dark:text-white">No encontramos reportes para esa búsqueda.</p>
            <p className="text-xs text-slate-500 dark:text-gray-400">Prueba con otro término o limpia el filtro.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default ReportsHub;
