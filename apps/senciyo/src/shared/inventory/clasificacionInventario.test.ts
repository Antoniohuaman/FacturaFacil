import { describe, it, expect } from 'vitest';
import { esProductoInventariable } from './clasificacionInventario';

describe('esProductoInventariable — control de stock, nunca "todo menos SERVICIOS"', () => {
  it('MERCADERIAS controla stock', () => {
    expect(esProductoInventariable({ tipoExistencia: 'MERCADERIAS' })).toBe(true);
  });

  it('PRODUCTOS_TERMINADOS controla stock', () => {
    expect(esProductoInventariable({ tipoExistencia: 'PRODUCTOS_TERMINADOS' })).toBe(true);
  });

  it('MATERIAS_PRIMAS controla stock', () => {
    expect(esProductoInventariable({ tipoExistencia: 'MATERIAS_PRIMAS' })).toBe(true);
  });

  it('ENVASES controla stock', () => {
    expect(esProductoInventariable({ tipoExistencia: 'ENVASES' })).toBe(true);
  });

  it('MATERIALES_AUXILIARES controla stock', () => {
    expect(esProductoInventariable({ tipoExistencia: 'MATERIALES_AUXILIARES' })).toBe(true);
  });

  it('SUMINISTROS controla stock', () => {
    expect(esProductoInventariable({ tipoExistencia: 'SUMINISTROS' })).toBe(true);
  });

  it('REPUESTOS controla stock', () => {
    expect(esProductoInventariable({ tipoExistencia: 'REPUESTOS' })).toBe(true);
  });

  it('EMBALAJES controla stock', () => {
    expect(esProductoInventariable({ tipoExistencia: 'EMBALAJES' })).toBe(true);
  });

  it('SERVICIOS no controla stock', () => {
    expect(esProductoInventariable({ tipoExistencia: 'SERVICIOS' })).toBe(false);
  });

  it('OTROS no controla stock sin evidencia estructural adicional', () => {
    expect(esProductoInventariable({ tipoExistencia: 'OTROS' })).toBe(false);
  });

  it('tipoExistencia ausente (undefined) no controla stock — nunca se asume sin evidencia', () => {
    expect(esProductoInventariable({})).toBe(false);
    expect(esProductoInventariable({ tipoExistencia: undefined })).toBe(false);
  });

  it('un valor forzado/desconocido fuera del catálogo interno no controla stock (sin cast inseguro como sustituto de validación)', () => {
    expect(esProductoInventariable({ tipoExistencia: 'ALGO_INVENTADO' })).toBe(false);
    expect(esProductoInventariable({ tipoExistencia: '' })).toBe(false);
  });
});

describe('Separación: inventariabilidad ≠ naturaleza comercial BIEN/SERVICIO', () => {
  // La clasificación comercial real vive inline en cada consumidor de Ventas/GRE
  // (`tipoExistencia === 'SERVICIOS' ? 'SERVICIO' : 'BIEN'`) — NUNCA delega en
  // esProductoInventariable (ver useAvailableProducts.tsx, ProductSelector.tsx,
  // SeccionBienes.tsx). Se replica aquí solo para demostrar la independencia de ambas reglas.
  function clasificacionComercial(tipoExistencia: string | undefined): 'BIEN' | 'SERVICIO' {
    return tipoExistencia === 'SERVICIOS' ? 'SERVICIO' : 'BIEN';
  }

  it('un servicio comercial no controla stock', () => {
    const producto = { tipoExistencia: 'SERVICIOS' };
    expect(clasificacionComercial(producto.tipoExistencia)).toBe('SERVICIO');
    expect(esProductoInventariable(producto)).toBe(false);
  });

  it('un bien inventariable controla stock', () => {
    const producto = { tipoExistencia: 'MERCADERIAS' };
    expect(clasificacionComercial(producto.tipoExistencia)).toBe('BIEN');
    expect(esProductoInventariable(producto)).toBe(true);
  });

  it('un bien NO inventariable (OTROS) sigue siendo BIEN, nunca se transforma en SERVICIO', () => {
    const producto = { tipoExistencia: 'OTROS' };
    expect(clasificacionComercial(producto.tipoExistencia)).toBe('BIEN');
    expect(esProductoInventariable(producto)).toBe(false);
  });

  it('cambiar la regla de control de stock no altera la clasificación comercial', () => {
    // Antes de esta corrección, esProductoInventariable({tipoExistencia:'OTROS'}) devolvía true;
    // ahora devuelve false — pero la clasificación comercial de 'OTROS' nunca dependió de esa
    // función y sigue siendo 'BIEN' en ambos casos.
    expect(clasificacionComercial('OTROS')).toBe('BIEN');
  });
});
