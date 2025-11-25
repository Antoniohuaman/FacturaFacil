import { useCallback, useEffect, useMemo, useState } from 'react';

export type ClienteColumnId =
  | 'avatar'
  | 'tipoDocumento'
  | 'numeroDocumento'
  | 'nombreRazonSocial'
  | 'direccion'
  | 'tipoCuenta'
  | 'telefono'
  | 'correo'
  | 'tipoPersona'
  | 'nombreComercial'
  | 'paginaWeb'
  | 'pais'
  | 'departamento'
  | 'provincia'
  | 'distrito'
  | 'ubigeo'
  | 'referenciaDireccion'
  | 'formaPago'
  | 'monedaPreferida'
  | 'listaPrecio'
  | 'usuarioAsignado'
  | 'clientePorDefecto'
  | 'tipoContribuyente'
  | 'estadoSunat'
  | 'condicionDomicilio'
  | 'fechaInscripcion'
  | 'sistemaEmision'
  | 'esEmisorElectronico'
  | 'esAgenteRetencion'
  | 'esAgentePercepcion'
  | 'esBuenContribuyente'
  | 'exceptuadaPercepcion'
  | 'actividadesEconomicas'
  | 'observaciones'
  | 'adjuntos'
  | 'imagenes'
  | 'estadoCliente'
  | 'fechaRegistro'
  | 'fechaUltimaModificacion'
  | 'acciones';

export interface ClienteColumnDefinition {
  id: ClienteColumnId;
  label: string;
  fixed?: boolean;
  defaultVisible?: boolean;
}

// Legacy key kept for migration/reference; storage is now tenantized via STORAGE_BASE_KEY
// const STORAGE_KEY = 'ff_gestionClientes_columnVisibility';
import { lsKey as tenantLsKey } from '../../../shared/tenant';

const STORAGE_BASE_KEY = 'clientes_visible_columns';

export const CLIENTE_COLUMN_DEFINITIONS: ClienteColumnDefinition[] = [
  { id: 'avatar', label: 'Avatar', defaultVisible: true },
  { id: 'tipoDocumento', label: 'Tipo doc.' },
  { id: 'numeroDocumento', label: 'N° documento' },
  { id: 'nombreRazonSocial', label: 'Nombre / Razón social' },
  { id: 'direccion', label: 'Dirección', defaultVisible: true },
  { id: 'tipoCuenta', label: 'Tipo cuenta' },
  { id: 'telefono', label: 'Teléfono', defaultVisible: true },
  { id: 'correo', label: 'Correo', defaultVisible: true },
  { id: 'tipoPersona', label: 'Tipo persona', defaultVisible: false },
  { id: 'nombreComercial', label: 'Nombre comercial', defaultVisible: false },
  { id: 'paginaWeb', label: 'Página web', defaultVisible: false },
  { id: 'pais', label: 'País', defaultVisible: false },
  { id: 'departamento', label: 'Departamento', defaultVisible: false },
  { id: 'provincia', label: 'Provincia', defaultVisible: false },
  { id: 'distrito', label: 'Distrito', defaultVisible: false },
  { id: 'ubigeo', label: 'Ubigeo', defaultVisible: false },
  { id: 'referenciaDireccion', label: 'Referencia', defaultVisible: false },
  { id: 'formaPago', label: 'Forma pago', defaultVisible: false },
  { id: 'monedaPreferida', label: 'Moneda', defaultVisible: false },
  { id: 'listaPrecio', label: 'Lista precios', defaultVisible: false },
  { id: 'usuarioAsignado', label: 'Usuario asignado', defaultVisible: false },
  { id: 'clientePorDefecto', label: 'Cliente default', defaultVisible: false },
  { id: 'tipoContribuyente', label: 'Tipo contribuyente', defaultVisible: false },
  { id: 'estadoSunat', label: 'Estado SUNAT', defaultVisible: false },
  { id: 'condicionDomicilio', label: 'Condición dom.', defaultVisible: false },
  { id: 'fechaInscripcion', label: 'Fecha insc.', defaultVisible: false },
  { id: 'sistemaEmision', label: 'Sistema emisión', defaultVisible: false },
  { id: 'esEmisorElectronico', label: 'Emisor electr.', defaultVisible: false },
  { id: 'esAgenteRetencion', label: 'Agente reten.', defaultVisible: false },
  { id: 'esAgentePercepcion', label: 'Agente percep.', defaultVisible: false },
  { id: 'esBuenContribuyente', label: 'Buen contrib.', defaultVisible: false },
  { id: 'exceptuadaPercepcion', label: 'Except. percep.', defaultVisible: false },
  { id: 'actividadesEconomicas', label: 'Actividades econ.', defaultVisible: false },
  { id: 'observaciones', label: 'Observaciones', defaultVisible: false },
  { id: 'adjuntos', label: 'Adjuntos', defaultVisible: false },
  { id: 'imagenes', label: 'Imágenes', defaultVisible: false },
  { id: 'estadoCliente', label: 'Estado cliente', defaultVisible: true },
  { id: 'fechaRegistro', label: 'Fecha registro', defaultVisible: false },
  { id: 'fechaUltimaModificacion', label: 'Últ. modif.', defaultVisible: false },
  { id: 'acciones', label: 'Acciones', fixed: true }
];

const FIXED_COLUMN_IDS = CLIENTE_COLUMN_DEFINITIONS.filter((column) => column.fixed).map((column) => column.id);

const TOGGLEABLE_COLUMN_IDS = CLIENTE_COLUMN_DEFINITIONS.filter((column) => !column.fixed).map((column) => column.id);

const DEFAULT_VISIBLE_COLUMN_IDS: ClienteColumnId[] = [
  'avatar',
  'tipoDocumento',
  'numeroDocumento',
  'nombreRazonSocial',
  'telefono',
  'estadoCliente',
  'acciones'
];

const readFromStorage = (): ClienteColumnId[] | null => {
  if (typeof window === 'undefined') return null;
  try {
    const storageKey = tenantLsKey(STORAGE_BASE_KEY);
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as ClienteColumnId[];
    if (!Array.isArray(parsed)) return null;
    const knownIds = new Set(CLIENTE_COLUMN_DEFINITIONS.map((column) => column.id));
    const sanitized = parsed.filter((id) => knownIds.has(id));
    if (sanitized.length === 0) return null;
    return Array.from(new Set([...FIXED_COLUMN_IDS, ...sanitized]));
  } catch {
    return null;
  }
};

const writeToStorage = (ids: ClienteColumnId[]): void => {
  if (typeof window === 'undefined') return;
  try {
    const storageKey = tenantLsKey(STORAGE_BASE_KEY);
    window.localStorage.setItem(storageKey, JSON.stringify(ids));
  } catch {
    // noop
  }
};

export const useClientesColumns = () => {
  const [visibleColumnIds, setVisibleColumnIds] = useState<ClienteColumnId[]>(() => {
    const stored = readFromStorage();
    return stored ?? DEFAULT_VISIBLE_COLUMN_IDS;
  });

  useEffect(() => {
    writeToStorage(visibleColumnIds);
  }, [visibleColumnIds]);

  const toggleColumn = useCallback((columnId: ClienteColumnId) => {
    if (FIXED_COLUMN_IDS.includes(columnId)) {
      return;
    }
    setVisibleColumnIds((prev) => {
      const isVisible = prev.includes(columnId);
      if (isVisible) {
        return prev.filter((id) => id !== columnId);
      }
      return [...prev, columnId];
    });
  }, []);

  const resetColumns = useCallback(() => {
    setVisibleColumnIds(DEFAULT_VISIBLE_COLUMN_IDS);
  }, []);

  const selectAllColumns = useCallback(() => {
    setVisibleColumnIds(Array.from(new Set([...TOGGLEABLE_COLUMN_IDS, ...FIXED_COLUMN_IDS])) as ClienteColumnId[]);
  }, []);

  const visibleColumns = useMemo(
    () => CLIENTE_COLUMN_DEFINITIONS.filter((column) => visibleColumnIds.includes(column.id)),
    [visibleColumnIds]
  );

  return {
    columnDefinitions: CLIENTE_COLUMN_DEFINITIONS,
    visibleColumns,
    visibleColumnIds,
    toggleColumn,
    resetColumns,
    selectAllColumns,
  };
};
