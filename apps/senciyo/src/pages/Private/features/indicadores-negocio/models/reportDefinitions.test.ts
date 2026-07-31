import { describe, it, expect } from 'vitest';
import { reportCategories, reportDefinitions } from './reportDefinitions';

describe('reportDefinitions — Rentabilidad', () => {
  it('registra exactamente una categoría "Rentabilidad"', () => {
    expect(reportCategories.filter((categoria) => categoria === 'Rentabilidad')).toHaveLength(1);
  });

  it('registra exactamente un reporte "rentabilidad-ventas" apuntando a la vista canónica dentro de Indicadores', () => {
    const coincidencias = reportDefinitions.filter((definicion) => definicion.id === 'rentabilidad-ventas');
    expect(coincidencias).toHaveLength(1);
    expect(coincidencias[0].category).toBe('Rentabilidad');
    expect(coincidencias[0].modulePath).toBe('/indicadores?view=rentabilidad');
  });

  it('no duplica ningún id de reporte existente', () => {
    const ids = reportDefinitions.map((definicion) => definicion.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('"Rentabilidad" aparece inmediatamente después de "Comprobantes" en el orden del Hub', () => {
    const indiceComprobantes = reportCategories.indexOf('Comprobantes');
    const indiceRentabilidad = reportCategories.indexOf('Rentabilidad');
    expect(indiceRentabilidad).toBe(indiceComprobantes + 1);
  });
});
