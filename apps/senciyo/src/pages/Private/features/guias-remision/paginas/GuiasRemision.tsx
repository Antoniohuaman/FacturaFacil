import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Truck, Plus, Search, SlidersHorizontal, Columns3 } from 'lucide-react';
import { useTenant } from '@/shared/tenant/TenantContext';
import { useUserSession } from '@/contexts/UserSessionContext';
import { useFeedback } from '@/shared/feedback';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { obtenerUsuarioDesdeSesion, tienePermiso } from '../../configuracion-sistema/utilidades/permisos';
import { useGuiasRemision } from '../contexto/ContextoGuiasRemision';
import TablaGuias from '../components/lista/TablaGuias';
import DrawerDetalleGRE from '../components/detalle/DrawerDetalleGRE';
import DrawerFiltrosGRE from '../components/lista/DrawerFiltrosGRE';
import PanelColumnasGRE from '../components/lista/PanelColumnasGRE';
import ModalAnularGRE from '../components/modales/ModalAnularGRE';
import ModalEliminarBorradorGRE from '../components/modales/ModalEliminarBorradorGRE';
import ModalConfiguracionGRE from '../components/modales/ModalConfiguracionGRE';
import BannerConfiguracionGRE from '../components/compartido/BannerConfiguracionGRE';
import type { GuiaRemision, EventoGRE } from '../modelos/GuiaRemision';
import { GUIA_REMISION_BORRADOR } from '../modelos/GuiaRemision';
import { imprimirGuiaGRE, type EmpresaGRE } from '../impresion/imprimirGuiaGRE';
import type { FiltrosAvanzadosGRE } from '../logica/filtrosGRE';
import { FILTROS_GRE_VACIO, aplicarFiltrosGRE, contarFiltrosActivosGRE } from '../logica/filtrosGRE';
import { cargarColumnasGRE, persistirColumnasGRE } from '../logica/columnasGRE';
import type { ColumnaGREConfig } from '../logica/columnasGRE';
import { useEstadoConfiguracionGRE } from '../logica/useEstadoConfiguracionGRE';
import { prepararAnulacionGRE } from '../logica/inventarioGRE';
import { ServicioKardexValorizado } from '../../gestion-inventario/services/servicioKardexValorizado';
import { STORAGE_KEY_MOVEMENTS } from '../../gestion-inventario/repositories/stock.repository';
import { sincronizarInventarioTrasConfirmacion } from '@/shared/inventory/accionesStock';
import { lsKey } from '@/shared/tenant';

type Tab = 'listado' | 'borradores';

export default function GuiasRemision() {
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id?: string }>();
  const { tenantId, activeWorkspace } = useTenant();
  const { state, actualizarGuia, eliminarGuia, agregarGuia } = useGuiasRemision();

  // Permiso real (no solo estado del documento) para Anular/Eliminar borrador/Duplicar —
  // GRE-P1-004. `ContextoGuiasRemision` vuelve a exigir este mismo permiso al ejecutar la
  // mutación; aquí solo se usa para decidir qué botones mostrar.
  const { session } = useUserSession();
  const feedback = useFeedback();
  const { state: configState, rolesConfigurados } = useConfigurationContext();
  const usuarioActual = useMemo(
    () => obtenerUsuarioDesdeSesion(configState.users, session),
    [configState.users, session],
  );
  const puedeGestionarGRE = tienePermiso({
    usuario: usuarioActual,
    permisoId: 'ventas.gre.emitir',
    rolesDisponibles: rolesConfigurados,
    establecimientoId: session?.currentEstablecimientoId,
  });

  const { credencialesCompletas, autorizacionEspecialEmisor, numeroRegistroMTC, refrescar } = useEstadoConfiguracionGRE();
  const [modalConfigOpen, setModalConfigOpen] = useState(false);

  const [tabActivo, setTabActivo] = useState<Tab>('listado');
  const [guiaDetalle, setGuiaDetalle] = useState<GuiaRemision | null>(null);

  // Filtros de barra
  const [busqueda, setBusqueda] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtrosAvanzados, setFiltrosAvanzados] = useState<FiltrosAvanzadosGRE>(FILTROS_GRE_VACIO);
  const [drawerFiltrosOpen, setDrawerFiltrosOpen] = useState(false);

  // Columnas
  const [columnas, setColumnas] = useState<ColumnaGREConfig[]>(() => cargarColumnasGRE(tenantId));
  const [panelColumnasOpen, setPanelColumnasOpen] = useState(false);
  const refColumnas = useRef<HTMLDivElement>(null);

  // Modales
  const [modalAnular, setModalAnular] = useState<{
    open: boolean; guia: GuiaRemision | null; motivo: string; cargando: boolean;
  }>({ open: false, guia: null, motivo: '', cargando: false });

  const [modalEliminar, setModalEliminar] = useState<{
    open: boolean; guia: GuiaRemision | null; cargando: boolean;
  }>({ open: false, guia: null, cargando: false });

  // Abrir drawer cuando llega un :id desde la URL (ej. post-emisión)
  useEffect(() => {
    if (!idParam || state.guias.length === 0) return;
    const guia = state.guias.find((g) => g.id === idParam);
    if (guia) {
      setGuiaDetalle(guia);
      setTabActivo(guia.esBorrador ? 'borradores' : 'listado');
    }
  }, [idParam, state.guias]);

  // Persistir columnas cuando cambian
  const handleColumnasChange = (nuevas: ColumnaGREConfig[]) => {
    setColumnas(nuevas);
    persistirColumnasGRE(nuevas, tenantId);
  };

  const badgeFiltros = contarFiltrosActivosGRE(filtrosAvanzados, fechaDesde, fechaHasta);

  // Guías filtradas por tab y todos los filtros
  const guiasTab = useMemo(
    () =>
      tabActivo === 'listado'
        ? state.guias.filter((g) => !g.esBorrador)
        : state.guias.filter((g) => g.esBorrador),
    [state.guias, tabActivo],
  );

  const guiasFiltradas = useMemo(
    () => aplicarFiltrosGRE(guiasTab, busqueda, fechaDesde, fechaHasta, filtrosAvanzados),
    [guiasTab, busqueda, fechaDesde, fechaHasta, filtrosAvanzados],
  );

  // Handlers
  const handleVerDetalle = (guia: GuiaRemision) => setGuiaDetalle(guia);
  const handleAnular = (guia: GuiaRemision) =>
    setModalAnular({ open: true, guia, motivo: '', cargando: false });

  const handleConfirmarAnulacion = async () => {
    const { guia } = modalAnular;
    if (!guia) return;
    setModalAnular((prev) => ({ ...prev, cargando: true }));
    try {
      const evento: EventoGRE = {
        id: crypto.randomUUID(),
        tipo: 'anulacion',
        descripcion: modalAnular.motivo.trim() || 'Anulación sin motivo indicado',
        fecha: new Date().toISOString(),
      };
      // GRE-P1-008: si esta GRE produjo una salida real de stock al emitirse (modalidad
      // "automático"), anularla debe revertir esos movimientos mediante el mismo patrón central
      // que usan Comprobantes/Nota de Salida — nunca sumar stock a mano ni reconstruir capas
      // desde la UI. Si la GRE no produjo movimiento (inventario inactivo, modalidad "Mediante
      // Nota de Salida", o solo bienes no inventariables), `datosAnulacion` es `null` y no se
      // inventa ninguna reversión.
      if (tenantId) {
        const movimientosRaw = localStorage.getItem(lsKey(STORAGE_KEY_MOVEMENTS, tenantId));
        const { datosAnulacion } = prepararAnulacionGRE(
          guia,
          tenantId,
          movimientosRaw,
          modalAnular.motivo.trim() || 'Anulación sin motivo indicado',
          usuarioActual?.personalInfo.fullName || session?.userName || 'Usuario',
          evento.fecha,
        );
        if (datosAnulacion) {
          const almacenesMap = new Map(configState.almacenes.map((a) => [a.id, a]));
          await ServicioKardexValorizado.anularDocumentoValorizado(datosAnulacion, {
            almacenes: almacenesMap,
            generarId: () => crypto.randomUUID(),
            fechaActual: () => new Date().toISOString(),
            estadoValorizacion: configState.preferenciasInventario.estadoValorizacion,
            controlStockActivo: configState.salesPreferences?.controlStockActivo ?? false,
            valorizacionHabilitada: true,
          });
          sincronizarInventarioTrasConfirmacion();
        }
      }

      const anulada: GuiaRemision = {
        ...guia,
        estado: 'Anulada',
        historial: [...(guia.historial ?? []), evento],
      };
      await actualizarGuia(anulada);
      if (guiaDetalle?.id === guia.id) setGuiaDetalle(anulada);
      setModalAnular({ open: false, guia: null, motivo: '', cargando: false });
    } catch (errorAnulacion) {
      feedback.error(errorAnulacion instanceof Error ? errorAnulacion.message : 'No se pudo anular la guía de remisión.');
      setModalAnular((prev) => ({ ...prev, cargando: false }));
    }
  };

  const handleEliminarBorrador = (guia: GuiaRemision) =>
    setModalEliminar({ open: true, guia, cargando: false });

  const handleConfirmarEliminar = async () => {
    const { guia } = modalEliminar;
    if (!guia) return;
    setModalEliminar((prev) => ({ ...prev, cargando: true }));
    try {
      await eliminarGuia(guia.id);
      if (guiaDetalle?.id === guia.id) setGuiaDetalle(null);
      setModalEliminar({ open: false, guia: null, cargando: false });
    } catch {
      setModalEliminar((prev) => ({ ...prev, cargando: false }));
    }
  };

  const handleDuplicar = async (guia: GuiaRemision) => {
    const copia: GuiaRemision = {
      ...GUIA_REMISION_BORRADOR(guia.tipo),
      motivoTraslado: guia.motivoTraslado,
      modalidadTransporte: guia.modalidadTransporte,
      serie: guia.serie,
      destinatarioClienteId: guia.destinatarioClienteId,
      destinatarioNombre: guia.destinatarioNombre,
      destinatarioTipoDocumento: guia.destinatarioTipoDocumento,
      destinatarioNumeroDocumento: guia.destinatarioNumeroDocumento,
      destinatarioDireccion: guia.destinatarioDireccion,
      destinatarioDepartamento: guia.destinatarioDepartamento,
      destinatarioProvincia: guia.destinatarioProvincia,
      destinatarioDistrito: guia.destinatarioDistrito,
      destinatarioUbigeo: guia.destinatarioUbigeo,
      bienes: guia.bienes.map((b) => ({ ...b, id: crypto.randomUUID() })),
      documentosRelacionados: guia.documentosRelacionados.map((d) => ({
        ...d,
        id: crypto.randomUUID(),
      })),
      puntoPartida: { ...guia.puntoPartida },
      puntoLlegada: { ...guia.puntoLlegada },
      pesoTotal: guia.pesoTotal,
      unidadPeso: guia.unidadPeso,
      transportePrivado: guia.transportePrivado ? { ...guia.transportePrivado } : undefined,
      transportePublico: guia.transportePublico ? { ...guia.transportePublico } : undefined,
      observaciones: guia.observaciones,
    };
    await agregarGuia(copia);
    navigate(`/guias-remision/editar/${copia.id}`);
  };

  const empresaImpresion: EmpresaGRE | undefined = activeWorkspace
    ? { razonSocial: activeWorkspace.razonSocial, ruc: activeWorkspace.ruc, direccion: activeWorkspace.domicilioFiscal, autorizacionEspecialEmisor, numeroRegistroMTC }
    : undefined;

  const handleImprimir = (guia: GuiaRemision) => {
    if (tenantId) void imprimirGuiaGRE(guia, tenantId, empresaImpresion);
  };

  const handleEditarDesdeDrawer = (guia: GuiaRemision) => {
    navigate(`/guias-remision/editar/${guia.id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      {/* Cabecera */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Guías de Remisión</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Gestione guías de remisión electrónica remitente y transportista
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/guias-remision/nuevo/remitente')}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Nueva GRE Remitente
            </button>
            <button
              type="button"
              onClick={() => navigate('/guias-remision/nuevo/transportista')}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 border border-violet-200 dark:border-violet-700 rounded-lg transition-colors"
            >
              <Truck className="h-4 w-4" />
              Nueva GRE Transportista
            </button>
          </div>
        </div>
      </div>

      {/* Banner de configuración — solo si faltan credenciales SUNAT */}
      {!credencialesCompletas && (
        <div className="px-6 pt-4">
          <BannerConfiguracionGRE onConfigurar={() => setModalConfigOpen(true)} />
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6">
        <nav className="flex gap-0 -mb-px">
          {(['listado', 'borradores'] as Tab[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => { setTabActivo(id); setBusqueda(''); setFechaDesde(''); setFechaHasta(''); setFiltrosAvanzados(FILTROS_GRE_VACIO); }}
              className={`px-5 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tabActivo === id
                  ? 'border-violet-600 text-violet-700 dark:text-violet-400 dark:border-violet-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {id === 'listado' ? 'Listado' : 'Borradores'}
            </button>
          ))}
        </nav>
      </div>

      {/* Toolbar de filtros */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Búsqueda libre */}
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por N° guía, destinatario o RUC…"
              className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
            />
          </div>

          {/* Rango de fechas */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="h-9 px-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
              aria-label="Fecha desde"
            />
            <span className="text-gray-400 text-sm">–</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="h-9 px-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
              aria-label="Fecha hasta"
            />
          </div>

          {/* Filtros avanzados */}
          <button
            type="button"
            onClick={() => setDrawerFiltrosOpen(true)}
            className={`relative flex items-center gap-2 h-9 px-3 text-sm font-medium rounded-lg border transition-colors ${
              badgeFiltros > 0
                ? 'border-violet-300 dark:border-violet-600 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400'
                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {badgeFiltros > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
                {badgeFiltros}
              </span>
            )}
          </button>

          {/* Columnas */}
          <div ref={refColumnas} className="relative">
            <button
              type="button"
              onClick={() => setPanelColumnasOpen((v) => !v)}
              className="flex items-center gap-2 h-9 px-3 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Columns3 className="h-4 w-4" />
              Columnas
            </button>
            {panelColumnasOpen && (
              <PanelColumnasGRE
                columnas={columnas}
                onChange={handleColumnasChange}
                onCerrar={() => setPanelColumnasOpen(false)}
              />
            )}
          </div>

          {/* Contador de resultados */}
          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 shrink-0">
            {guiasFiltradas.length} resultado{guiasFiltradas.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Contenido */}
      <div className="px-6 py-6">
        <TablaGuias
          guias={guiasFiltradas}
          columnas={columnas}
          onVerDetalle={handleVerDetalle}
          onAnular={handleAnular}
          onEliminarBorrador={handleEliminarBorrador}
          onDuplicar={(g) => void handleDuplicar(g)}
          onImprimir={handleImprimir}
          puedeGestionar={puedeGestionarGRE}
        />
      </div>

      {/* Drawer de detalle */}
      {guiaDetalle && tenantId && (
        <DrawerDetalleGRE
          guia={guiaDetalle}
          tenantId={tenantId}
          onCerrar={() => {
            setGuiaDetalle(null);
            if (idParam) navigate('/guias-remision');
          }}
          onAnular={handleAnular}
          onImprimir={handleImprimir}
          onDuplicar={(g) => void handleDuplicar(g)}
          onEditar={handleEditarDesdeDrawer}
          onEliminarBorrador={handleEliminarBorrador}
          puedeGestionar={puedeGestionarGRE}
        />
      )}

      {/* Drawer filtros avanzados */}
      <DrawerFiltrosGRE
        open={drawerFiltrosOpen}
        filtros={filtrosAvanzados}
        onAplicar={setFiltrosAvanzados}
        onCerrar={() => setDrawerFiltrosOpen(false)}
      />

      {/* Modal de anulación */}
      <ModalAnularGRE
        open={modalAnular.open}
        guia={modalAnular.guia}
        motivo={modalAnular.motivo}
        onMotivoChange={(m) => setModalAnular((prev) => ({ ...prev, motivo: m }))}
        onConfirmar={() => void handleConfirmarAnulacion()}
        onCancelar={() => setModalAnular({ open: false, guia: null, motivo: '', cargando: false })}
        cargando={modalAnular.cargando}
      />

      {/* Modal eliminar borrador */}
      <ModalEliminarBorradorGRE
        open={modalEliminar.open}
        guia={modalEliminar.guia}
        onConfirmar={() => void handleConfirmarEliminar()}
        onCancelar={() => setModalEliminar({ open: false, guia: null, cargando: false })}
        cargando={modalEliminar.cargando}
      />

      {/* Modal de configuración de credenciales GRE */}
      <ModalConfiguracionGRE
        open={modalConfigOpen}
        onCerrar={() => setModalConfigOpen(false)}
        onGuardado={() => { refrescar(); }}
      />
    </div>
  );
}
