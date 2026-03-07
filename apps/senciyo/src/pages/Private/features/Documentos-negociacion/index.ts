/**
 * Módulo de Documentos de Negociación
 * Exportaciones principales del módulo
 */

// Componente principal
export { default as DocumentosTabs } from './pages/DocumentosTabs';

// Formularios
export { default as FormularioCotizacion } from './pages/FormularioCotizacion';
export { default as FormularioNotaVenta } from './pages/FormularioNotaVenta';

// Componentes de lista
export { default as ListaCotizaciones } from './lista-cotizaciones/pages/ListaCotizaciones';
export { default as ListaNotasVenta } from './lista-notas-venta/pages/ListaNotasVenta';

// Contexto
export { DocumentoProvider, useDocumentoContext } from './contexts/DocumentosContext';

// Tipos y modelos
export type { Documento, TipoDocumento, EstadoDocumento, DocumentoFilters } from './models/documento.types';
export { ESTADOS_COTIZACION, ESTADOS_NOTA_VENTA } from './models/documento.types';
export { TABLE_CONFIG, PAGINATION_CONFIG, MOCK_VENDORS, MOCK_PAYMENT_METHODS } from './models/constants';

// Utilidades
export * from './utils/dateUtils';
