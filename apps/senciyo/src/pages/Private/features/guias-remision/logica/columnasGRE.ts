export interface ColumnaGREConfig {
  id: string;
  label: string;
  visible: boolean;
  fija: 'izquierda' | 'derecha' | null;
  alineacion: 'izquierda' | 'derecha' | 'centro';
  ancho?: string;      // CSS width ej. '10rem'
  obligatoria?: boolean; // no se puede desactivar
}

export const COLUMNAS_GRE_DEFECTO: readonly ColumnaGREConfig[] = [
  { id: 'numero',          label: 'N° Guía',              visible: true,  fija: 'izquierda', obligatoria: true,  ancho: '10rem',  alineacion: 'izquierda' },
  { id: 'tipo',            label: 'Tipo',                 visible: true,  fija: null,         ancho: '8rem',   alineacion: 'izquierda' },
  { id: 'destinatario',    label: 'Destinatario',         visible: true,  fija: null,                          alineacion: 'izquierda' },
  { id: 'motivo',          label: 'Motivo de traslado',   visible: true,  fija: null,         ancho: '11rem',  alineacion: 'izquierda' },
  { id: 'fechaEmision',    label: 'F. Emisión',           visible: true,  fija: null,         ancho: '7rem',   alineacion: 'izquierda' },
  { id: 'estado',          label: 'Estado',               visible: true,  fija: null,         ancho: '7.5rem', alineacion: 'centro' },
  // Columnas opcionales
  { id: 'modalidad',       label: 'Modalidad',            visible: false, fija: null,         ancho: '6.5rem', alineacion: 'izquierda' },
  { id: 'fechaTraslado',   label: 'F. Traslado/Entrega',  visible: false, fija: null,         ancho: '9rem',   alineacion: 'izquierda' },
  { id: 'rucDestinatario', label: 'RUC/Doc',              visible: false, fija: null,         ancho: '8rem',   alineacion: 'izquierda' },
  { id: 'pesoTotal',       label: 'Peso total',           visible: false, fija: null,         ancho: '8rem',   alineacion: 'derecha' },
  { id: 'cantidadBienes',  label: 'Cant. bienes',         visible: false, fija: null,         ancho: '5.5rem', alineacion: 'centro' },
  { id: 'puntoPartida',    label: 'Punto de partida',     visible: false, fija: null,         ancho: '11rem',  alineacion: 'izquierda' },
  { id: 'puntoLlegada',    label: 'Punto de llegada',     visible: false, fija: null,         ancho: '11rem',  alineacion: 'izquierda' },
  { id: 'transportista',   label: 'Transportista',        visible: false, fija: null,         ancho: '10rem',  alineacion: 'izquierda' },
  // Columna de acciones — siempre al final
  { id: 'acciones',        label: '',                     visible: true,  fija: 'derecha',    obligatoria: true,  ancho: '7rem',   alineacion: 'derecha' },
] as const;

const CLAVE_BASE = 'gre_listado_columnas';

export function cargarColumnasGRE(tenantId: string | null): ColumnaGREConfig[] {
  const clave = tenantId ? `${CLAVE_BASE}_${tenantId}` : CLAVE_BASE;
  try {
    const raw = localStorage.getItem(clave);
    if (!raw) return COLUMNAS_GRE_DEFECTO.map((c) => ({ ...c }));
    const guardadas = JSON.parse(raw) as ColumnaGREConfig[];
    // Merge: preservar visibilidad guardada; respetar nuevas columnas añadidas al defecto
    return COLUMNAS_GRE_DEFECTO.map((def) => {
      if (def.obligatoria) return { ...def };
      const guardada = guardadas.find((c) => c.id === def.id);
      return guardada ? { ...def, visible: guardada.visible } : { ...def };
    });
  } catch {
    return COLUMNAS_GRE_DEFECTO.map((c) => ({ ...c }));
  }
}

export function persistirColumnasGRE(columnas: ColumnaGREConfig[], tenantId: string | null): void {
  const clave = tenantId ? `${CLAVE_BASE}_${tenantId}` : CLAVE_BASE;
  try {
    localStorage.setItem(clave, JSON.stringify(columnas));
  } catch {
    // best-effort
  }
}
