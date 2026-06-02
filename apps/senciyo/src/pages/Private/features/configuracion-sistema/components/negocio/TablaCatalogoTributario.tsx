import { Eye, EyeOff } from 'lucide-react';
import type {
  TipoCatalogo,
  ItemCatalogoTributario,
  TipoOperacionTributaria,
  CodigoDetraccionTributaria,
  LeyendaTributaria,
  CargoDescuentoTributario,
  TipoPrecioTributario,
} from '@/shared/catalogos-sunat';

interface TablaCatalogoTributarioProps {
  tipoCatalogo: TipoCatalogo;
  items: ItemCatalogoTributario[];
  codigosInactivos: Set<string>;
  codigosOcultos: Set<string>;
  onToggleActivo: (codigo: string) => void;
  onToggleVisible: (codigo: string) => void;
}

// ─── Badges ──────────────────────────────────────────────────────────────────

const COLORES_GRUPO: Record<string, string> = {
  'Venta interna':           'bg-gray-100 text-gray-700',
  'Exportación':             'bg-blue-100 text-blue-700',
  'Transporte':              'bg-violet-100 text-violet-700',
  'No domiciliados':         'bg-orange-100 text-orange-700',
  'Liquidación de compra':   'bg-amber-100 text-amber-700',
  'Detracción':              'bg-teal-100 text-teal-700',
  'Percepción':              'bg-indigo-100 text-indigo-700',
  'Retención':               'bg-red-100 text-red-700',
  'Operaciones financieras': 'bg-yellow-100 text-yellow-700',
  'AFP':                     'bg-slate-100 text-slate-700',
  'Tax Free':                'bg-green-100 text-green-700',
  'General':                 'bg-gray-100 text-gray-700',
  'Gratuita':                'bg-green-100 text-green-700',
  'Amazonía':                'bg-emerald-100 text-emerald-700',
  'Agencia de viaje':        'bg-cyan-100 text-cyan-700',
  'Venta itinerante':        'bg-lime-100 text-lime-700',
  'IVAP':                    'bg-rose-100 text-rose-700',
  'Tacna':                   'bg-fuchsia-100 text-fuchsia-700',
  'Zona comercial':          'bg-sky-100 text-sky-700',
  'Traslado':                'bg-stone-100 text-stone-700',
  'Descuento':               'bg-green-100 text-green-700',
  'Anticipo':                'bg-amber-100 text-amber-700',
  'Factor':                  'bg-gray-100 text-gray-700',
  'Cargo':                   'bg-orange-100 text-orange-700',
};

const COLORES_CLASIFICACION: Record<string, string> = {
  'Bien':                   'bg-blue-100 text-blue-700',
  'Servicio':               'bg-purple-100 text-purple-700',
  'Transporte carga':       'bg-orange-100 text-orange-700',
  'Transporte pasajeros':   'bg-teal-100 text-teal-700',
  'Recurso hidrobiológico': 'bg-cyan-100 text-cyan-700',
  'Construcción':           'bg-amber-100 text-amber-700',
  'Bien inmueble':          'bg-indigo-100 text-indigo-700',
  'Especial':               'bg-red-100 text-red-700',
};

function BadgeGrupo({ texto }: { texto: string }) {
  const clases = COLORES_GRUPO[texto] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${clases}`}>
      {texto}
    </span>
  );
}

function BadgeClasificacion({ texto }: { texto: string }) {
  const clases = COLORES_CLASIFICACION[texto] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${clases}`}>
      {texto}
    </span>
  );
}

function BadgeNivel({ nivel }: { nivel: 'Item' | 'Global' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
      nivel === 'Item' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
    }`}>
      {nivel}
    </span>
  );
}

function BadgeImplementacion({ valor }: { valor: 'implementado' | 'pendiente' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
      valor === 'implementado'
        ? 'bg-emerald-100 text-emerald-700'
        : 'bg-amber-100 text-amber-700'
    }`}>
      {valor === 'implementado' ? 'Disponible' : 'Pendiente'}
    </span>
  );
}

// ─── Celdas compartidas ───────────────────────────────────────────────────────

interface AccionesFilaProps {
  codigo: string;
  activo: boolean;
  visible: boolean;
  onToggleActivo: (codigo: string) => void;
  onToggleVisible: (codigo: string) => void;
}

function AccionesFila({ codigo, activo, visible, onToggleActivo, onToggleVisible }: AccionesFilaProps) {
  return (
    <>
      <td className="px-3 py-2 text-center w-10">
        <button
          type="button"
          onClick={() => onToggleVisible(codigo)}
          title={visible ? 'Ocultar' : 'Mostrar'}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 opacity-50" />}
        </button>
      </td>
      <td className="px-3 py-2 text-center w-20">
        <span className={`inline-flex items-center gap-1 text-xs ${activo ? 'text-emerald-600' : 'text-gray-400'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${activo ? 'bg-emerald-500' : 'bg-gray-300'}`} />
          {activo ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td className="px-3 py-2 text-center w-20">
        <button
          type="button"
          onClick={() => onToggleActivo(codigo)}
          className={`text-xs px-2 py-0.5 rounded border transition-colors ${
            activo
              ? 'border-gray-300 text-gray-500 hover:border-red-300 hover:text-red-500'
              : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50'
          }`}
        >
          {activo ? 'Desactivar' : 'Activar'}
        </button>
      </td>
    </>
  );
}

// ─── Cabeceras por catálogo ───────────────────────────────────────────────────

const CABECERAS: Record<TipoCatalogo, string[]> = {
  '51': ['Código', 'Descripción', 'Grupo', 'Comprobantes', 'Disponible', 'Vis.', 'Estado', ''],
  '54': ['Código', 'Descripción', '%', 'Tipo op.', 'Clasificación', 'Disponible', 'Vis.', 'Estado', ''],
  '52': ['Código', 'Descripción', 'Grupo', 'Vis.', 'Estado', ''],
  '53': ['Código', 'Descripción', 'Nivel', 'Grupo', 'Vis.', 'Estado', ''],
  '16': ['Código', 'Descripción', 'Uso', 'Vis.', 'Estado', ''],
};

// ─── Filas por tipo de catálogo ───────────────────────────────────────────────

interface FilaBaseProps {
  activo: boolean;
  visible: boolean;
  onToggleActivo: (c: string) => void;
  onToggleVisible: (c: string) => void;
}

function FilaTipoOperacion({
  item, activo, visible, onToggleActivo, onToggleVisible,
}: FilaBaseProps & { item: TipoOperacionTributaria }) {
  return (
    <tr className="hover:bg-gray-50 border-b border-gray-100">
      <td className="px-3 py-2 w-16 font-mono text-xs text-gray-900 whitespace-nowrap">{item.codigo}</td>
      <td className="px-3 py-2 max-w-xs">
        <span className="block truncate text-sm text-gray-800" title={item.descripcion}>{item.descripcion}</span>
      </td>
      <td className="px-3 py-2 whitespace-nowrap"><BadgeGrupo texto={item.grupo} /></td>
      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{item.comprobantesAsociados}</td>
      <td className="px-3 py-2 whitespace-nowrap"><BadgeImplementacion valor={item.implementacion} /></td>
      <AccionesFila codigo={item.codigo} activo={activo} visible={visible} onToggleActivo={onToggleActivo} onToggleVisible={onToggleVisible} />
    </tr>
  );
}

function CeldaPorcentaje({ item }: { item: CodigoDetraccionTributaria }) {
  if (item.tipoPorcentaje === 'fijo' && item.porcentajeNormativo !== null) {
    return (
      <td className="px-3 py-2 w-14 text-xs font-medium text-gray-700 whitespace-nowrap">
        {item.porcentajeNormativo}%
      </td>
    );
  }
  if (item.tipoPorcentaje === 'condicional') {
    return (
      <td className="px-3 py-2 w-14 whitespace-nowrap">
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 cursor-help"
          title={item.notaPorcentaje}
        >
          Cond.
        </span>
      </td>
    );
  }
  if (item.tipoPorcentaje === 'variable') {
    return (
      <td className="px-3 py-2 w-14 whitespace-nowrap">
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 cursor-help"
          title={item.notaPorcentaje}
        >
          Var.
        </span>
      </td>
    );
  }
  return (
    <td className="px-3 py-2 w-14 whitespace-nowrap">
      <span
        className="text-xs text-gray-400"
        title={item.notaPorcentaje}
      >
        —
      </span>
    </td>
  );
}

function FilaDetraccion({
  item, activo, visible, onToggleActivo, onToggleVisible,
}: FilaBaseProps & { item: CodigoDetraccionTributaria }) {
  return (
    <tr className="hover:bg-gray-50 border-b border-gray-100">
      <td className="px-3 py-2 w-16 font-mono text-xs text-gray-900 whitespace-nowrap">{item.codigo}</td>
      <td className="px-3 py-2 max-w-xs">
        <span className="block truncate text-sm text-gray-800" title={item.descripcion}>{item.descripcion}</span>
      </td>
      <CeldaPorcentaje item={item} />
      <td className="px-3 py-2 w-16 font-mono text-xs text-gray-500 whitespace-nowrap">{item.tipoOperacionRelacionado}</td>
      <td className="px-3 py-2 whitespace-nowrap"><BadgeClasificacion texto={item.clasificacion} /></td>
      <td className="px-3 py-2 whitespace-nowrap"><BadgeImplementacion valor={item.implementacion} /></td>
      <AccionesFila codigo={item.codigo} activo={activo} visible={visible} onToggleActivo={onToggleActivo} onToggleVisible={onToggleVisible} />
    </tr>
  );
}

function FilaLeyenda({
  item, activo, visible, onToggleActivo, onToggleVisible,
}: FilaBaseProps & { item: LeyendaTributaria }) {
  return (
    <tr className="hover:bg-gray-50 border-b border-gray-100">
      <td className="px-3 py-2 w-16 font-mono text-xs text-gray-900 whitespace-nowrap">{item.codigo}</td>
      <td className="px-3 py-2 max-w-sm">
        <span className="block truncate text-sm text-gray-800" title={item.descripcion}>{item.descripcion}</span>
      </td>
      <td className="px-3 py-2 whitespace-nowrap"><BadgeGrupo texto={item.grupo} /></td>
      <AccionesFila codigo={item.codigo} activo={activo} visible={visible} onToggleActivo={onToggleActivo} onToggleVisible={onToggleVisible} />
    </tr>
  );
}

function FilaCargoDescuento({
  item, activo, visible, onToggleActivo, onToggleVisible,
}: FilaBaseProps & { item: CargoDescuentoTributario }) {
  return (
    <tr className="hover:bg-gray-50 border-b border-gray-100">
      <td className="px-3 py-2 w-12 font-mono text-xs text-gray-900 whitespace-nowrap">{item.codigo}</td>
      <td className="px-3 py-2 max-w-xs">
        <span className="block truncate text-sm text-gray-800" title={item.descripcion}>{item.descripcion}</span>
      </td>
      <td className="px-3 py-2 whitespace-nowrap"><BadgeNivel nivel={item.nivel} /></td>
      <td className="px-3 py-2 whitespace-nowrap"><BadgeGrupo texto={item.grupo} /></td>
      <AccionesFila codigo={item.codigo} activo={activo} visible={visible} onToggleActivo={onToggleActivo} onToggleVisible={onToggleVisible} />
    </tr>
  );
}

function FilaTipoPrecio({
  item, activo, visible, onToggleActivo, onToggleVisible,
}: FilaBaseProps & { item: TipoPrecioTributario }) {
  return (
    <tr className="hover:bg-gray-50 border-b border-gray-100">
      <td className="px-3 py-2 w-12 font-mono text-xs text-gray-900 whitespace-nowrap">{item.codigo}</td>
      <td className="px-3 py-2 max-w-xs">
        <span className="block truncate text-sm text-gray-800" title={item.descripcion}>{item.descripcion}</span>
      </td>
      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{item.uso}</td>
      <AccionesFila codigo={item.codigo} activo={activo} visible={visible} onToggleActivo={onToggleActivo} onToggleVisible={onToggleVisible} />
    </tr>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function TablaCatalogoTributario({
  tipoCatalogo,
  items,
  codigosInactivos,
  codigosOcultos,
  onToggleActivo,
  onToggleVisible,
}: TablaCatalogoTributarioProps) {
  const cabeceras = CABECERAS[tipoCatalogo];

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-gray-400">
        No se encontraron registros con los filtros aplicados.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {cabeceras.map((h, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const activo = !codigosInactivos.has(item.codigo);
            const visible = !codigosOcultos.has(item.codigo);
            const base: FilaBaseProps = { activo, visible, onToggleActivo, onToggleVisible };

            switch (item.catalogo) {
              case '51': return <FilaTipoOperacion key={item.codigo} item={item} {...base} />;
              case '54': return <FilaDetraccion key={item.codigo} item={item} {...base} />;
              case '52': return <FilaLeyenda key={item.codigo} item={item} {...base} />;
              case '53': return <FilaCargoDescuento key={item.codigo} item={item} {...base} />;
              case '16': return <FilaTipoPrecio key={item.codigo} item={item} {...base} />;
            }
          })}
        </tbody>
      </table>
    </div>
  );
}
