// ===================================================================
// VOUCHER DESIGN EXTENDED - RE-EXPORT DESDE MODELO UNIFICADO
// Este archivo mantiene compatibilidad hacia atrás
// ===================================================================

import {
  DEFAULT_DOCUMENT_FIELDS as _DEFAULT_DOCUMENT_FIELDS,
  DEFAULT_PRODUCT_FIELDS_A4 as _DEFAULT_PRODUCT_FIELDS_A4,
  DEFAULT_A4_CONFIG as _DEFAULT_A4_CONFIG,
  DEFAULT_TICKET_CONFIG as _DEFAULT_TICKET_CONFIG,
} from './VoucherDesignUnified';

// Re-exportar tipos
export type {
  DesignType,
  DesignVersion,
  LogoConfiguration,
  WatermarkConfiguration,
  FooterConfiguration,
  DocumentFieldsConfiguration,
  ProductFieldsConfiguration,
  VoucherDesignA4Config,
  VoucherDesignTicketConfig,
  VoucherDesignConfig,
  VoucherDesignConfigurationExtended,
} from './VoucherDesignUnified';

// Re-exportar valores
export {
  DEFAULT_LOGO_CONFIG,
  DEFAULT_WATERMARK_CONFIG,
  DEFAULT_FOOTER_CONFIG,
  DEFAULT_A4_DESIGN,
  DEFAULT_TICKET_DESIGN,
  DEFAULT_PRODUCT_FIELDS_TICKET,
} from './VoucherDesignUnified';

// Aliases únicos para compatibilidad
export const DEFAULT_DOCUMENT_FIELDS = _DEFAULT_DOCUMENT_FIELDS;
export const DEFAULT_PRODUCT_FIELDS_A4 = _DEFAULT_PRODUCT_FIELDS_A4;
export const DEFAULT_A4_CONFIG = _DEFAULT_A4_CONFIG;
export const DEFAULT_TICKET_CONFIG = _DEFAULT_TICKET_CONFIG;
export const DEFAULT_DOCUMENT_FIELDS_CONFIG = _DEFAULT_DOCUMENT_FIELDS;
export const DEFAULT_PRODUCT_FIELDS_CONFIG = _DEFAULT_PRODUCT_FIELDS_A4;
export const DEFAULT_A4_DESIGN_EXTENDED = _DEFAULT_A4_CONFIG;
export const DEFAULT_TICKET_DESIGN_EXTENDED = _DEFAULT_TICKET_CONFIG;
