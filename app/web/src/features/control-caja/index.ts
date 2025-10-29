// Barrel export para el módulo Control de Caja
export * from './models';
export * from './utils';
export * from './components/common';
export * from './components/caja';
export { CajaProvider, useCaja } from './context/CajaContext';

// Exportar páginas con nombres específicos para evitar conflictos
export { default as ControlCajaHome } from './pages/Home';
export { default as AperturaCajaPage } from './pages/AperturaCaja';
export { default as CierreCajaPage } from './pages/CierreCaja';
export { default as RegistrarMovimientoPage } from './pages/RegistrarMovimiento';
export { default as MovimientosCajaPage } from './pages/MovimientosCaja';
export { default as DetalleMovimientoCajaPage } from './pages/DetalleMovimientoCaja';
export { default as ConfiguracionCajaPage } from './pages/ConfiguracionCaja';
export { default as ReportesCajaPage } from './pages/ReportesCaja';
