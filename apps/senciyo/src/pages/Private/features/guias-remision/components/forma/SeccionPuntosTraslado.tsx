import { useEffect, useMemo, useRef, useState } from 'react';
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
import type { PuntoTraslado, TipoGRE } from '../../modelos/GuiaRemision';
import type { RolPuntoTrasladoGRE } from '../../logica/reglasFlujoGRE';
import { obtenerRolesPuntosTrasladoGRE } from '../../logica/reglasFlujoGRE';
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

// ─── Resolución de direcciones reales de un actor (Destinatario/Proveedor/Remitente) ─

/**
 * Construye las opciones de dirección de UN actor real (Destinatario, Proveedor o Remitente) a
 * partir de sus propios datos y del mismo maestro de direcciones de Gestión de Clientes que ya usa
 * el resto del módulo — nunca una segunda fuente. La dirección ya consignada en el actor (si la
 * tiene: viene del cliente seleccionado o de la consulta SUNAT/RENIEC) se antepone como Principal;
 * el resto de direcciones persistidas para ese mismo RUC/documento se agregan después, sin
 * duplicar. Un actor sin ninguna dirección real devuelve una lista vacía — nunca se fabrica una.
 */
function construirOpcionesDireccionActorGRE(actor: DatosDestinatario | null): OpcionDireccion[] {
  if (!actor) return [];

  const lista: OpcionDireccion[] = [];
  const vistas = new Set<string>();
  const etiqueta = `${actor.tipoDocumento} ${actor.numeroDocumento} · ${actor.nombre}`;

  if (actor.direccion?.trim()) {
    const ubigeo =
      actor.ubigeo ??
      (actor.departamento && actor.provincia && actor.distrito
        ? obtenerUbigeo(actor.departamento, actor.provincia, actor.distrito)
        : undefined);

    lista.push({
      id: 'actor-principal',
      etiqueta,
      punto: {
        departamento: actor.departamento,
        provincia: actor.provincia,
        distrito: actor.distrito,
        ubigeo: ubigeo || undefined,
        direccion: actor.direccion,
      },
    });
    vistas.add(actor.direccion.trim().toLowerCase());
  }

  const payload = leerDireccionesClientePersistidas({
    clienteId: actor.clienteId,
    tipoDocumento: actor.tipoDocumento,
    numeroDocumento: actor.numeroDocumento,
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
        id: `actor-extra-${dir.id}`,
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
}

/** Identidad estable del actor (tipo + número de documento) — sirve para detectar cuándo cambió realmente, sin comparar por nombre visual. `undefined` mientras el actor no exista todavía. */
function identidadActorGRE(actor: DatosDestinatario | null): string | undefined {
  const numero = actor?.numeroDocumento?.trim();
  if (!numero) return undefined;
  return `${actor?.tipoDocumento}:${numero}`;
}

// ─── Resolución automática del punto (sin clic de confirmación) ─────

/**
 * Resuelve automáticamente `punto` a partir de las opciones reales de su actor — sin exigir nunca
 * un clic de confirmación adicional. Dos disparadores, cada uno cubriendo un caso real distinto:
 *  - El actor cambió de verdad (nunca en el primer render, que preserva intacto el snapshot con el
 *    que este campo se montó — un borrador ya guardado, o simplemente un formulario nuevo vacío):
 *    la dirección anterior queda obsoleta sin importar si ya tenía un valor — nunca puede seguir
 *    asociada al actor equivocado (Remitente/Destinatario eliminado o cambiado).
 *  - El punto sigue vacío y ya hay opciones reales disponibles (recién seleccionado el actor, o las
 *    opciones tardaron en llegar — p. ej. mientras carga Configuración/Establecimientos): se
 *    autoselecciona la primera (la Principal, por construcción de `opciones`), sin exigir que el
 *    usuario haga clic para "confirmarla".
 * Misma función para los 4 roles posibles (empresa/destinatario/proveedor/remitente) — nunca un
 * `if` por tipo de GRE o por motivo.
 */
function useResolucionAutomaticaPuntoGRE(
  punto: PuntoTraslado,
  onChange: (punto: PuntoTraslado) => void,
  identidadActor: string | undefined,
  opciones: OpcionDireccion[],
) {
  const identidadAnteriorRef = useRef<string | undefined>(undefined);
  const primeraVezRef = useRef(true);
  const hayDireccion = Boolean(punto.direccion?.trim());

  useEffect(() => {
    const esPrimeraVez = primeraVezRef.current;
    primeraVezRef.current = false;
    const identidadAnterior = identidadAnteriorRef.current;
    identidadAnteriorRef.current = identidadActor;

    if (!esPrimeraVez && identidadActor !== identidadAnterior) {
      const principal = opciones[0];
      onChange(principal ? principal.punto : { direccion: '' });
      return;
    }

    if (!hayDireccion && identidadActor && opciones.length > 0) {
      onChange(opciones[0].punto);
    }
  }, [identidadActor, opciones, hayDireccion, onChange]);
}

// ─── Componente por punto (partida o llegada) ────────────────

interface CampoPuntoProps {
  titulo: string;
  punto: PuntoTraslado;
  onChange: (punto: PuntoTraslado) => void;
  opciones: OpcionDireccion[];
  /** Identidad del actor real (empresa/destinatario/proveedor/remitente) que alimenta este punto — `undefined` mientras ese actor todavía no exista, lo que impide mostrar cualquier dirección como confirmada. */
  identidadActor: string | undefined;
}

function CampoPunto({ titulo, punto, onChange, opciones, identidadActor }: CampoPuntoProps) {
  useResolucionAutomaticaPuntoGRE(punto, onChange, identidadActor, opciones);

  const hayDireccion = Boolean(punto.direccion?.trim());

  const [editando, setEditando] = useState(!hayDireccion);
  const [seleccionId, setSeleccionId] = useState('');

  // La dirección resuelta automáticamente (o cargada de un borrador) puede llegar por props
  // DESPUÉS del montaje inicial — `editando` es estado local y no se resincroniza solo. Sin este
  // efecto, quedaba mostrando el selector como si nada estuviera confirmado, aunque `punto.direccion`
  // ya tuviera un valor real: exigía un clic redundante del usuario para "confirmar" algo que ya
  // estaba resuelto. Al confirmarse (automática o manualmente) pasa directo a la vista resumen; no
  // interfiere con "Cambiar dirección" (que reabre el selector sin que `hayDireccion` cambie).
  useEffect(() => {
    if (hayDireccion) setEditando(false);
  }, [hayDireccion]);

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

      {/* Lista de opciones rápidas — vacía mientras el actor real de este punto (Remitente/
          Destinatario/Proveedor) todavía no exista: no hay ninguna dirección que ofrecer ni que
          confirmar, solo queda la vía manual ("Agregar dirección…", más abajo). */}
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
  /** GRE Remitente, motivo con "Mismo remitente" (switch) — el mismo estado que ya consume `SeccionDatosGenerales.tsx` para decidir si el Destinatario es la propia empresa. */
  destinatarioEsMismoRemitente?: boolean;
  /** GRE Remitente, motivos con Proveedor real (Compra, Recojo de bienes transformados) — alimenta el Punto de partida en lugar de la empresa. */
  proveedor?: DatosDestinatario | null;
  /** GRE Transportista — actor Remitente real de esta GRE, independiente de la empresa transportista emisora; alimenta el Punto de partida. */
  remitente?: DatosDestinatario | null;
  /** GRE Transportista: muestra el indicador "Realiza transbordo programado" aquí, no en "Datos de transporte" (donde permanece para GRE Remitente). */
  tipo?: TipoGRE;
  transbordo?: boolean;
  onTransbordoChange?: (valor: boolean) => void;
}

export default function SeccionPuntosTraslado({
  puntoPartida,
  onPuntoPartidaChange,
  puntoLlegada,
  onPuntoLlegadaChange,
  motivoTraslado,
  destinatario,
  destinatarioEsMismoRemitente,
  proveedor,
  remitente,
  tipo,
  transbordo,
  onTransbordoChange,
}: SeccionPuntosTrasladoProps) {
  const { state: configState } = useConfigurationContext();
  const { activeEstablecimientoId } = useTenant();

  // Establecimientos activos de la empresa emisora (deduplicados por dirección), con el
  // establecimiento activo primero cuando existe — misma preferencia que antes, expresada ahora
  // como orden de la lista (`opciones[0]` es siempre la preferida, sin importar qué rol la consuma).
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

    if (!activeEstablecimientoId) return lista;
    const idx = lista.findIndex((o) => o.id === `est-${activeEstablecimientoId}`);
    if (idx <= 0) return lista;
    const [activa] = lista.splice(idx, 1);
    return [activa, ...lista];
  }, [configState.company, configState.Establecimientos, activeEstablecimientoId]);

  // Roles reales (empresa/destinatario/proveedor/remitente) que alimentan cada punto — única
  // fuente compartida, nunca un `if` por tipo de GRE o por motivo repetido aquí.
  const roles = useMemo(
    () => obtenerRolesPuntosTrasladoGRE(tipo ?? 'remitente', motivoTraslado, destinatarioEsMismoRemitente),
    [tipo, motivoTraslado, destinatarioEsMismoRemitente],
  );

  const datosPorRol: Record<Exclude<RolPuntoTrasladoGRE, 'empresa'>, DatosDestinatario | null> = {
    destinatario,
    proveedor: proveedor ?? null,
    remitente: remitente ?? null,
  };

  function opcionesPorRol(rol: RolPuntoTrasladoGRE): OpcionDireccion[] {
    return rol === 'empresa' ? opcionesEmpresa : construirOpcionesDireccionActorGRE(datosPorRol[rol]);
  }

  function identidadPorRol(rol: RolPuntoTrasladoGRE): string | undefined {
    return rol === 'empresa' ? 'empresa' : identidadActorGRE(datosPorRol[rol]);
  }

  // Construcción liviana (arreglos de a lo sumo unas pocas direcciones) — no requiere memoizar.
  const opcionesPartida = opcionesPorRol(roles.origen);
  const opcionesLlegada = opcionesPorRol(roles.destino);

  return (
    <ConfigurationCard title="Punto de partida y llegada" icon={MapPin}>
      {tipo === 'transportista' && (
        <label className="flex items-center gap-1.5 cursor-pointer pb-3 mb-3 border-b border-gray-100 dark:border-gray-700 w-fit">
          <input
            type="checkbox"
            checked={!!transbordo}
            onChange={(e) => onTransbordoChange?.(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
          />
          <span className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
            Realiza transbordo programado
          </span>
        </label>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-gray-100 dark:divide-gray-700">
        <div className="pb-5 sm:pb-0 sm:pr-5">
          <CampoPunto
            titulo="Punto de partida"
            punto={puntoPartida}
            onChange={onPuntoPartidaChange}
            opciones={opcionesPartida}
            identidadActor={identidadPorRol(roles.origen)}
          />
        </div>
        <div className="pt-5 sm:pt-0 sm:pl-5">
          <CampoPunto
            titulo="Punto de llegada"
            punto={puntoLlegada}
            onChange={onPuntoLlegadaChange}
            opciones={opcionesLlegada}
            identidadActor={identidadPorRol(roles.destino)}
          />
        </div>
      </div>
    </ConfigurationCard>
  );
}
