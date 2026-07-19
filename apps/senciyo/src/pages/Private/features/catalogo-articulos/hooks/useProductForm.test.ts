import { describe, it, expect } from 'vitest';
import { validarImpuestoProducto } from './useProductForm';

describe('validarImpuestoProducto — bloquea afectación tributaria ficticia, sin fallback a IGV 18%', () => {
  it('producto nuevo sin impuestoId: bloquea el guardado, sin importar la empresa sin predeterminado', () => {
    const mensaje = validarImpuestoProducto({ impuestoId: undefined, impuesto: '' }, false);
    expect(mensaje).toBeTruthy();
  });

  it('producto nuevo con impuestoId real: guardado válido', () => {
    const mensaje = validarImpuestoProducto({ impuestoId: 'tax-igv18', impuesto: 'IGV (18.00%)' }, false);
    expect(mensaje).toBeUndefined();
  });

  it('producto nuevo con texto no vacío pero SIN impuestoId: sigue bloqueado — el texto nunca sustituye la relación estructurada', () => {
    const mensaje = validarImpuestoProducto({ impuestoId: undefined, impuesto: 'IGV (18.00%)' }, false);
    expect(mensaje).toBeTruthy();
  });

  it('producto existente con impuestoId: conserva su impuesto aunque no tenga texto y aunque el predeterminado de la empresa sea otro', () => {
    const mensaje = validarImpuestoProducto({ impuestoId: 'tax-antiguo', impuesto: '' }, true);
    expect(mensaje).toBeUndefined();
  });

  it('producto histórico con solo texto legado (sin impuestoId): válido, no se fuerza una nueva selección', () => {
    const mensaje = validarImpuestoProducto({ impuestoId: undefined, impuesto: 'Exonerado (0.00%)' }, true);
    expect(mensaje).toBeUndefined();
  });

  it('producto existente sin impuestoId ni texto: sigue sin impuesto configurado', () => {
    const mensaje = validarImpuestoProducto({ impuestoId: undefined, impuesto: '' }, true);
    expect(mensaje).toBeTruthy();
  });

  it('es determinista: la misma entrada produce el mismo resultado', () => {
    const datos = { impuestoId: undefined, impuesto: '' };
    expect(validarImpuestoProducto(datos, false)).toBe(validarImpuestoProducto(datos, false));
  });
});
