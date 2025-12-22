import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ShoppingCart, Users, DollarSign, TrendingUp, Ticket, Ban, ChevronLeft, ChevronRight } from 'lucide-react';
import type { KpiSummary } from '../models/indicadores';
import { formatCurrency } from '../utils/formatters';

interface KpiCardsProps {
  data: KpiSummary;
  onViewGrowthDetails: () => void;
}

/**
 * Card compacto (rectangular):
 * - Menos alto
 * - Contenido más "horizontal"
 * - Mantiene flex y responsive
 */
const cardBase =
  'flex-1 min-w-[240px] sm:min-w-[260px] max-w-[320px] min-h-[92px] flex flex-col rounded-2xl p-3 shadow-sm snap-start border';

const KpiCards: React.FC<KpiCardsProps> = ({ data, onViewGrowthDetails }) => {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = () => {
    const el = scrollerRef.current;
    if (!el) return;

    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    // tolerancia de 1px por subpixeles
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft < maxScrollLeft - 1);
  };

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => updateArrows();
    el.addEventListener('scroll', onScroll, { passive: true });

    const ro = new ResizeObserver(() => updateArrows());
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, []);

  const scrollByCards = (direction: 'left' | 'right') => {
    const el = scrollerRef.current;
    if (!el) return;

    // Avanza aprox 1.2 cards (suave y natural)
    const step = Math.round(el.clientWidth * 0.75);
    el.scrollBy({ left: direction === 'left' ? -step : step, behavior: 'smooth' });
  };

  const scrollerClass = useMemo(() => {
    // scrollbar “moderno”: oculto visualmente pero sigue funcionando
    // (sin plugins, solo CSS inline + Tailwind)
    return [
      'flex flex-nowrap gap-3 md:gap-4',
      'overflow-x-auto pb-2',
      'snap-x snap-mandatory',
      // suavidad y “feeling” moderno
      'scroll-smooth',
      // evita que se vea el scrollbar en algunos navegadores (acompañado con style)
      '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
    ].join(' ');
  }, []);

  return (
    <div className="relative mb-5">
      {/* Flecha Izquierda */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByCards('left')}
          aria-label="Ver KPIs anteriores"
          className="hidden md:flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full border bg-white/90 shadow-sm hover:bg-white transition dark:bg-gray-900/80 dark:border-gray-700"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      {/* Flecha Derecha */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByCards('right')}
          aria-label="Ver más KPIs"
          className="hidden md:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full border bg-white/90 shadow-sm hover:bg-white transition dark:bg-gray-900/80 dark:border-gray-700"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Contenedor scroll */}
      <div
        ref={scrollerRef}
        className={scrollerClass}
        style={{
          // asegura ocultar scrollbar en webkit (por si no aplica el selector)
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {/* Card 1 */}
        <div
          className={`${cardBase} bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30`}
          data-focus="indicadores:kpi:ventas"
        >
          {/* Header compacto */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-blue-200 dark:bg-blue-800 rounded-lg">
                <ShoppingCart className="h-5 w-5 text-blue-800 dark:text-blue-200" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">Total de Ventas</h3>
                <p className="text-lg lg:text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                  {formatCurrency(data.totalVentas)}
                </p>
              </div>
            </div>

            <span className="shrink-0 text-[0.65rem] lg:text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800/50 px-2 py-0.5 rounded-full">
              {data.totalVentasTrend}
            </span>
          </div>

          <p className="text-[0.7rem] text-gray-500 dark:text-gray-400 mt-auto">Periodo seleccionado</p>
        </div>

        {/* Card 2 */}
        <div
          className={`${cardBase} bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800/30`}
          data-focus="indicadores:kpi:clientes"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-green-200 dark:bg-green-800 rounded-lg">
                <Users className="h-5 w-5 text-green-800 dark:text-green-200" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">Nuevos Clientes</h3>
                <p className="text-lg lg:text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                  {data.nuevosClientes}
                </p>
              </div>
            </div>

            <span className="shrink-0 text-[0.65rem] lg:text-xs font-semibold text-green-800 dark:text-green-300 bg-green-200/60 dark:bg-green-800/50 px-2 py-0.5 rounded-full">
              {data.nuevosClientesDelta}
            </span>
          </div>

          <p className="text-[0.7rem] text-gray-600 dark:text-gray-400 mt-auto">este mes</p>
        </div>

        {/* Card 3 */}
        <div
          className={`${cardBase} bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800/30`}
          data-focus="indicadores:kpi:comprobantes"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-purple-200 dark:bg-purple-800 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-800 dark:text-purple-200" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">Comprobantes Emitidos</h3>
                <p className="text-lg lg:text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                  {data.comprobantesEmitidos.toLocaleString()}
                </p>
              </div>
            </div>

            <span className="shrink-0 text-[0.65rem] lg:text-xs font-semibold text-purple-800 dark:text-purple-300 bg-purple-200/60 dark:bg-purple-800/50 px-2 py-0.5 rounded-full">
              {data.comprobantesDelta}
            </span>
          </div>

          <p className="text-[0.7rem] text-gray-600 dark:text-gray-400 mt-auto">En este periodo</p>
        </div>

        {/* Card 4 */}
        <div
          className={`${cardBase} bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800/30`}
          data-focus="indicadores:kpi:crecimiento"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-orange-200 dark:bg-orange-800 rounded-lg">
                <TrendingUp className="h-5 w-5 text-orange-800 dark:text-orange-200" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">Crecimiento</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight truncate">vs. mes anterior</p>
              </div>
            </div>

            <span className="shrink-0 text-[0.65rem] lg:text-xs font-semibold text-orange-800 dark:text-orange-300 bg-orange-200/60 dark:bg-orange-800/50 px-2 py-0.5 rounded-full">
              {data.crecimientoVsMesAnterior}
            </span>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">{data.crecimientoDescripcion}</p>

          <div className="flex justify-end mt-auto">
            <button
              className="text-orange-700 dark:text-orange-300 text-xs font-medium hover:underline"
              style={{ minWidth: 'auto', padding: 0 }}
              onClick={onViewGrowthDetails}
            >
              Ver detalles
            </button>
          </div>
        </div>

        {/* Card 5 */}
        <div
          className={`${cardBase} bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`}
          data-focus="indicadores:kpi:ticket"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Ticket className="h-5 w-5 text-gray-700 dark:text-gray-200" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">Ticket Promedio</h3>
                <p className="text-lg lg:text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                  {formatCurrency(data.ticketPromedioPeriodo)}
                </p>
              </div>
            </div>

            <span className="shrink-0 text-[0.65rem] lg:text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/70 px-2 py-0.5 rounded-full">
              Promedio
            </span>
          </div>

          <p className="text-[0.7rem] text-gray-600 dark:text-gray-400 mt-auto">
            Comprobantes emitidos: {data.comprobantesEmitidos.toLocaleString()}
          </p>
        </div>

        {/* Card 6 */}
        <div
          className={`${cardBase} bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/40`}
          data-focus="indicadores:kpi:anulaciones"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-rose-200 dark:bg-rose-800 rounded-lg">
                <Ban className="h-5 w-5 text-rose-800 dark:text-rose-200" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">Tasa de Anulaciones</h3>
                <p className="text-xs text-gray-700 dark:text-gray-300 truncate">
                  Emitidos: <span className="font-semibold">{data.comprobantesEmitidos}</span> · Anulados:{' '}
                  <span className="font-semibold">{data.comprobantesAnulados}</span>
                </p>
              </div>
            </div>

            <span className="shrink-0 text-[0.65rem] lg:text-xs font-semibold text-rose-800 dark:text-rose-200 bg-rose-200/70 dark:bg-rose-800/70 px-2 py-0.5 rounded-full">
              {`${data.tasaAnulacionesPorcentaje.toFixed(1)}%`}
            </span>
          </div>

          <p className="text-[0.7rem] text-gray-500 dark:text-gray-400 mt-auto">
            Base: {data.totalComprobantesConsiderados.toLocaleString()} comprobantes
          </p>
        </div>
      </div>
    </div>
  );
};

export default KpiCards;
