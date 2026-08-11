import { describe, it, expect } from 'vitest';
import { validarDatosTransportista } from './validarDatosTransportista';
import type { FormStateDatosTransportista } from './validarDatosTransportista';

function formBase(overrides: Partial<FormStateDatosTransportista> = {}): FormStateDatosTransportista {
  return {
    numeroRegistroMTC: '',
    estado: 'HABILITADO',
    codigoEntidadAutorizadora: '',
    numeroAutorizacion: '',
    ...overrides,
  };
}

describe('validar — Registro MTC ya no es obligatorio de forma global', () => {
  it('Registro MTC vacío: válido — no hay fuente real (capacidad útil del vehículo) que determine cuándo es obligatorio', () => {
    const errores = validarDatosTransportista(formBase());
    expect(Object.keys(errores)).toHaveLength(0);
  });

  it('Registro MTC con valor: sigue siendo válido, ningún cambio de comportamiento', () => {
    const errores = validarDatosTransportista(formBase({ numeroRegistroMTC: '123456' }));
    expect(Object.keys(errores)).toHaveLength(0);
  });
});

describe('validar — Autorización especial: pareja condicional bidireccional', () => {
  it('ambos vacíos: válido', () => {
    const errores = validarDatosTransportista(formBase());
    expect(errores.codigoEntidadAutorizadora).toBeUndefined();
    expect(errores.numeroAutorizacion).toBeUndefined();
  });

  it('entidad seleccionada sin número: inválido — el número pasa a ser obligatorio', () => {
    const errores = validarDatosTransportista(formBase({ codigoEntidadAutorizadora: '06' }));
    expect(errores.numeroAutorizacion).toBeDefined();
    expect(errores.codigoEntidadAutorizadora).toBeUndefined();
  });

  it('número informado sin entidad: inválido — la entidad pasa a ser obligatoria', () => {
    const errores = validarDatosTransportista(formBase({ numeroAutorizacion: '12345' }));
    expect(errores.codigoEntidadAutorizadora).toBeDefined();
    expect(errores.numeroAutorizacion).toBeUndefined();
  });

  it('ambos informados: válido', () => {
    const errores = validarDatosTransportista(formBase({ codigoEntidadAutorizadora: '06', numeroAutorizacion: '12345' }));
    expect(Object.keys(errores)).toHaveLength(0);
  });

  it('número con solo espacios en blanco, sin entidad: sigue inválido — no se confunde con un valor real', () => {
    const errores = validarDatosTransportista(formBase({ numeroAutorizacion: '   ' }));
    expect(errores.codigoEntidadAutorizadora).toBeUndefined();
    expect(errores.numeroAutorizacion).toBeUndefined();
  });
});
