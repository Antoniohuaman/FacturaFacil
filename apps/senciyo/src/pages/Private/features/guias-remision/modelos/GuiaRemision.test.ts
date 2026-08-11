import { describe, it, expect } from 'vitest';
import { GUIA_REMISION_BORRADOR, TIPO_GRE_CODIGO_DOCUMENTO, TIPO_GRE_LABELS } from './GuiaRemision';

// GRE-P1-001: `FormularioGREPage.tsx` deriva `codigoDocumento`/título/motivos de `guia.tipo`
// (fuente única una vez cargada la guía) usando esta MISMA constante — ya no reimplementa el
// mapeo '09'/'31' a mano. Esta prueba fija ese contrato.
describe('TIPO_GRE_CODIGO_DOCUMENTO', () => {
  it('remitente mapea al código SUNAT "09" (GRR)', () => {
    expect(TIPO_GRE_CODIGO_DOCUMENTO.remitente).toBe('09');
  });

  it('transportista mapea al código SUNAT "31" (GRT)', () => {
    expect(TIPO_GRE_CODIGO_DOCUMENTO.transportista).toBe('31');
  });

  it('tiene exactamente una entrada por cada tipo de GRE existente', () => {
    expect(Object.keys(TIPO_GRE_CODIGO_DOCUMENTO).sort()).toEqual(Object.keys(TIPO_GRE_LABELS).sort());
  });
});

describe('GUIA_REMISION_BORRADOR', () => {
  it('crea un borrador con el tipo solicitado, sin importar cuál sea', () => {
    expect(GUIA_REMISION_BORRADOR('remitente').tipo).toBe('remitente');
    expect(GUIA_REMISION_BORRADOR('transportista').tipo).toBe('transportista');
  });

  it('cada borrador nuevo tiene un id propio (nunca reutilizado)', () => {
    const a = GUIA_REMISION_BORRADOR('remitente');
    const b = GUIA_REMISION_BORRADOR('remitente');
    expect(a.id).not.toBe(b.id);
  });

  it('el motivo por defecto es siempre válido para el tipo de guía — "01" (Venta) no existe en el catálogo de Transportista', () => {
    expect(GUIA_REMISION_BORRADOR('remitente').motivoTraslado).toBe('01');
    expect(GUIA_REMISION_BORRADOR('transportista').motivoTraslado).toBe('13');
  });

  it('un borrador Transportista nuevo nunca arranca con transporteSubcontratado activo — el usuario debe activarlo explícitamente', () => {
    expect(GUIA_REMISION_BORRADOR('transportista').transporteSubcontratado).toBeUndefined();
  });

  it('un borrador nuevo nunca arranca con un snapshot de Registro MTC — se congela solo al emitir', () => {
    expect(GUIA_REMISION_BORRADOR('transportista').numeroRegistroMTC).toBeUndefined();
    expect(GUIA_REMISION_BORRADOR('remitente').numeroRegistroMTC).toBeUndefined();
  });
});
