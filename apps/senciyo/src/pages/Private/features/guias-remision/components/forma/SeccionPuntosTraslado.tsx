import { useState, useMemo, useEffect } from 'react';
import { MapPin, X } from 'lucide-react';
import { ConfigurationCard } from '../../../comprobantes-electronicos/shared/form-core/components/ConfigurationCard';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useTenant } from '@/shared/tenant/TenantContext';
import {
  listarDepartamentos,
  listarProvincias,
  listarDistritos,
  obtenerUbigeo,
} from '@/shared/catalogos/ubigeo.pe';
import type { PuntoTraslado } from '../../modelos/GuiaRemision';
import { leerDireccionesClientePersistidas } from '../../../gestion-clientes/utils/direccionesCliente';

// ─── Tipos internos ─────────────────────────────────────────

interface DatosDestinatario {
  clienteId?: string | number;
  nombre: string;
  tipoDocumento: string;
  numeroDocumento: string;
  direccion?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  ubigeo?: string;
}

interface OpcionDireccion {
  id: string;
  /** Nombre del establecimiento / razón social. Va en tooltip, no como texto principal. */
  etiqueta: string;
  punto: PuntoTraslado;
}

// ─── Estilos compartidos ─────────────────────────────────────

const OTRA = '__otra__';

const INPUT_CLS =
  'w-full h-8 px-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed';

// ─── Componente por punto (partida o llegada) ────────────────

interface CampoPuntoProps {
  titulo: string;
  punto: PuntoTraslado;
  onChange: (punto: PuntoTraslado) => void;
  opciones: OpcionDireccion[];
}

function CampoPunto({ titulo, punto, onChange, opciones }: CampoPuntoProps) {
  const hayDireccion = Boolean(punto.direccion?.trim());

  const [editando, setEditando] = useState(!hayDireccion);
  const [seleccionId, setSeleccionId] = useState('');

  // Estado temporal del formulario manual — siempre empieza vacío
  const [dpto, setDpto] = useState('');
  const [prov, setProv] = useState('');
  const [dist, setDist] = useState('');
  const [dir, setDir] = useState('');

  const modoManual = seleccionId === OTRA;

  const provincias = useMemo(() => (dpto ? listarProvincias(dpto) : []), [dpto]);
  const distritos = useMemo(
    () => (dpto && prov ? listarDistritos(dpto, prov) : []),
    [dpto, prov],
  );
  const ubigeoCalculado = dpto && prov && dist ? obtenerUbigeo(dpto, prov, dist) : '';

  /** Abrir el selector de opciones (desde "Cambiar dirección"). */
  const abrirEditor = () => {
    setSeleccionId('');
    setEditando(true);
  };

  /** Seleccionar una opción rápida o entrar al formulario manual limpio. */
  const seleccionarOpcion = (id: string) => {
    if (id === OTRA) {
      setSeleccionId(OTRA);
      // El formulario manual siempre abre en blanco
      setDpto('');
      setProv('');
      setDist('');
      setDir('');
      return;
    }
    const opcion = opciones.find((o) => o.id === id);
    if (opcion) {
      onChange(opcion.punto);
      setSeleccionId(id);
      setEditando(false);
    }
  };

  /** Confirmar la dirección ingresada manualmente. */
  const confirmarManual = () => {
    onChange({
      departamento: dpto || undefined,
      provincia: prov || undefined,
      distrito: dist || undefined,
      ubigeo: ubigeoCalculado || undefined,
      direccion: dir,
    });
    setSeleccionId('');
    setEditando(false);
  };

  /** Cancelar el formulario manual: descartar estado temporal y volver atrás. */
  const cancelarManual = () => {
    setSeleccionId('');
    setDpto('');
    setProv('');
    setDist('');
    setDir('');
    if (hayDireccion) {
      setEditando(false); // Volver a resumen si ya había dirección
    }
    // Si no había dirección, quedamos en el selector (editando=true)
  };

  // ── Vista resumen ────────────────────────────────────────
  if (!editando && hayDireccion) {
    const geo = [punto.departamento, punto.provincia, punto.distrito]
      .filter(Boolean)
      .join(' – ');

    return (
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          {titulo}
        </p>
        <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5">
          <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">
            {punto.direccion}
          </p>
          {(geo || punto.ubigeo) && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {geo}
              {punto.ubigeo && (
                <span className="ml-1 font-mono text-gray-400 dark:text-gray-500">
                  · {punto.ubigeo}
                </span>
              )}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={abrirEditor}
          className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200 font-medium"
        >
          Cambiar dirección
        </button>
      </div>
    );
  }

  // ── Vista selector + formulario manual ───────────────────
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
        {titulo}
      </p>

      {/* Lista de opciones rápidas */}
      {!modoManual && (
        <div className="space-y-1.5">
          {opciones.map((op) => {
            const geoOp = [op.punto.departamento, op.punto.provincia, op.punto.distrito]
              .filter(Boolean)
              .join(', ');
            return (
              <button
                key={op.id}
                type="button"
                // Nombre del establecimiento / empresa va en tooltip, no como texto principal
                title={op.etiqueta}
                onClick={() => seleccionarOpcion(op.id)}
                className={`w-full text-left px-3 py-2 text-xs rounded-lg border transition-colors ${
                  seleccionId === op.id
                    ? 'bg-violet-50 border-violet-300 text-violet-700 dark:bg-violet-900/20 dark:border-violet-500 dark:text-violet-300'
                    : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60'
                }`}
              >
                {/* Dirección como dato principal */}
                <span className="font-medium block truncate">
                  {op.punto.direccion || '—'}
                </span>
                {/* Geo como dato secundario */}
                {geoOp && (
                  <span className="text-gray-400 dark:text-gray-500 text-[11px] truncate block">
                    {geoOp}
                  </span>
                )}
              </button>
            );
          })}

          {/* Botón para ingresar manualmente */}
          <button
            type="button"
            onClick={() => seleccionarOpcion(OTRA)}
            className="w-full text-left px-3 py-2 text-xs rounded-lg border border-dashed border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
          >
            {opciones.length === 0 ? 'Agregar dirección…' : 'Otra dirección…'}
          </button>
        </div>
      )}

      {/* Formulario de entrada manual */}
      {modoManual && (
        <div className="space-y-1.5">
          {/* Encabezado con X para cancelar */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Otra dirección
            </span>
            <button
              type="button"
              onClick={cancelarManual}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
              aria-label="Cancelar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <select
            value={dpto}
            onChange={(e) => {
              setDpto(e.target.value);
              setProv('');
              setDist('');
            }}
            className={INPUT_CLS}
          >
            <option value="">Departamento</option>
            {listarDepartamentos().map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={prov}
            onChange={(e) => {
              setProv(e.target.value);
              setDist('');
            }}
            disabled={!dpto}
            className={INPUT_CLS}
          >
            <option value="">Provincia</option>
            {provincias.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={dist}
            onChange={(e) => setDist(e.target.value)}
            disabled={!prov}
            className={INPUT_CLS}
          >
            <option value="">Distrito</option>
            {distritos.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {ubigeoCalculado && (
            <p className="text-xs text-gray-500 dark:text-gray-400 pl-1">
              Ubigeo:{' '}
              <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
                {ubigeoCalculado}
              </span>
            </p>
          )}

          <input
            type="text"
            value={dir}
            onChange={(e) => setDir(e.target.value)}
            placeholder="Dirección detallada"
            className={INPUT_CLS}
          />

          <button
            type="button"
            onClick={confirmarManual}
            disabled={!dir.trim()}
            className="w-full h-8 text-xs font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirmar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────

interface SeccionPuntosTrasladoProps {
  puntoPartida: PuntoTraslado;
  onPuntoPartidaChange: (punto: PuntoTraslado) => void;
  puntoLlegada: PuntoTraslado;
  onPuntoLlegadaChange: (punto: PuntoTraslado) => void;
  motivoTraslado: string;
  destinatario: DatosDestinatario | null;
}

export default function SeccionPuntosTraslado({
  puntoPartida,
  onPuntoPartidaChange,
  puntoLlegada,
  onPuntoLlegadaChange,
  motivoTraslado,
  destinatario,
}: SeccionPuntosTrasladoProps) {
  const { state: configState } = useConfigurationContext();
  const { activeEstablecimientoId } = useTenant();

  // Establecimientos activos de la empresa emisora (deduplicados por dirección)
  const opcionesEmpresa = useMemo((): OpcionDireccion[] => {
    const lista: OpcionDireccion[] = [];
    const vistas = new Set<string>();

    const empresa = configState.company;
    if (empresa?.direccionFiscal) {
      lista.push({
        id: 'empresa',
        etiqueta: empresa.razonSocial ?? 'Dirección fiscal',
        punto: {
          departamento: empresa.departamento,
          provincia: empresa.provincia,
          distrito: empresa.distrito,
          ubigeo: obtenerUbigeo(
            empresa.departamento ?? '',
            empresa.provincia ?? '',
            empresa.distrito ?? '',
          ),
          direccion: empresa.direccionFiscal,
        },
      });
      vistas.add(empresa.direccionFiscal.trim().toLowerCase());
    }

    for (const est of configState.Establecimientos) {
      if (!est.direccionEstablecimiento) continue;
      const norm = est.direccionEstablecimiento.trim().toLowerCase();
      if (vistas.has(norm)) continue;
      vistas.add(norm);
      lista.push({
        id: `est-${est.id}`,
        etiqueta: est.nombreEstablecimiento,
        punto: {
          departamento: est.departamentoEstablecimiento,
          provincia: est.provinciaEstablecimiento,
          distrito: est.distritoEstablecimiento,
          ubigeo: obtenerUbigeo(
            est.departamentoEstablecimiento ?? '',
            est.provinciaEstablecimiento ?? '',
            est.distritoEstablecimiento ?? '',
          ),
          direccion: est.direccionEstablecimiento,
        },
      });
    }

    return lista;
  }, [configState.company, configState.Establecimientos]);

  // Pre-seleccionar el establecimiento activo (o el único disponible) al punto de partida
  // cuando el campo aún está vacío y el motivo no es Compra.
  useEffect(() => {
    if (puntoPartida.direccion?.trim()) return; // Ya tiene dirección confirmada
    if (motivoTraslado === '02') return; // Compra: partida viene del proveedor
    if (opcionesEmpresa.length === 0) return;

    const opcionActiva =
      activeEstablecimientoId
        ? opcionesEmpresa.find((o) => o.id === `est-${activeEstablecimientoId}`)
        : undefined;

    const aSeleccionar = opcionActiva ?? opcionesEmpresa[0];
    if (aSeleccionar) onPuntoPartidaChange(aSeleccionar.punto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opcionesEmpresa]);

  // Dirección(es) del destinatario/proveedor:
  // 1. Dirección principal (viene del cliente seleccionado o de la consulta API)
  // 2. Direcciones adicionales guardadas en localStorage por el módulo de Clientes
  const opcionesDestinatario = useMemo((): OpcionDireccion[] => {
    if (!destinatario) return [];

    const lista: OpcionDireccion[] = [];
    const vistas = new Set<string>();
    const etiqueta = `${destinatario.tipoDocumento} ${destinatario.numeroDocumento} · ${destinatario.nombre}`;

    // Dirección principal (del cliente o de la API SUNAT/RENIEC)
    if (destinatario.direccion?.trim()) {
      const ubigeo =
        destinatario.ubigeo ??
        (destinatario.departamento && destinatario.provincia && destinatario.distrito
          ? obtenerUbigeo(
              destinatario.departamento,
              destinatario.provincia,
              destinatario.distrito,
            )
          : undefined);

      lista.push({
        id: 'dest-principal',
        etiqueta,
        punto: {
          departamento: destinatario.departamento,
          provincia: destinatario.provincia,
          distrito: destinatario.distrito,
          ubigeo: ubigeo || undefined,
          direccion: destinatario.direccion,
        },
      });
      vistas.add(destinatario.direccion.trim().toLowerCase());
    }

    // Direcciones adicionales desde localStorage (mismo esquema que ClienteFormNew)
    const payload = leerDireccionesClientePersistidas({
      clienteId: destinatario.clienteId,
      tipoDocumento: destinatario.tipoDocumento,
      numeroDocumento: destinatario.numeroDocumento,
    });
    if (payload) {
      const ordenadas = payload.principalId
        ? [
            ...payload.direcciones.filter((d) => d.id === payload.principalId),
            ...payload.direcciones.filter((d) => d.id !== payload.principalId),
          ]
        : payload.direcciones;

      for (const dir of ordenadas) {
        const norm = dir.direccion.trim().toLowerCase();
        if (!dir.direccion.trim() || vistas.has(norm)) continue;
        vistas.add(norm);
        const ubigeo =
          dir.ubigeo ||
          obtenerUbigeo(dir.departamento, dir.provincia, dir.distrito) ||
          undefined;
        lista.push({
          id: `dest-extra-${dir.id}`,
          etiqueta,
          punto: {
            departamento: dir.departamento || undefined,
            provincia: dir.provincia || undefined,
            distrito: dir.distrito || undefined,
            ubigeo,
            direccion: dir.direccion,
          },
        });
      }
    }

    return lista;
  }, [destinatario]);

  // Distribución según motivo de traslado:
  //   '01' Venta  → partida = empresa/establecimientos, llegada = destinatario
  //   '02' Compra → partida = proveedor,               llegada = empresa/establecimientos
  //   otros       → empresa/establecimientos para ambos lados
  const opcionesPartida = useMemo((): OpcionDireccion[] => {
    if (motivoTraslado === '02') return opcionesDestinatario;
    return opcionesEmpresa;
  }, [motivoTraslado, opcionesEmpresa, opcionesDestinatario]);

  const opcionesLlegada = useMemo((): OpcionDireccion[] => {
    if (motivoTraslado === '01') return opcionesDestinatario;
    return opcionesEmpresa;
  }, [motivoTraslado, opcionesEmpresa, opcionesDestinatario]);

  return (
    <ConfigurationCard title="Punto de partida y llegada" icon={MapPin}>
      <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-gray-100 dark:divide-gray-700">
        <div className="pb-5 sm:pb-0 sm:pr-5">
          <CampoPunto
            titulo="Punto de partida"
            punto={puntoPartida}
            onChange={onPuntoPartidaChange}
            opciones={opcionesPartida}
          />
        </div>
        <div className="pt-5 sm:pt-0 sm:pl-5">
          <CampoPunto
            titulo="Punto de llegada"
            punto={puntoLlegada}
            onChange={onPuntoLlegadaChange}
            opciones={opcionesLlegada}
          />
        </div>
      </div>
    </ConfigurationCard>
  );
}
