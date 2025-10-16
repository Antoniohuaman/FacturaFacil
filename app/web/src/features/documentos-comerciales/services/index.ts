// app/web/src/features/documentos-comerciales/services/index.ts

/**
 * Barrel export de servicios
 * Dependency Inversion: Los consumidores dependen de las interfaces, no de las implementaciones
 */
export { DocumentoCalculoService } from './DocumentoCalculoService';
export { DocumentoConversionService } from './DocumentoConversionService';
export { DocumentoGeneratorService } from './DocumentoGeneratorService';
export { DocumentoValidationService } from './DocumentoValidationService';