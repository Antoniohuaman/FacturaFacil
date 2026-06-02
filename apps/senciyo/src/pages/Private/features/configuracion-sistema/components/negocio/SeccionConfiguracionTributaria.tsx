import { useMemo, useState } from 'react';
import { Search, Settings2 } from 'lucide-react';
import {
  obtenerCatalogoTributario,
  ETIQUETAS_CATALOGO,
  ORDEN_CATALOGOS,
  cargarConfiguracionDetraccion,
  CATALOGO_54_DETRACCIONES,
} from '@/shared/catalogos-sunat';
import type { TipoCatalogo, ItemCatalogoTributario, SobrescriturasCatalogo } from '@/shared/catalogos-sunat';
import { PAYMENT_MEANS_CATALOG } from '@/shared/payments/paymentMeans';
import { lsKey } from '@/shared/tenant';
import { TablaCatalogoTributario } from './TablaCatalogoTributario';
import { ModalConfiguracionDetraccion } from './ModalConfiguracionDetraccion';

type FiltroEstado = 'todos' | 'activos' | 'inactivos' | 'visibles';

const CLAVE_SOBRESCRITURAS = 'tributaria_sobrescrituras_v1';

// Derivados de la fuente de verdad Cat.54 — evita sincronía manual
const CLASIFICACIONES_54 = [
  ...new Set(CATALOGO_54_DETRACCIONES.map((i) => i.clasificacion)),
].sort((a, b) => a.localeCompare(b, 'es'));

const PORCENTAJES_54_NUMERICOS = [
  ...new Set(
    CATALOGO_54_DETRACCIONES
      .filter((i) => i.tipoPorcentaje === 'fijo' && i.porcentajeNormativo !== null)
      .map((i) => String(i.porcentajeNormativo))
  ),
].sort((a, b) => Number(b) - Number(a));

const PORCENTAJES_54 = [...PORCENTAJES_54_NUMERICOS, 'condicional', 'pendiente'];

const ETIQUETAS_PORCENTAJE: Record<string, string> = {
  ...Object.fromEntries(PORCENTAJES_54_NUMERICOS.map((p) => [p, `${p}%`])),
  condicional: 'Condicional',
  pendiente: 'Pendiente',
};

function cargarSobrescrituras(catalogo: TipoCatalogo): SobrescriturasCatalogo {
  if (typeof window === 'undefined') return { inactivos: [], ocultos: [] };
  try {
    const raw = window.localStorage.getItem(lsKey(`${CLAVE_SOBRESCRITURAS}_${catalogo}`));
    if (!raw) return { inactivos: [], ocultos: [] };
    return JSON.parse(raw) as SobrescriturasCatalogo;
  } catch {
    return { inactivos: [], ocultos: [] };
  }
}

function guardarSobrescrituras(catalogo: TipoCatalogo, datos: SobrescriturasCatalogo): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      lsKey(`${CLAVE_SOBRESCRITURAS}_${catalogo}`),
      JSON.stringify(datos)
    );
  } catch {
    // No bloquear UI si falla
  }
}

const SELECT_CLASS =
  'text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer';

export function SeccionConfiguracionTributaria() {
  const [catalogoActivo, setCatalogoActivo] = useState<TipoCatalogo>('51');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');
  const [filtroClasificacion, setFiltroClasificacion] = useState('todas');
  const [filtroPorcentaje, setFiltroPorcentaje] = useState('todos');
  const [filtroTipoOp, setFiltroTipoOp] = useState('todos');
  const [modalDetraccionAbierto, setModalDetraccionAbierto] = useState(false);
  const [configDetraccion, setConfigDetraccion] = useState(() => cargarConfiguracionDetraccion());

  const [sobrescrituras, setSobrescrituras] = useState<SobrescriturasCatalogo>(
    () => cargarSobrescrituras(catalogoActivo)
  );

  const handleCambiarCatalogo = (tipo: TipoCatalogo) => {
    setCatalogoActivo(tipo);
    setBusqueda('');
    setFiltroEstado('todos');
    setFiltroClasificacion('todas');
    setFiltroPorcentaje('todos');
    setFiltroTipoOp('todos');
    setSobrescrituras(cargarSobrescrituras(tipo));
  };

  const codigosInactivos = useMemo(() => new Set(sobrescrituras.inactivos), [sobrescrituras.inactivos]);
  const codigosOcultos = useMemo(() => new Set(sobrescrituras.ocultos), [sobrescrituras.ocultos]);

  const toggleActivo = (codigo: string) => {
    setSobrescrituras((prev) => {
      const inactivos = prev.inactivos.includes(codigo)
        ? prev.inactivos.filter((c) => c !== codigo)
        : [...prev.inactivos, codigo];
      const siguiente = { ...prev, inactivos };
      guardarSobrescrituras(catalogoActivo, siguiente);
      return siguiente;
    });
  };

  const toggleVisible = (codigo: string) => {
    setSobrescrituras((prev) => {
      const ocultos = prev.ocultos.includes(codigo)
        ? prev.ocultos.filter((c) => c !== codigo)
        : [...prev.ocultos, codigo];
      const siguiente = { ...prev, ocultos };
      guardarSobrescrituras(catalogoActivo, siguiente);
      return siguiente;
    });
  };

  const itemsBase: ItemCatalogoTributario[] = useMemo(
    () => obtenerCatalogoTributario(catalogoActivo),
    [catalogoActivo]
  );

  const itemsFiltrados = useMemo(() => {
    const termino = busqueda.toLowerCase().trim();
    return itemsBase.filter((item) => {
      // Filtro de búsqueda textual
      if (termino) {
        const enCodigo = item.codigo.toLowerCase().includes(termino);
        const enDescripcion = item.descripcion.toLowerCase().includes(termino);
        const enGrupo = 'grupo' in item ? (item.grupo as string).toLowerCase().includes(termino) : false;
        const enDetraccion = item.catalogo === '54'
          ? (item.clasificacion.toLowerCase().includes(termino) ||
             item.tipoPorcentaje.toLowerCase().includes(termino) ||
             item.tipoOperacionRelacionado.includes(termino) ||
             (item.porcentajeNormativo !== null && String(item.porcentajeNormativo).includes(termino)))
          : false;
        if (!enCodigo && !enDescripcion && !enGrupo && !enDetraccion) return false;
      }
      // Filtro de estado
      const activo = !codigosInactivos.has(item.codigo);
      const visible = !codigosOcultos.has(item.codigo);
      if (filtroEstado === 'activos' && !activo) return false;
      if (filtroEstado === 'inactivos' && activo) return false;
      if (filtroEstado === 'visibles' && !visible) return false;
      // Filtros específicos de Cat.54
      if (item.catalogo === '54') {
        if (filtroClasificacion !== 'todas' && item.clasificacion !== filtroClasificacion) return false;
        if (filtroTipoOp !== 'todos' && item.tipoOperacionRelacionado !== filtroTipoOp) return false;
        if (filtroPorcentaje !== 'todos') {
          const numFiltro = Number(filtroPorcentaje);
          if (!isNaN(numFiltro) && filtroPorcentaje !== 'condicional' && filtroPorcentaje !== 'pendiente') {
            if (item.porcentajeNormativo !== numFiltro) return false;
          } else if (filtroPorcentaje === 'condicional' && item.tipoPorcentaje !== 'condicional') return false;
          else if (filtroPorcentaje === 'pendiente' && item.tipoPorcentaje !== 'pendiente') return false;
        }
      }
      return true;
    });
  }, [
    itemsBase, busqueda, filtroEstado,
    filtroClasificacion, filtroPorcentaje, filtroTipoOp,
    codigosInactivos, codigosOcultos,
  ]);

  const totalBase = itemsBase.length;

  // Descripción del medio de pago BN (código + nombre)
  const descripcionMedioPago = useMemo(() => {
    const encontrado = PAYMENT_MEANS_CATALOG.find(
      (m) => m.code === configDetraccion.medioPagoSunatPorDefecto
    );
    return encontrado
      ? `${encontrado.code} - ${encontrado.sunatName}`
      : configDetraccion.medioPagoSunatPorDefecto;
  }, [configDetraccion.medioPagoSunatPorDefecto]);

  return (
    <div className="space-y-4">
      {/* Encabezado mínimo */}
      <h3 className="text-base font-semibold text-gray-900">Configuración tributaria</h3>

      {/* Selector de catálogo (mini tabs) */}
      <div className="flex flex-wrap gap-1.5">
        {ORDEN_CATALOGOS.map((tipo) => (
          <button
            key={tipo}
            type="button"
            onClick={() => handleCambiarCatalogo(tipo)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              catalogoActivo === tipo
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {ETIQUETAS_CATALOGO[tipo]}
          </button>
        ))}
      </div>

      {/* Bloque cuenta BN — solo cuando Cat.54 está activo */}
      {catalogoActivo === '54' && (
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-teal-800">Cuenta Banco de la Nación</p>
            <div className="mt-1 flex flex-wrap gap-x-5 gap-y-0.5 text-xs text-teal-700">
              <span>
                <span className="font-medium">Cuenta BN:</span>{' '}
                {configDetraccion.cuentaBancoNacion || (
                  <span className="text-amber-600 font-medium">Sin configurar</span>
                )}
              </span>
              <span className="truncate max-w-xs" title={descripcionMedioPago}>
                <span className="font-medium">Medio de pago:</span>{' '}
                {descripcionMedioPago}
              </span>
              <span>
                <span className="font-medium">Redondeo:</span>{' '}
                {configDetraccion.redondearMonto ? 'Sí' : 'No'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalDetraccionAbierto(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:text-teal-900 border border-teal-300 hover:border-teal-400 rounded-md px-3 py-1.5 bg-white transition-colors whitespace-nowrap shrink-0"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Configurar
          </button>
        </div>
      )}

      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Búsqueda */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por código, descripción…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filtros de estado */}
        <div className="flex gap-1">
          {(
            [
              { valor: 'todos', etiqueta: 'Todos' },
              { valor: 'activos', etiqueta: 'Activos' },
              { valor: 'inactivos', etiqueta: 'Inactivos' },
              { valor: 'visibles', etiqueta: 'Visibles' },
            ] as { valor: FiltroEstado; etiqueta: string }[]
          ).map(({ valor, etiqueta }) => (
            <button
              key={valor}
              type="button"
              onClick={() => setFiltroEstado(valor)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filtroEstado === valor
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        {/* Filtros específicos de Cat.54 */}
        {catalogoActivo === '54' && (
          <>
            <select
              value={filtroClasificacion}
              onChange={(e) => setFiltroClasificacion(e.target.value)}
              className={SELECT_CLASS}
              aria-label="Filtrar por clasificación"
            >
              <option value="todas">Clasificación</option>
              {CLASIFICACIONES_54.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={filtroPorcentaje}
              onChange={(e) => setFiltroPorcentaje(e.target.value)}
              className={SELECT_CLASS}
              aria-label="Filtrar por porcentaje"
            >
              <option value="todos">Porcentaje</option>
              {PORCENTAJES_54.map((p) => (
                <option key={p} value={p}>{ETIQUETAS_PORCENTAJE[p]}</option>
              ))}
            </select>

            <select
              value={filtroTipoOp}
              onChange={(e) => setFiltroTipoOp(e.target.value)}
              className={SELECT_CLASS}
              aria-label="Filtrar por tipo de operación"
            >
              <option value="todos">Tipo op.</option>
              {['1001', '1002', '1003', '1004'].map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </>
        )}

        {/* Contador */}
        <span className="text-xs text-gray-400 whitespace-nowrap ml-auto">
          {itemsFiltrados.length === totalBase
            ? `${totalBase} registros`
            : `${itemsFiltrados.length} de ${totalBase}`}
        </span>
      </div>

      {/* Tabla */}
      <TablaCatalogoTributario
        tipoCatalogo={catalogoActivo}
        items={itemsFiltrados}
        codigosInactivos={codigosInactivos}
        codigosOcultos={codigosOcultos}
        onToggleActivo={toggleActivo}
        onToggleVisible={toggleVisible}
      />

      {/* Modal configuración cuenta BN */}
      <ModalConfiguracionDetraccion
        abierto={modalDetraccionAbierto}
        onCerrar={() => setModalDetraccionAbierto(false)}
        onGuardado={(config) => setConfigDetraccion(config)}
      />
    </div>
  );
}
