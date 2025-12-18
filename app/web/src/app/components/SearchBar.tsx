import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Package, Users, Receipt, UserPlus, CreditCard, BarChart3, Settings, DollarSign, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useProductStore } from '../../features/catalogo-articulos/hooks/useProductStore';
import type { Product } from '../../features/catalogo-articulos/models/types';
import { useClientes } from '../../features/gestion-clientes/hooks/useClientes';
import type { Cliente, ClienteFilters } from '../../features/gestion-clientes/models';
import { useComprobanteContext } from '../../features/comprobantes-electronicos/lista-comprobantes/contexts/ComprobantesListContext';
import type { Comprobante } from '../../features/comprobantes-electronicos/lista-comprobantes/contexts/ComprobantesListContext';
import { useCobranzasContext } from '../../features/gestion-cobranzas/context/CobranzasContext';
import type { CuentaPorCobrarSummary } from '../../features/gestion-cobranzas/models/cobranzas.types';

// Interfaces de tipos
interface BaseCommand {
  id: string;
  nombre: string;
  categoria: 'acciones' | 'navegacion';
  atajo: string;
}

interface SystemCommand extends BaseCommand {
  icono: LucideIcon;
}

interface CustomCommand extends BaseCommand {
  icono?: LucideIcon;
}

type Command = SystemCommand | CustomCommand;

type PaletteItem = {
  key: string;
  onExecute: () => void;
};

type SearchResultCategory = 'comprobantes' | 'productos' | 'clientes' | 'cobranzas';

interface SearchFieldDescriptor {
  value?: string | null;
  weight: number;
  isKey?: boolean;
}

interface NumericFieldDescriptor {
  value?: number | null;
  weight: number;
}

interface SearchDisplayItem<T> {
  type: SearchResultCategory;
  id: string;
  entity: T;
  title: string;
  subtitle?: string;
  meta?: string;
  amountLabel?: string;
  amountValue?: number;
  amountCurrency?: string;
  score: number;
}

interface SearchCandidate<T> extends Omit<SearchDisplayItem<T>, 'type' | 'score'> {
  searchFields: SearchFieldDescriptor[];
  numericFields?: NumericFieldDescriptor[];
}

interface SectionResults<T> {
  items: Array<SearchDisplayItem<T>>;
  total: number;
  hasMore: boolean;
}

type HighlightPart = {
  text: string;
  match: boolean;
};

const SECTION_LIMIT = 5;
const COMMAND_PALETTE_RESULT_LIMIT = 3;
const DIACRITIC_REGEX = /[\u0300-\u036f]/g;

const removeDiacritics = (value: string) => value.normalize('NFD').replace(DIACRITIC_REGEX, '');

const normalizeValue = (value: string) => removeDiacritics(value).toLowerCase();

const normalizeDocumentKey = (value: string) => value.replace(/[^a-z0-9]/gi, '').toLowerCase();

const buildHaystackValue = (...values: Array<string | undefined | null>) =>
  values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(' ');

const SECTION_ROUTE_MAP: Record<SearchResultCategory, string | null> = {
  clientes: '/clientes',
  productos: '/catalogo',
  comprobantes: '/comprobantes',
  cobranzas: '/cobranzas',
};

const tokenizeQuery = (value: string) => {
  const normalized = normalizeValue(value.trim());
  return normalized.length ? normalized.split(/\s+/).filter(Boolean) : [];
};

const extractNumericQuery = (value: string) => value.replace(/[^0-9]/g, '');

const highlightParts = (value: string, query: string): HighlightPart[] => {
  if (!value) {
    return [];
  }
  const normalizedQuery = normalizeValue(query.trim());
  if (!normalizedQuery) {
    return [{ text: value, match: false }];
  }
  const normalizedValue = normalizeValue(value);
  const startIndex = normalizedValue.indexOf(normalizedQuery);
  if (startIndex === -1) {
    return [{ text: value, match: false }];
  }
  const endIndex = startIndex + normalizedQuery.length;
  const segments: HighlightPart[] = [];
  if (startIndex > 0) {
    segments.push({ text: value.slice(0, startIndex), match: false });
  }
  segments.push({ text: value.slice(startIndex, endIndex), match: true });
  if (endIndex < value.length) {
    segments.push({ text: value.slice(endIndex), match: false });
  }
  return segments;
};

const computeTextScore = (value: string | undefined | null, tokens: string[], weight: number, isKey?: boolean) => {
  if (!value || !tokens.length) {
    return 0;
  }
  const normalizedValue = normalizeValue(value);
  const includesAllTokens = tokens.every((token) => normalizedValue.includes(token));
  if (!includesAllTokens) {
    return 0;
  }
  const startsWith = normalizedValue.startsWith(tokens[0]);
  const base = startsWith ? 140 : 90;
  return base + weight + (isKey ? 40 : 0);
};

const computeNumericScore = (value: number | undefined | null, numericQuery: string, weight: number) => {
  if (!value && value !== 0) {
    return 0;
  }
  if (!numericQuery) {
    return 0;
  }
  const digitsFromValue = value.toString().replace(/[^0-9]/g, '');
  if (!digitsFromValue.includes(numericQuery)) {
    return 0;
  }
  return 100 + weight;
};

const buildSearchSection = <T,>(
  type: SearchResultCategory,
  items: T[],
  tokens: string[],
  numericQuery: string,
  mapCandidate: (item: T) => SearchCandidate<T>
): SectionResults<T> => {
  if (!tokens.length && !numericQuery) {
    return { items: [], total: 0, hasMore: false };
  }

  const scored = items
    .map((item) => {
      const candidate = mapCandidate(item);
      const textScore = candidate.searchFields.reduce((score, field) => (
        score + computeTextScore(field.value, tokens, field.weight, field.isKey)
      ), 0);
      const numericScore = (candidate.numericFields ?? []).reduce(
        (score, field) => score + computeNumericScore(field.value, numericQuery, field.weight),
        0
      );
      const totalScore = textScore + numericScore;
      if (totalScore <= 0) {
        return null;
      }
      const { searchFields: omitSearchFields, numericFields: omitNumericFields, ...display } = candidate;
      void omitSearchFields;
      void omitNumericFields;
      return {
        ...display,
        type,
        score: totalScore,
      } satisfies SearchDisplayItem<T>;
    })
    .filter((item): item is SearchDisplayItem<T> => Boolean(item))
    .sort((a, b) => b.score - a.score);

  return {
    items: scored.slice(0, SECTION_LIMIT),
    total: scored.length,
    hasMore: scored.length > SECTION_LIMIT,
  };
};

const createEmptySection = <T,>(): SectionResults<T> => ({ items: [], total: 0, hasMore: false });

const buildQueryString = (params: Record<string, string | undefined | null>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

const slugify = (value: string) =>
  normalizeValue(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'detalle';

const formatCurrency = (value?: number, currency?: string) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return `${currency ?? 'S/'} 0.00`;
  }
  return `${currency ?? 'S/'} ${value.toFixed(2)}`;
};

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
    return true;
  }

  return Boolean(target.closest('input, textarea, select, [contenteditable]'));
};

const SearchBar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandPaletteView, setCommandPaletteView] = useState<'main' | 'manage' | 'edit'>('main');
  const [newCommand, setNewCommand] = useState<{
    nombre: string;
    atajo: string;
    categoria: 'acciones' | 'navegacion';
    accion: string;
  }>({ nombre: '', atajo: '', categoria: 'acciones', accion: '' });
  const [showConflictWarning, setShowConflictWarning] = useState('');
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const paletteItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const lastQueryRef = useRef('');
  const lastListSignatureRef = useRef('');
  const productosCatalog = useProductStore((state) => state.allProducts);
  const clienteFilters = useMemo<ClienteFilters>(() => ({ page: 1, limit: 100 }), []);
  const { clientes: persistedClientes, transientClientes } = useClientes(clienteFilters);
  const combinedClientes = useMemo(() => [...transientClientes, ...persistedClientes], [persistedClientes, transientClientes]);
  const clienteById = useMemo(() => {
    const map = new Map<string, Cliente>();
    combinedClientes.forEach((cliente) => {
      if (cliente.id !== undefined && cliente.id !== null) {
        map.set(String(cliente.id), cliente);
      }
    });
    return map;
  }, [combinedClientes]);
  const clienteByDocument = useMemo(() => {
    const map = new Map<string, Cliente>();
    combinedClientes.forEach((cliente) => {
      const documentValue = cliente.numeroDocumento || cliente.document;
      if (documentValue) {
        map.set(normalizeDocumentKey(documentValue), cliente);
      }
    });
    return map;
  }, [combinedClientes]);
  const resolveClienteReference = useCallback(
    (reference?: { id?: string | null; document?: string | null }) => {
      if (!reference) {
        return undefined;
      }
      if (reference.id) {
        const byId = clienteById.get(String(reference.id));
        if (byId) {
          return byId;
        }
      }
      if (reference.document) {
        const normalized = normalizeDocumentKey(reference.document);
        const byDoc = clienteByDocument.get(normalized);
        if (byDoc) {
          return byDoc;
        }
      }
      return undefined;
    },
    [clienteByDocument, clienteById]
  );
  const { state: comprobanteState } = useComprobanteContext();
  const comprobantes = comprobanteState.comprobantes;
  const { cuentas } = useCobranzasContext();
  const queryTokens = useMemo(() => tokenizeQuery(searchQuery), [searchQuery]);
  const numericQuery = useMemo(() => extractNumericQuery(searchQuery.trim()), [searchQuery]);
  const shouldSearch = queryTokens.length > 0 || numericQuery.length > 0;

  // Comandos para el Command Palette
  const baseCommands: SystemCommand[] = useMemo(() => ([
    // ACCIONES PRINCIPALES
    { id: 'nueva-factura', nombre: 'Nueva Factura', icono: FileText, categoria: 'acciones', atajo: 'Ctrl+F' },
    { id: 'nueva-boleta', nombre: 'Nueva Boleta', icono: Receipt, categoria: 'acciones', atajo: 'Ctrl+B' },
    { id: 'buscar-global', nombre: 'Búsqueda Global', icono: Search, categoria: 'acciones', atajo: 'Ctrl+K' },
    { id: 'nuevo-cliente', nombre: 'Nuevo Cliente', icono: UserPlus, categoria: 'acciones', atajo: 'Ctrl+U' },
    { id: 'nuevo-producto', nombre: 'Nuevo Producto', icono: Package, categoria: 'acciones', atajo: 'Ctrl+P' },
    
    // NAVEGACIÓN
    { id: 'ir-comprobantes', nombre: 'Comprobantes Electrónicos', icono: FileText, categoria: 'navegacion', atajo: 'Ctrl+1' },
    { id: 'ir-productos', nombre: 'Gestión de Productos y Servicios', icono: Package, categoria: 'navegacion', atajo: 'Ctrl+2' },
    { id: 'ir-clientes', nombre: 'Gestión de Clientes', icono: Users, categoria: 'navegacion', atajo: 'Ctrl+3' },
    { id: 'ir-caja', nombre: 'Control de Caja', icono: CreditCard, categoria: 'navegacion', atajo: 'Ctrl+4' },
    { id: 'ir-indicadores', nombre: 'Indicadores de Negocio', icono: BarChart3, categoria: 'navegacion', atajo: 'Ctrl+5' },
    { id: 'ir-configuracion', nombre: 'Configuración del Sistema', icono: Settings, categoria: 'navegacion', atajo: 'Ctrl+6' },
    { id: 'ir-precios', nombre: 'Lista de Precios', icono: DollarSign, categoria: 'navegacion', atajo: 'Ctrl+7' },
  ]), []);

  // Atajos predefinidos del sistema y navegador
  const predefinedShortcuts = [
    'Ctrl+A', 'Ctrl+C', 'Ctrl+V', 'Ctrl+X', 'Ctrl+Z', 'Ctrl+Y', 'Ctrl+S', 'Ctrl+O', 'Ctrl+N', 'Ctrl+P', 'Ctrl+R', 'Ctrl+F', 'Ctrl+H',
    'Ctrl+T', 'Ctrl+W', 'Ctrl+Shift+T', 'Ctrl+Tab', 'Ctrl+Shift+Tab', 'F5', 'F11', 'F12', 'Alt+F4', 'Alt+Tab',
    'Ctrl+K', 'Ctrl+B', 'Ctrl+U', 'Ctrl+1', 'Ctrl+2', 'Ctrl+3', 'Ctrl+4', 'Ctrl+5', 'Ctrl+6', 'Ctrl+7'
  ];

  // Actividades disponibles del sistema
  const availableActions = [
    { id: 'exportar-excel', nombre: 'Exportar a Excel', categoria: 'acciones' },
    { id: 'importar-datos', nombre: 'Importar Datos', categoria: 'acciones' },
    { id: 'backup-base', nombre: 'Respaldar Base de Datos', categoria: 'acciones' },
    { id: 'generar-reporte', nombre: 'Generar Reporte', categoria: 'acciones' },
    { id: 'sincronizar-sunat', nombre: 'Sincronizar con SUNAT', categoria: 'acciones' },
    { id: 'cerrar-caja', nombre: 'Cerrar Caja', categoria: 'acciones' },
    { id: 'abrir-caja', nombre: 'Abrir Caja', categoria: 'acciones' },
    { id: 'cambiar-tema', nombre: 'Cambiar Tema', categoria: 'acciones' },
    { id: 'ir-dashboard', nombre: 'Dashboard Principal', categoria: 'navegacion' },
    { id: 'ir-ventas', nombre: 'Módulo de Ventas', categoria: 'navegacion' },
    { id: 'ir-compras', nombre: 'Módulo de Compras', categoria: 'navegacion' },
    { id: 'ir-inventario', nombre: 'Gestión de Inventario', categoria: 'navegacion' },
    { id: 'ir-reportes', nombre: 'Centro de Reportes', categoria: 'navegacion' },
    { id: 'ir-configuracion-avanzada', nombre: 'Configuración Avanzada', categoria: 'navegacion' }
  ];

  // Función para validar si un atajo está en uso
  // Función para obtener el conflicto específico
  const getShortcutConflict = (shortcut: string) => {
    const normalizedShortcut = shortcut.toLowerCase();
    
    // Verificar si es un atajo predefinido del sistema
    if (predefinedShortcuts.some(s => s.toLowerCase() === normalizedShortcut)) {
      if (['ctrl+p'].includes(normalizedShortcut)) return 'Comando del navegador (Imprimir)';
      if (['ctrl+s'].includes(normalizedShortcut)) return 'Comando del navegador (Guardar)';
      if (['ctrl+f'].includes(normalizedShortcut)) return 'Comando del navegador (Buscar)';
      if (['ctrl+r', 'f5'].includes(normalizedShortcut)) return 'Comando del navegador (Actualizar)';
      if (['ctrl+n'].includes(normalizedShortcut)) return 'Comando del navegador (Nueva ventana)';
      if (['ctrl+t'].includes(normalizedShortcut)) return 'Comando del navegador (Nueva pestaña)';
      return 'Comando predefinido del sistema';
    }
    
    // Verificar si está en uso por otro comando
    const existingCommand = allCommands.find(cmd => cmd.atajo.toLowerCase() === normalizedShortcut);
    if (existingCommand) {
      return `Ya usado por: ${existingCommand.nombre}`;
    }
    
    return '';
  };

  // Comandos personalizados desde localStorage
  const [customCommands, setCustomCommands] = useState<CustomCommand[]>([]);
  const [allCommands, setAllCommands] = useState<Command[]>(baseCommands);

  // Cargar comandos personalizados
  useEffect(() => {
    const handleStorageChange = () => {
      const savedCommands = localStorage.getItem('customCommands');
      if (savedCommands) {
        const customCmds: CustomCommand[] = JSON.parse(savedCommands);
        setCustomCommands(customCmds);
        setAllCommands([...baseCommands, ...customCmds]);
      }
    };

    handleStorageChange();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [baseCommands]);

  // Filtrar comandos según búsqueda
  const filteredCommands = allCommands.filter(cmd => 
    cmd.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cmd.atajo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const actionCommands = useMemo(
    () => filteredCommands.filter(cmd => cmd.categoria === 'acciones'),
    [filteredCommands]
  );

  const navigationCommands = useMemo(
    () => filteredCommands.filter(cmd => cmd.categoria === 'navegacion'),
    [filteredCommands]
  );

  const searchResults = useMemo(() => {
    if (!shouldSearch) {
      return {
        comprobantes: createEmptySection<Comprobante>(),
        productos: createEmptySection<Product>(),
        clientes: createEmptySection<Cliente>(),
        cobranzas: createEmptySection<CuentaPorCobrarSummary>(),
      };
    }

    const clientesSection = buildSearchSection('clientes', combinedClientes, queryTokens, numericQuery, (cliente) => ({
      id: String(
        cliente.id ??
        cliente.numeroDocumento ??
        cliente.document ??
        `cliente-${cliente.name ?? cliente.razonSocial ?? cliente.nombreComercial ?? Date.now()}`
      ),
      entity: cliente,
      title: cliente.name || cliente.razonSocial || cliente.nombreCompleto || 'Cliente sin nombre',
      subtitle: cliente.razonSocial && cliente.razonSocial !== cliente.name ? cliente.razonSocial : cliente.nombreComercial,
      meta: cliente.document || cliente.numeroDocumento || cliente.email || cliente.phone,
      searchFields: [
        { value: cliente.name, weight: 120, isKey: true },
        { value: cliente.razonSocial, weight: 120, isKey: true },
        { value: cliente.nombreComercial, weight: 90 },
        { value: cliente.document, weight: 160, isKey: true },
        { value: cliente.numeroDocumento, weight: 160, isKey: true },
        { value: cliente.email, weight: 90 },
        { value: cliente.phone, weight: 80 },
        { value: cliente.address ?? cliente.direccion, weight: 70 },
        { value: cliente.additionalData ?? cliente.observaciones, weight: 50 },
        {
          value: buildHaystackValue(
            cliente.name,
            cliente.razonSocial,
            cliente.nombreCompleto,
            cliente.nombreComercial,
            cliente.document,
            cliente.numeroDocumento,
            cliente.email,
            cliente.phone,
            cliente.address ?? cliente.direccion,
            cliente.additionalData ?? cliente.observaciones
          ),
          weight: 60,
        },
      ],
    }));

    const productosSection = buildSearchSection('productos', productosCatalog, queryTokens, numericQuery, (producto) => ({
      id: producto.id,
      entity: producto,
      title: producto.nombre,
      subtitle: producto.codigo,
      meta: [producto.categoria, producto.marca, producto.modelo].filter(Boolean).join(' • ') || undefined,
      amountLabel: 'Precio',
      amountValue: producto.precio,
      amountCurrency: 'PEN',
      searchFields: [
        { value: producto.nombre, weight: 140, isKey: true },
        { value: producto.codigo, weight: 140, isKey: true },
        { value: producto.alias, weight: 110 },
        { value: producto.descripcion, weight: 90 },
        { value: producto.categoria, weight: 90 },
        { value: producto.marca, weight: 90 },
        { value: producto.modelo, weight: 90 },
        { value: producto.codigoBarras, weight: 100 },
        { value: producto.codigoFabrica, weight: 90 },
        { value: producto.codigoSunat, weight: 90 },
        {
          value: buildHaystackValue(
            producto.nombre,
            producto.codigo,
            producto.alias,
            producto.descripcion,
            producto.categoria,
            producto.marca,
            producto.modelo,
            producto.codigoBarras,
            producto.codigoFabrica,
            producto.codigoSunat
          ),
          weight: 70,
        },
      ],
      numericFields: [{ value: producto.precio, weight: 90 }],
    }));

    const comprobantesSection = buildSearchSection('comprobantes', comprobantes, queryTokens, numericQuery, (comp) => {
      const compWithCliente = comp as Comprobante & { clienteId?: string | null; clientId?: string | null };
      const relatedCliente = resolveClienteReference({
        id: compWithCliente.clienteId ?? compWithCliente.clientId ?? null,
        document: comp.clientDoc,
      });
      const clienteNombre =
        comp.client ||
        relatedCliente?.nombreCompleto ||
        relatedCliente?.razonSocial ||
        relatedCliente?.name ||
        relatedCliente?.nombreComercial;
      const clienteDocumento =
        comp.clientDoc ||
        relatedCliente?.numeroDocumento ||
        relatedCliente?.document ||
        undefined;
      const contacto = relatedCliente?.email || relatedCliente?.phone || comp.email;
      const serieNumero = comp.id;
      const haystack = buildHaystackValue(
        serieNumero,
        comp.type,
        clienteNombre,
        clienteDocumento,
        comp.vendor,
        contacto,
        comp.status,
        comp.paymentMethod,
        comp.address,
        comp.observations,
        comp.purchaseOrder,
        comp.waybill
      );
      const metaPrimary = [clienteDocumento, comp.status, comp.currency].filter(Boolean).join(' • ');

      return {
        id: serieNumero,
        entity: comp,
        title: comp.type ? `${comp.type} · ${serieNumero}` : serieNumero,
        subtitle: clienteNombre,
        meta: metaPrimary || comp.vendor || contacto,
        amountLabel: 'Total',
        amountValue: comp.total,
        amountCurrency: comp.currency,
        searchFields: [
          { value: serieNumero, weight: 180, isKey: true },
          { value: comp.type, weight: 160, isKey: true },
          { value: clienteNombre, weight: 150, isKey: true },
          { value: clienteDocumento, weight: 150, isKey: true },
          { value: relatedCliente?.nombreComercial, weight: 110 },
          { value: comp.vendor, weight: 90 },
          { value: contacto, weight: 85 },
          { value: comp.status, weight: 80 },
          { value: comp.paymentMethod, weight: 70 },
          { value: comp.address, weight: 60 },
          { value: comp.observations, weight: 50 },
          { value: comp.purchaseOrder, weight: 60 },
          { value: comp.waybill, weight: 60 },
          { value: comp.email, weight: 70 },
          { value: haystack, weight: 65 },
        ],
        numericFields: [{ value: comp.total, weight: 100 }],
      } satisfies SearchCandidate<Comprobante>;
    });

    const cobranzasSection = buildSearchSection('cobranzas', cuentas, queryTokens, numericQuery, (cuenta) => {
      const serieNumero = cuenta.comprobanteSerie && cuenta.comprobanteNumero
        ? `${cuenta.comprobanteSerie}-${cuenta.comprobanteNumero}`
        : cuenta.comprobanteNumero || cuenta.comprobanteId;
      const metaPrimary = [cuenta.clienteDocumento, cuenta.estado?.toUpperCase()].filter(Boolean).join(' • ');
      const relatedCliente = resolveClienteReference({ document: cuenta.clienteDocumento });
      const metrics: string[] = [];
      if (typeof cuenta.total === 'number') {
        metrics.push(`Total ${formatCurrency(cuenta.total, cuenta.moneda)}`);
      }
      if (typeof cuenta.cobrado === 'number') {
        metrics.push(`Cobrado ${formatCurrency(cuenta.cobrado, cuenta.moneda)}`);
      }
      const contactoCliente = relatedCliente?.email || relatedCliente?.phone;
      const haystack = buildHaystackValue(
        cuenta.clienteNombre,
        cuenta.clienteDocumento,
        serieNumero,
        cuenta.tipoComprobante,
        cuenta.estado,
        cuenta.formaPago,
        cuenta.moneda,
        cuenta.sucursal,
        cuenta.cajero,
        contactoCliente
      );

      return {
        id: cuenta.id,
        entity: cuenta,
        title: serieNumero || `Cuenta ${cuenta.id}`,
        subtitle: cuenta.clienteNombre,
        meta: [metaPrimary, metrics.join(' · '), contactoCliente].filter(Boolean).join(' · ') || undefined,
        amountLabel: 'Saldo',
        amountValue: cuenta.saldo,
        amountCurrency: cuenta.moneda,
        searchFields: [
          { value: cuenta.clienteNombre, weight: 170, isKey: true },
          { value: cuenta.clienteDocumento, weight: 160, isKey: true },
          { value: serieNumero, weight: 140, isKey: true },
          { value: cuenta.tipoComprobante, weight: 90 },
          { value: cuenta.estado, weight: 110, isKey: true },
          { value: cuenta.sucursal, weight: 70 },
          { value: cuenta.cajero, weight: 60 },
          { value: cuenta.formaPago, weight: 80 },
          { value: cuenta.moneda, weight: 70 },
          { value: cuenta.fechaEmision, weight: 60 },
          { value: cuenta.fechaVencimiento, weight: 60 },
          { value: contactoCliente, weight: 75 },
          { value: haystack, weight: 65 },
        ],
        numericFields: [
          { value: cuenta.total, weight: 100 },
          { value: cuenta.cobrado, weight: 90 },
          { value: cuenta.saldo, weight: 150 },
        ],
      } satisfies SearchCandidate<CuentaPorCobrarSummary>;
    });

    return {
      comprobantes: comprobantesSection,
      productos: productosSection,
      clientes: clientesSection,
      cobranzas: cobranzasSection,
    };
  }, [shouldSearch, combinedClientes, cuentas, queryTokens, numericQuery, productosCatalog, comprobantes, resolveClienteReference]);

  const totalResultsCount =
    searchResults.comprobantes.total +
    searchResults.productos.total +
    searchResults.clientes.total +
    searchResults.cobranzas.total;

  const hasResults = totalResultsCount > 0;

  const paletteSearchResults = useMemo(
    () => searchResults.comprobantes.items.slice(0, COMMAND_PALETTE_RESULT_LIMIT),
    [searchResults]
  );

  const renderHighlight = useCallback((value?: string) => {
    if (!value) {
      return null;
    }
    const segments = highlightParts(value, searchQuery);
    if (!segments.length) {
      return value;
    }
    return segments.map((segment, index) =>
      segment.match ? (
        <mark
          key={`${value}-${index}`}
          className="rounded-sm bg-amber-200/80 px-0.5 text-inherit dark:bg-amber-400/30"
        >
          {segment.text}
        </mark>
      ) : (
        <span key={`${value}-${index}`}>{segment.text}</span>
      )
    );
  }, [searchQuery]);

  const handleSeeAll = useCallback((type: SearchResultCategory) => {
    const baseRoute = SECTION_ROUTE_MAP[type];
    if (!baseRoute) {
      return;
    }
    const queryValue = searchQuery.trim();
    if (!queryValue) {
      return;
    }
    const queryString = buildQueryString({ search: queryValue });
    navigate(`${baseRoute}${queryString}`);
    setShowSearchResults(false);
  }, [navigate, searchQuery]);


  // Atajo de teclado Ctrl+K y otros atajos del sistema
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isEditable = isEditableTarget(e.target) || isEditableTarget(document.activeElement);
      const wantsPaletteToggle = (e.ctrlKey || e.metaKey) && e.key === 'k';

      // Escapar para cerrar
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (showCommandPalette) {
          if (commandPaletteView === 'manage') {
            setCommandPaletteView('main');
          } else {
            setShowCommandPalette(false);
            setCommandPaletteView('main');
          }
        }
        if (showSearchResults) {
          setShowSearchResults(false);
        }
        return;
      }

      // Ctrl+K para abrir/ cerrar command palette (permitir cierre cuando ya está abierto)
      const allowPaletteToggle = !isEditable || showCommandPalette;
      if (wantsPaletteToggle && allowPaletteToggle) {
        e.preventDefault();
        e.stopPropagation();
        setShowCommandPalette(prev => !prev);
        setShowSearchResults(false);
        setCommandPaletteView('main');
        return;
      }

      if (isEditable) {
        return;
      }

      if (showCommandPalette) {
        return;
      }

      // Atajos de navegación - IMPORTANTE: preventDefault para evitar conflictos con Chrome
      if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
          case '1':
            e.preventDefault();
            e.stopPropagation();
            navigate('/comprobantes');
            break;
          case '2':
            e.preventDefault();
            e.stopPropagation();
            navigate('/catalogo');
            break;
          case '3':
            e.preventDefault();
            e.stopPropagation();
            navigate('/clientes');
            break;
          case '4':
            e.preventDefault();
            e.stopPropagation();
            navigate('/control-caja');
            break;
          case '5':
            e.preventDefault();
            e.stopPropagation();
            navigate('/indicadores');
            break;
          case '6':
            e.preventDefault();
            e.stopPropagation();
            navigate('/configuracion');
            break;
          case '7':
            e.preventDefault();
            e.stopPropagation();
            navigate('/lista-precios');
            break;
          case 'b':
            e.preventDefault();
            e.stopPropagation();
            navigate('/comprobantes/emision');
            break;
          case 'u':
            e.preventDefault();
            e.stopPropagation();
            navigate('/clientes');
            break;
        }
      }
    };
    
    // Usar capture: true para interceptar eventos antes que otros handlers
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [navigate, showCommandPalette, showSearchResults, commandPaletteView]);

  // Controlar overflow del body cuando el command palette está abierto
  useEffect(() => {
    if (showCommandPalette) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showCommandPalette]);

  useEffect(() => {
    if (!showSearchResults || showCommandPalette) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!searchContainerRef.current) {
        return;
      }

      const targetNode = event.target;
      if (!(targetNode instanceof Node)) {
        return;
      }

      if (!searchContainerRef.current.contains(targetNode)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [showSearchResults, showCommandPalette]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSearchResults(false);
      setSearchQuery('');
    }
  };

  const handleSelectResult = useCallback(
    (type: SearchResultCategory, item: Cliente | Product | Comprobante | CuentaPorCobrarSummary) => {
      const queryValue = searchQuery.trim();

      const closeSearch = () => {
        setShowSearchResults(false);
        setSearchQuery('');
      };

      switch (type) {
        case 'clientes': {
          const cliente = item as Cliente;
          if (cliente.id) {
            const label = cliente.nombreCompleto || cliente.name || cliente.razonSocial || 'cliente';
            const slug = slugify(label);
            navigate(`/clientes/${cliente.id}/${slug}`);
          } else {
            const searchParam = queryValue || cliente.document || cliente.numeroDocumento || cliente.name;
            navigate(`/clientes${buildQueryString({ search: searchParam })}`);
          }
          break;
        }
        case 'productos': {
          const producto = item as Product;
          const searchParam = queryValue || producto.codigo || producto.nombre;
          navigate(`/catalogo${buildQueryString({ search: searchParam })}`);
          break;
        }
        case 'comprobantes': {
          const comprobante = item as Comprobante;
          const searchParam =
            queryValue ||
            comprobante.id ||
            comprobante.client ||
            comprobante.clientDoc ||
            comprobante.type;
          navigate(`/comprobantes${buildQueryString({ search: searchParam })}`);
          break;
        }
        case 'cobranzas': {
          const cobranza = item as CuentaPorCobrarSummary;
          const serieNumero = cobranza.comprobanteSerie && cobranza.comprobanteNumero
            ? `${cobranza.comprobanteSerie}-${cobranza.comprobanteNumero}`
            : cobranza.comprobanteNumero || cobranza.comprobanteId;
          const searchParam = queryValue || cobranza.clienteDocumento || cobranza.clienteNombre || serieNumero;
          navigate(`/cobranzas${buildQueryString({ search: searchParam, cuentaId: cobranza.id })}`);
          break;
        }
        default:
          break;
      }

      closeSearch();
    },
    [navigate, searchQuery]
  );

  const handleExecuteCommand = useCallback((commandId: string) => {
    setShowCommandPalette(false);
    
    switch (commandId) {
      case 'nueva-factura':
        navigate('/comprobantes/emision');
        break;
      case 'nueva-boleta':
        navigate('/comprobantes/emision');
        break;
      case 'buscar-global':
        setShowCommandPalette(true);
        break;
      case 'nuevo-cliente':
        navigate('/clientes');
        break;
      case 'nuevo-producto':
        navigate('/catalogo');
        break;
      case 'ir-comprobantes':
        navigate('/comprobantes');
        break;
      case 'ir-productos':
        navigate('/catalogo');
        break;
      case 'ir-clientes':
        navigate('/clientes');
        break;
      case 'ir-caja':
        navigate('/control-caja');
        break;
      case 'ir-indicadores':
        navigate('/indicadores');
        break;
      case 'ir-configuracion':
        navigate('/configuracion');
        break;
      case 'ir-precios':
        navigate('/lista-precios');
        break;
      
      default:
        console.log('Comando no reconocido:', commandId);
    }
  }, [navigate]);

  const closePaletteAndReset = useCallback(() => {
    setShowCommandPalette(false);
    setCommandPaletteView('main');
  }, []);

  const handlePaletteResultSelect = useCallback((type: SearchResultCategory, item: Cliente | Product | Comprobante | CuentaPorCobrarSummary) => {
    handleSelectResult(type, item);
    closePaletteAndReset();
  }, [closePaletteAndReset, handleSelectResult]);

  const paletteItems = useMemo(() => {
    const items: PaletteItem[] = [];

    actionCommands.forEach((cmd) => {
      items.push({
        key: `command-${cmd.id}`,
        onExecute: () => handleExecuteCommand(cmd.id)
      });
    });

    navigationCommands.forEach((cmd) => {
      items.push({
        key: `command-${cmd.id}`,
        onExecute: () => handleExecuteCommand(cmd.id)
      });
    });

    if (searchQuery.length > 0 && hasResults) {
      paletteSearchResults.forEach((comp) => {
        items.push({
          key: `search-comprobantes-${comp.id}`,
          onExecute: () => handlePaletteResultSelect(comp.type, comp.entity)
        });
      });
    }

    return items;
  }, [actionCommands, navigationCommands, searchQuery, hasResults, paletteSearchResults, handleExecuteCommand, handlePaletteResultSelect]);

  const paletteIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    paletteItems.forEach((item, index) => {
      map.set(item.key, index);
    });
    return map;
  }, [paletteItems]);

  useEffect(() => {
    if (!showCommandPalette) {
      setActiveIndex(-1);
      lastQueryRef.current = '';
      lastListSignatureRef.current = '';
      return;
    }

    const signature = paletteItems.map(item => item.key).join('|');
    const queryChanged = lastQueryRef.current !== searchQuery;
    const listChanged = lastListSignatureRef.current !== signature;

    lastQueryRef.current = searchQuery;
    lastListSignatureRef.current = signature;

    if (paletteItems.length === 0) {
      setActiveIndex(-1);
      return;
    }

    if (queryChanged || listChanged) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex(prev => {
      if (prev < 0) return 0;
      if (prev >= paletteItems.length) return paletteItems.length - 1;
      return prev;
    });
  }, [paletteItems, searchQuery, showCommandPalette]);

  useEffect(() => {
    if (!showCommandPalette || activeIndex < 0) {
      return;
    }
    const activeItem = paletteItems[activeIndex];
    if (!activeItem) {
      return;
    }
    const node = paletteItemRefs.current[activeItem.key];
    node?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, paletteItems, showCommandPalette]);

  const handleCommandPaletteKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showCommandPalette || paletteItems.length === 0) {
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => {
        if (paletteItems.length === 0) {
          return -1;
        }
        if (prev === -1 || prev === paletteItems.length - 1) {
          return 0;
        }
        return prev + 1;
      });
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => {
        if (paletteItems.length === 0) {
          return -1;
        }
        if (prev <= 0) {
          return paletteItems.length - 1;
        }
        return prev - 1;
      });
      return;
    }

    if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < paletteItems.length) {
      e.preventDefault();
      paletteItems[activeIndex].onExecute();
    }
  }, [activeIndex, paletteItems, showCommandPalette]);

  return (
    <>
      {/* BUSCADOR */}
      <div
        ref={searchContainerRef}
        className="relative"
        style={{ zIndex: showCommandPalette ? 1 : 'auto' }}
      >
        <div className="relative w-full max-w-[450px]">
          <Search 
            size={16} 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" 
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(e.target.value.length > 0);
            }}
            onFocus={() => searchQuery && setShowSearchResults(true)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Buscar clientes, productos o comprobantes…"
            className="w-full pl-9 pr-16 py-2 rounded-lg border border-gray-200 dark:border-gray-600
                     focus:border-gray-300 dark:focus:border-gray-500 focus:outline-none
                     bg-white dark:bg-gray-800 text-sm transition-colors text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
          <button
            onClick={() => {
              setShowCommandPalette(true);
              setShowSearchResults(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 
                     px-1.5 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <kbd className="text-[10px] font-medium text-gray-400 dark:text-gray-500">Ctrl+K</kbd>
          </button>
        </div>

        {/* DROPDOWN DE RESULTADOS - Solo mostrar si NO está abierto el command palette */}
        {showSearchResults && hasResults && !showCommandPalette && (
          <div className="absolute top-full left-0 mt-2 w-[520px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-[440px] overflow-y-auto">
            {searchResults.comprobantes.items.length > 0 && (
              <div className="p-2">
                <div className="flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase">
                  <span>Comprobantes</span>
                  {searchResults.comprobantes.hasMore && SECTION_ROUTE_MAP.comprobantes && (
                    <button
                      type="button"
                      className="text-[10px] font-medium text-blue-600 hover:text-blue-500 dark:text-blue-300"
                      onClick={() => handleSeeAll('comprobantes')}
                    >
                      Ver todos
                    </button>
                  )}
                </div>
                {searchResults.comprobantes.items.map((result) => {
                  const amountText = typeof result.amountValue === 'number'
                    ? formatCurrency(result.amountValue, result.amountCurrency)
                    : undefined;
                  return (
                    <button
                      key={result.id}
                      className="w-full text-left px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleSelectResult(result.type, result.entity)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {renderHighlight(result.title) ?? result.title}
                          </div>
                          {result.subtitle && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {renderHighlight(result.subtitle) ?? result.subtitle}
                            </div>
                          )}
                          {result.meta && (
                            <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                              {renderHighlight(result.meta) ?? result.meta}
                            </div>
                          )}
                        </div>
                        {amountText && (
                          <div className="text-right whitespace-nowrap">
                            {result.amountLabel && (
                              <div className="text-[10px] uppercase text-gray-400 dark:text-gray-500 tracking-wide">
                                {result.amountLabel}
                              </div>
                            )}
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {renderHighlight(amountText) ?? amountText}
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {searchResults.productos.items.length > 0 && (
              <div className="p-2 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase">
                  <span>Productos</span>
                  {searchResults.productos.hasMore && SECTION_ROUTE_MAP.productos && (
                    <button
                      type="button"
                      className="text-[10px] font-medium text-blue-600 hover:text-blue-500 dark:text-blue-300"
                      onClick={() => handleSeeAll('productos')}
                    >
                      Ver todos
                    </button>
                  )}
                </div>
                {searchResults.productos.items.map((result) => {
                  const amountText = typeof result.amountValue === 'number'
                    ? formatCurrency(result.amountValue, result.amountCurrency)
                    : undefined;
                  return (
                    <button
                      key={result.id}
                      className="w-full text-left px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleSelectResult(result.type, result.entity)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {renderHighlight(result.title) ?? result.title}
                          </div>
                          {result.subtitle && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {renderHighlight(result.subtitle) ?? result.subtitle}
                            </div>
                          )}
                          {result.meta && (
                            <div className="text-[11px] text-gray-400 dark:text-gray-500">
                              {renderHighlight(result.meta) ?? result.meta}
                            </div>
                          )}
                        </div>
                        {amountText && (
                          <div className="text-right whitespace-nowrap">
                            {result.amountLabel && (
                              <div className="text-[10px] uppercase text-gray-400 dark:text-gray-500 tracking-wide">
                                {result.amountLabel}
                              </div>
                            )}
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {renderHighlight(amountText) ?? amountText}
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {searchResults.clientes.items.length > 0 && (
              <div className="p-2 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase">
                  <span>Clientes</span>
                  {searchResults.clientes.hasMore && SECTION_ROUTE_MAP.clientes && (
                    <button
                      type="button"
                      className="text-[10px] font-medium text-blue-600 hover:text-blue-500 dark:text-blue-300"
                      onClick={() => handleSeeAll('clientes')}
                    >
                      Ver todos
                    </button>
                  )}
                </div>
                {searchResults.clientes.items.map((result) => (
                  <button
                    key={result.id}
                    className="w-full text-left px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => handleSelectResult(result.type, result.entity)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {renderHighlight(result.title) ?? result.title}
                        </div>
                        {result.subtitle && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {renderHighlight(result.subtitle) ?? result.subtitle}
                          </div>
                        )}
                        {result.meta && (
                          <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                            {renderHighlight(result.meta) ?? result.meta}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchResults.cobranzas.items.length > 0 && (
              <div className="p-2 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase">
                  <span>Cobranzas</span>
                  {searchResults.cobranzas.hasMore && SECTION_ROUTE_MAP.cobranzas && (
                    <button
                      type="button"
                      className="text-[10px] font-medium text-blue-600 hover:text-blue-500 dark:text-blue-300"
                      onClick={() => handleSeeAll('cobranzas')}
                    >
                      Ver todos
                    </button>
                  )}
                </div>
                {searchResults.cobranzas.items.map((result) => {
                  const amountText = typeof result.amountValue === 'number'
                    ? formatCurrency(result.amountValue, result.amountCurrency)
                    : undefined;
                  return (
                    <button
                      key={result.id}
                      className="w-full text-left px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleSelectResult(result.type, result.entity)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {renderHighlight(result.title) ?? result.title}
                          </div>
                          {result.subtitle && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {renderHighlight(result.subtitle) ?? result.subtitle}
                            </div>
                          )}
                          {result.meta && (
                            <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                              {renderHighlight(result.meta) ?? result.meta}
                            </div>
                          )}
                        </div>
                        {amountText && (
                          <div className="text-right whitespace-nowrap">
                            {result.amountLabel && (
                              <div className="text-[10px] uppercase text-gray-400 dark:text-gray-500 tracking-wide">
                                {result.amountLabel}
                              </div>
                            )}
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {renderHighlight(amountText) ?? amountText}
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Sin resultados - Solo mostrar si NO está abierto el command palette */}
        {showSearchResults && !hasResults && shouldSearch && !showCommandPalette && (
          <div className="absolute top-full left-0 mt-2 w-[520px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 p-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">No se encontraron resultados</p>
          </div>
        )}

        {showSearchResults && !shouldSearch && searchQuery.length > 0 && !showCommandPalette && (
          <div className="absolute top-full left-0 mt-2 w-[520px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 p-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Ingresa un término de búsqueda válido</p>
          </div>
        )}
      </div>

      {/* COMMAND PALETTE - Modal centrado usando Portal */}
      {showCommandPalette && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" 
          style={{ zIndex: 9999 }}
          onClick={() => {
            setShowCommandPalette(false);
            setCommandPaletteView('main');
          }}
        >
          <div className="w-full max-w-2xl max-h-[90vh] sm:max-h-[80vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-600 overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            
            {/* VISTA PRINCIPAL - COMMAND PALETTE */}
            {commandPaletteView === 'main' && (
              <>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Comando Rápido
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCommandPaletteView('manage');
                        setSearchQuery('');
                      }}
                      className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Settings size={12} />
                      Administrar comandos
                    </button>
                  </div>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleCommandPaletteKeyDown}
                      placeholder="Buscar o ejecutar comando..."
                      autoFocus
                      className="w-full pl-9 pr-4 py-3 bg-transparent text-sm focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-lg"
                    />
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {/* Comandos disponibles */}
                  {actionCommands.length > 0 && (
                    <div className="p-3">
                      <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase px-2 py-1.5">
                        Acciones
                      </div>
                      {actionCommands.map((cmd) => {
                        const IconComponent = cmd.icono || Search; // Fallback icon
                        const itemKey = `command-${cmd.id}`;
                        const itemIndex = paletteIndexMap.get(itemKey) ?? -1;
                        const isActive = itemIndex === activeIndex;
                        const itemClasses = `w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                          isActive ? 'bg-gray-100 dark:bg-gray-700 ring-1 ring-blue-500/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`;
                        return (
                          <button
                            key={cmd.id}
                            ref={(el) => {
                              paletteItemRefs.current[itemKey] = el;
                            }}
                            data-key={itemKey}
                            className={itemClasses}
                            onClick={() => handleExecuteCommand(cmd.id)}
                          >
                            <div className="flex items-center gap-3">
                              <IconComponent size={16} className="text-gray-400 dark:text-gray-500" />
                              <span className="text-sm text-gray-900 dark:text-gray-100">{cmd.nombre}</span>
                            </div>
                            {cmd.atajo && (
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{cmd.atajo}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Navegación */}
                  {navigationCommands.length > 0 && (
                    <div className="p-3 border-t border-gray-100 dark:border-gray-700">
                      <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase px-2 py-1.5">
                        Ir a
                      </div>
                      {navigationCommands.map((cmd) => {
                        const IconComponent = cmd.icono || Search; // Fallback icon
                        const itemKey = `command-${cmd.id}`;
                        const itemIndex = paletteIndexMap.get(itemKey) ?? -1;
                        const isActive = itemIndex === activeIndex;
                        const itemClasses = `w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                          isActive ? 'bg-gray-100 dark:bg-gray-700 ring-1 ring-blue-500/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`;
                        return (
                          <button
                            key={cmd.id}
                            ref={(el) => {
                              paletteItemRefs.current[itemKey] = el;
                            }}
                            data-key={itemKey}
                            className={itemClasses}
                            onClick={() => handleExecuteCommand(cmd.id)}
                          >
                            <div className="flex items-center gap-3">
                              <IconComponent size={16} className="text-gray-400 dark:text-gray-500" />
                              <span className="text-sm text-gray-900 dark:text-gray-100">{cmd.nombre}</span>
                            </div>
                            {cmd.atajo && (
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{cmd.atajo}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Resultados de búsqueda en Command Palette */}
                  {searchQuery.length > 0 && hasResults && searchResults.comprobantes.items.length > 0 && (
                    <div className="p-3 border-t border-gray-100 dark:border-gray-700">
                      <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase px-2 py-1.5">
                        Comprobantes
                      </div>
                      {paletteSearchResults.map((result) => {
                        const itemKey = `search-comprobantes-${result.id}`;
                        const itemIndex = paletteIndexMap.get(itemKey) ?? -1;
                        const isActive = itemIndex === activeIndex;
                        const amountText = typeof result.amountValue === 'number'
                          ? formatCurrency(result.amountValue, result.amountCurrency)
                          : undefined;
                        const itemClasses = `w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                          isActive ? 'bg-gray-100 dark:bg-gray-700 ring-1 ring-blue-500/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`;
                        return (
                          <button
                            key={result.id}
                            ref={(el) => {
                              paletteItemRefs.current[itemKey] = el;
                            }}
                            data-key={itemKey}
                            className={itemClasses}
                            onClick={() => handlePaletteResultSelect(result.type, result.entity)}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {renderHighlight(result.title) ?? result.title}
                              </div>
                              {result.subtitle && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {renderHighlight(result.subtitle) ?? result.subtitle}
                                </div>
                              )}
                              {result.meta && (
                                <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                                  {renderHighlight(result.meta) ?? result.meta}
                                </div>
                              )}
                            </div>
                            {amountText && (
                              <div className="text-right whitespace-nowrap ml-4">
                                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                  {renderHighlight(amountText) ?? amountText}
                                </div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center text-[10px] text-gray-400 dark:text-gray-500">
                  <div className="flex items-center gap-3">
                    <span>↑↓ Navegar</span>
                    <span>↵ Seleccionar</span>
                    <span>Esc Cerrar</span>
                  </div>
                </div>
              </>
            )}

            {/* VISTA DE ADMINISTRACIÓN DE COMANDOS */}
            {commandPaletteView === 'manage' && (
              <>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setCommandPaletteView('main');
                      }}
                      className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <ArrowLeft size={16} className="text-gray-600 dark:text-gray-400" />
                    </button>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Administrar Comandos</h2>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto p-4">
                  {/* Comandos personalizados */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Comandos Personalizados</h3>
                      <button
                        onClick={() => {
                          setNewCommand({ nombre: '', atajo: '', categoria: 'acciones', accion: '' });
                          setShowConflictWarning('');
                          setCommandPaletteView('edit');
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      >
                        <Plus size={12} />
                        Nuevo comando
                      </button>
                    </div>
                    
                    {customCommands.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <p className="text-sm">No hay comandos personalizados</p>
                        <p className="text-xs mt-1">Crea uno para empezar</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {customCommands.map((cmd) => (
                          <div key={cmd.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{cmd.nombre}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{cmd.atajo}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  const updatedCommands = customCommands.filter(c => c.id !== cmd.id);
                                  setCustomCommands(updatedCommands);
                                  localStorage.setItem('customCommands', JSON.stringify(updatedCommands));
                                  setAllCommands([...baseCommands, ...updatedCommands]);
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Comandos del sistema (solo lectura) */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Comandos del Sistema</h3>
                    <div className="space-y-2">
                      {baseCommands.map((cmd) => {
                        const IconComponent = cmd.icono;
                        return (
                          <div key={cmd.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg opacity-75">
                            <div className="flex items-center gap-3">
                              <IconComponent size={16} className="text-gray-400 dark:text-gray-500" />
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{cmd.nombre}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{cmd.atajo}</div>
                              </div>
                            </div>
                            <span className="text-xs text-gray-400 dark:text-gray-500">Sistema</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500">
                  <div className="flex items-center gap-3">
                    <span>Los comandos personalizados se guardan localmente</span>
                  </div>
                  <button
                    onClick={() => {
                      setCommandPaletteView('main');
                    }}
                    className="text-[10px] text-gray-400 dark:text-gray-500 hover:text-blue-400 dark:hover:text-blue-400 transition-colors px-2 py-1 rounded"
                  >
                    Volver
                  </button>
                </div>
              </>
            )}

            {/* VISTA DE EDICIÓN/CREACIÓN DE COMANDOS */}
            {commandPaletteView === 'edit' && (
              <>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setCommandPaletteView('manage');
                        setNewCommand({ nombre: '', atajo: '', categoria: 'acciones', accion: '' });
                        setShowConflictWarning('');
                      }}
                      className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <ArrowLeft size={16} className="text-gray-600 dark:text-gray-400" />
                    </button>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Nuevo Comando</h2>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Advertencia sobre comandos predeterminados */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">ℹ️ Comandos Predeterminados</h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                      Ten en cuenta que algunos atajos ya están en uso por el sistema o navegador:
                    </p>
                    <div className="text-xs text-blue-600 dark:text-blue-400 grid grid-cols-3 gap-1">
                      <span>Ctrl+P (Imprimir)</span>
                      <span>Ctrl+S (Guardar)</span>
                      <span>Ctrl+F (Buscar)</span>
                      <span>Ctrl+R (Actualizar)</span>
                      <span>Ctrl+N (Nueva ventana)</span>
                      <span>Ctrl+T (Nueva pestaña)</span>
                    </div>
                  </div>

                  {/* Formulario */}
                  <div className="space-y-4">
                    {/* Nombre del comando */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nombre del comando
                      </label>
                      <input
                        type="text"
                        value={newCommand.nombre}
                        onChange={(e) => setNewCommand(prev => ({ ...prev, nombre: e.target.value }))}
                        placeholder="Ej: Exportar productos"
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Atajo de teclado */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Atajo de teclado
                      </label>
                      <input
                        type="text"
                        value={newCommand.atajo}
                        onChange={(e) => {
                          const atajo = e.target.value;
                          setNewCommand(prev => ({ ...prev, atajo }));
                          
                          // Verificar conflictos en tiempo real
                          if (atajo) {
                            const conflict = getShortcutConflict(atajo);
                            setShowConflictWarning(conflict);
                          } else {
                            setShowConflictWarning('');
                          }
                        }}
                        placeholder="Ej: Ctrl+E, Alt+X, F9"
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {showConflictWarning && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                          ⚠️ {showConflictWarning}
                        </p>
                      )}
                    </div>

                    {/* Acción */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Acción del sistema
                      </label>
                      <select
                        value={newCommand.accion}
                        onChange={(e) => setNewCommand(prev => ({ ...prev, accion: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecciona una acción...</option>
                        <optgroup label="Acciones del Sistema">
                          {availableActions.filter(action => action.categoria === 'acciones').map(action => (
                            <option key={action.id} value={action.id}>{action.nombre}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Navegación">
                          {availableActions.filter(action => action.categoria === 'navegacion').map(action => (
                            <option key={action.id} value={action.id}>{action.nombre}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    {/* Categoría */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Categoría
                      </label>
                      <select
                        value={newCommand.categoria}
                        onChange={(e) => setNewCommand(prev => ({ ...prev, categoria: e.target.value as 'acciones' | 'navegacion' }))}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="acciones">Acciones</option>
                        <option value="navegacion">Navegación</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0 p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center gap-3 sm:justify-between">
                  <button
                    onClick={() => {
                      setCommandPaletteView('manage');
                      setNewCommand({ nombre: '', atajo: '', categoria: 'acciones', accion: '' });
                      setShowConflictWarning('');
                    }}
                    className="w-full sm:w-auto px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      // Validaciones
                      if (!newCommand.nombre.trim()) {
                        alert('Por favor ingresa un nombre para el comando');
                        return;
                      }
                      if (!newCommand.atajo.trim()) {
                        alert('Por favor ingresa un atajo de teclado');
                        return;
                      }
                      if (!newCommand.accion) {
                        alert('Por favor selecciona una acción del sistema');
                        return;
                      }
                      if (showConflictWarning) {
                        alert('El atajo seleccionado está en conflicto. Por favor elige otro.');
                        return;
                      }

                      // Crear nuevo comando
                      const comando: CustomCommand = {
                        id: Date.now().toString(),
                        nombre: newCommand.nombre.trim(),
                        atajo: newCommand.atajo.trim(),
                        categoria: newCommand.categoria
                      };

                      const updatedCommands = [...customCommands, comando];
                      setCustomCommands(updatedCommands);
                      localStorage.setItem('customCommands', JSON.stringify(updatedCommands));
                      setAllCommands([...baseCommands, ...updatedCommands]);
                      
                      // Limpiar y volver
                      setNewCommand({ nombre: '', atajo: '', categoria: 'acciones', accion: '' });
                      setShowConflictWarning('');
                      setCommandPaletteView('manage');
                    }}
                    disabled={!newCommand.nombre.trim() || !newCommand.atajo.trim() || !newCommand.accion || !!showConflictWarning}
                    className="w-full sm:w-auto px-6 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    Crear Comando
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default SearchBar;