// Catálogos tributarios SUNAT — tipos e interfaces base
//
// Uso en XML UBL 2.1:
//   Cat.51 → cbc:InvoiceTypeCode[listID]
//   Cat.54 → cac:PaymentTerms/cbc:PaymentMeansID  (solo con detracción)
//   Cat.52 → cbc:Note[languageLocaleID]
//   Cat.59 → cac:PaymentMeans/cbc:PaymentMeansCode  (fuente: shared/payments/paymentMeans.ts)
//   Cat.05 → tributos en cac:TaxTotal  (fuente: configuracion-sistema/modelos/Tax.ts)
//   Cat.16 → cbc:PriceTypeCode en líneas de ítem
//
// Los códigos son strings y se usan directamente en el XML, no las descripciones.
// Cat.59 y Cat.05 se reutilizan desde sus fuentes existentes; no se duplican aquí.

export type TipoCatalogo = '51' | '54' | '52' | '53' | '16';

export const ETIQUETAS_CATALOGO: Record<TipoCatalogo, string> = {
  '51': 'Tipos de operación',
  '54': 'Códigos de detracción',
  '52': 'Leyendas del comprobante',
  '53': 'Cargos y descuentos',   // interno — para XML/representación, no visible al usuario
  '16': 'Tipos de precio',       // interno — para XML/representación, no visible al usuario
};

/** Catálogos visibles en la UI de Configuración tributaria. */
export const ORDEN_CATALOGOS: TipoCatalogo[] = ['51', '54', '52'];

// ─────────────────────────────────────────────────
// Base común para todos los ítems de catálogo
// ─────────────────────────────────────────────────

export interface CatalogoTributarioBase {
  codigo: string;
  descripcion: string;
  visible: boolean;
  activo: boolean;
}

// ─────────────────────────────────────────────────
// Catálogo 51 — Tipos de operación
// ─────────────────────────────────────────────────

export interface TipoOperacionTributaria extends CatalogoTributarioBase {
  catalogo: '51';
  grupo: string;
  comprobantesAsociados: string;
  implementacion: 'implementado' | 'pendiente';
}

// ─────────────────────────────────────────────────
// Catálogo 54 — Bienes y servicios sujetos a detracción
// ─────────────────────────────────────────────────

export interface CodigoDetraccionTributaria extends CatalogoTributarioBase {
  catalogo: '54';
  tipoOperacionRelacionado: string;
  clasificacion: string;
  /** Porcentaje normativo SUNAT. null cuando no hay tasa fija única. */
  porcentajeNormativo: number | null;
  /** fijo = tasa única; condicional = depende de condición SUNAT; variable = puede variar; pendiente = verificar fuente oficial antes de usar. */
  tipoPorcentaje: 'fijo' | 'variable' | 'condicional' | 'pendiente';
  /** Nota explicativa para tipos condicional, variable o pendiente. */
  notaPorcentaje?: string;
  /**
   * Afectaciones IGV con las que este código de detracción es compatible.
   * Fuente normativa: R.S. N.° 183-2004/SUNAT y normas modificatorias.
   * 'gravado': aplica a operaciones gravadas con IGV.
   * 'exonerado': aplica a operaciones exoneradas del IGV.
   * Lista vacía: sin afectación confirmada (no mostrar en selector).
   */
  afectacionesCompatibles: ('gravado' | 'exonerado')[];
  implementacion: 'implementado' | 'pendiente';
}

// ─────────────────────────────────────────────────
// Catálogo 52 — Leyendas
// ─────────────────────────────────────────────────

export interface LeyendaTributaria extends CatalogoTributarioBase {
  catalogo: '52';
  grupo: string;
}

// ─────────────────────────────────────────────────
// Catálogo 53 — Cargos, descuentos y otras deducciones
// ─────────────────────────────────────────────────

export interface CargoDescuentoTributario extends CatalogoTributarioBase {
  catalogo: '53';
  nivel: 'Item' | 'Global';
  grupo: string;
}

// ─────────────────────────────────────────────────
// Catálogo 16 — Tipo de precio de venta unitario
// ─────────────────────────────────────────────────

export interface TipoPrecioTributario extends CatalogoTributarioBase {
  catalogo: '16';
  uso: string;
}

// ─────────────────────────────────────────────────
// Unión de todos los tipos de ítem
// ─────────────────────────────────────────────────

export type ItemCatalogoTributario =
  | TipoOperacionTributaria
  | CodigoDetraccionTributaria
  | LeyendaTributaria
  | CargoDescuentoTributario
  | TipoPrecioTributario;

// ─────────────────────────────────────────────────
// Configuración de detracción de empresa
// Se persiste localmente; se reutilizará desde emisión y otros módulos.
// ─────────────────────────────────────────────────

export interface ConfiguracionDetraccionEmpresa {
  cuentaBancoNacion: string;
  redondearMonto: boolean;
  medioPagoSunatPorDefecto: string;
}

// ─────────────────────────────────────────────────
// Overrides de usuario sobre el catálogo base
// Permite activar/inactivar sin alterar los datos oficiales.
// ─────────────────────────────────────────────────

export interface SobrescriturasCatalogo {
  inactivos: string[];
  ocultos: string[];
}
