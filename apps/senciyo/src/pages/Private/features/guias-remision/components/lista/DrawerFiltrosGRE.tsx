import { useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import type { FiltrosAvanzadosGRE } from '../../logica/filtrosGRE';
import { FILTROS_GRE_VACIO } from '../../logica/filtrosGRE';
import { ESTADOS_GRE_LISTADO, getEstadoGRELabel } from '../../logica/estadosGRE';
import { MOTIVOS_TRASLADO, MODALIDADES_TRANSPORTE } from '../../../configuracion-sistema/datos/catalogosGRE';
import type { EstadoGRE, TipoGRE } from '../../modelos/GuiaRemision';
import type { CodigoMotivoTraslado, CodigoModalidadTransporte } from '../../modelos/GuiaRemision';

interface Props {
  open: boolean;
  filtros: FiltrosAvanzadosGRE;
  onAplicar: (filtros: FiltrosAvanzadosGRE) => void;
  onCerrar: () => void;
}

export default function DrawerFiltrosGRE({ open, filtros, onAplicar, onCerrar }: Props) {
  const [draft, setDraft] = useState<FiltrosAvanzadosGRE>(filtros);

  // Sync draft when drawer opens
  const handleOpen = () => setDraft(filtros);

  const toggleEstado = (estado: EstadoGRE) =>
    setDraft((prev) => ({
      ...prev,
      estados: prev.estados.includes(estado)
        ? prev.estados.filter((e) => e !== estado)
        : [...prev.estados, estado],
    }));

  const setTipo = (tipo: TipoGRE | null) =>
    setDraft((prev) => ({ ...prev, tipo }));

  const setMotivo = (motivoTraslado: CodigoMotivoTraslado | null) =>
    setDraft((prev) => ({ ...prev, motivoTraslado }));

  const setModalidad = (modalidad: CodigoModalidadTransporte | null) =>
    setDraft((prev) => ({ ...prev, modalidad }));

  const limpiar = () => setDraft(FILTROS_GRE_VACIO);

  const aplicar = () => {
    onAplicar(draft);
    onCerrar();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
        onClick={onCerrar}
        onKeyDown={(e) => e.key === 'Escape' && onCerrar()}
        role="button"
        tabIndex={-1}
        aria-label="Cerrar filtros"
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-xl z-50 flex flex-col"
        onTransitionEnd={handleOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Filtros avanzados</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={limpiar}
              className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpiar
            </button>
            <button
              type="button"
              onClick={onCerrar}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* Estado */}
          <section>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2.5">
              Estado
            </p>
            <div className="space-y-2">
              {ESTADOS_GRE_LISTADO.map((estado) => (
                <label
                  key={estado}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={draft.estados.includes(estado)}
                    onChange={() => toggleEstado(estado)}
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-violet-600 focus:ring-violet-500 dark:bg-gray-700 dark:checked:bg-violet-600 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    {getEstadoGRELabel(estado)}
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* Tipo GRE */}
          <section>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2.5">
              Tipo de guía
            </p>
            <div className="space-y-2">
              {([null, 'remitente', 'transportista'] as const).map((tipo) => (
                <label key={tipo ?? '_todos'} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="radio"
                    checked={draft.tipo === tipo}
                    onChange={() => setTipo(tipo)}
                    className="h-4 w-4 border-gray-300 dark:border-gray-600 text-violet-600 focus:ring-violet-500 dark:bg-gray-700 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    {tipo === null ? 'Todos' : tipo === 'remitente' ? 'GRE Remitente' : 'GRE Transportista'}
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* Modalidad */}
          <section>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2.5">
              Modalidad
            </p>
            <select
              value={draft.modalidad ?? ''}
              onChange={(e) =>
                setModalidad(e.target.value === '' ? null : (e.target.value as CodigoModalidadTransporte))
              }
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Todas las modalidades</option>
              {MODALIDADES_TRANSPORTE.filter((m) => m.estado === 'Vigente').map((m) => (
                <option key={m.codigo} value={m.codigo}>
                  {m.descripcion}
                </option>
              ))}
            </select>
          </section>

          {/* Motivo de traslado */}
          <section>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2.5">
              Motivo de traslado
            </p>
            <div className="overflow-y-auto max-h-44 space-y-2 pr-1">
              {MOTIVOS_TRASLADO.filter((m) => m.estado === 'Vigente').map((motivo) => (
                <label key={motivo.codigo} className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="radio"
                    checked={draft.motivoTraslado === motivo.codigo}
                    onChange={() => setMotivo(motivo.codigo as CodigoMotivoTraslado)}
                    className="h-4 w-4 mt-0.5 border-gray-300 dark:border-gray-600 text-violet-600 focus:ring-violet-500 dark:bg-gray-700 cursor-pointer shrink-0"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors leading-snug">
                    <span className="text-gray-400 dark:text-gray-500 font-mono text-xs mr-1">{motivo.codigo}</span>
                    {motivo.descripcion}
                  </span>
                </label>
              ))}
              {/* Opción limpiar selección */}
              {draft.motivoTraslado !== null && (
                <button
                  type="button"
                  onClick={() => setMotivo(null)}
                  className="text-xs text-violet-600 dark:text-violet-400 hover:underline mt-1"
                >
                  Quitar filtro de motivo
                </button>
              )}
            </div>
          </section>

          {/* Serie */}
          <section>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2.5">
              Serie
            </p>
            <input
              type="text"
              value={draft.serie}
              onChange={(e) => setDraft((prev) => ({ ...prev, serie: e.target.value }))}
              placeholder="Ej. T001"
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </section>

          {/* Destinatario */}
          <section>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2.5">
              Destinatario
            </p>
            <input
              type="text"
              value={draft.destinatario}
              onChange={(e) => setDraft((prev) => ({ ...prev, destinatario: e.target.value }))}
              placeholder="Nombre o razón social"
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </section>

          {/* Rango de peso */}
          <section>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2.5">
              Peso total (kg)
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={draft.pesoDesde ?? ''}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    pesoDesde: e.target.value === '' ? null : Number(e.target.value),
                  }))
                }
                min={0}
                placeholder="Desde"
                className="w-1/2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <span className="text-gray-400 dark:text-gray-500 text-sm">–</span>
              <input
                type="number"
                value={draft.pesoHasta ?? ''}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    pesoHasta: e.target.value === '' ? null : Number(e.target.value),
                  }))
                }
                min={0}
                placeholder="Hasta"
                className="w-1/2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onCerrar}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={aplicar}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
          >
            Aplicar filtros
          </button>
        </div>
      </div>
    </>
  );
}
