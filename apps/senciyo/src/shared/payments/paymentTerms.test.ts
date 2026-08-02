import { describe, it, expect } from 'vitest';
import {
  buildCreditScheduleFromTemplate,
  validateCreditInstallments,
  validateCreditScheduleTemplate,
  type CreditInstallmentTemplate,
} from './paymentTerms';

describe('buildCreditScheduleFromTemplate — 6. la suma de las cuotas siempre iguala al total financiado', () => {
  it('dos cuotas al 50%: la suma exacta de importes es igual al total, incluso con decimales no exactos', () => {
    const schedule = buildCreditScheduleFromTemplate({
      total: 100.01,
      issueDate: '2026-07-01',
      templates: [
        { diasCredito: 30, porcentaje: 50 },
        { diasCredito: 60, porcentaje: 50 },
      ],
    });
    const sumaCuotas = schedule.cuotas.reduce((s, c) => s + c.importe, 0);
    expect(sumaCuotas).toBeCloseTo(100.01, 2);
  });

  it('tres cuotas con porcentajes que no dividen exacto (33.33/33.33/33.34): la última cuota absorbe el redondeo y la suma sigue igualando el total', () => {
    const schedule = buildCreditScheduleFromTemplate({
      total: 1000,
      issueDate: '2026-07-01',
      templates: [
        { diasCredito: 30, porcentaje: 33.33 },
        { diasCredito: 60, porcentaje: 33.33 },
        { diasCredito: 90, porcentaje: 33.34 },
      ],
    });
    const sumaCuotas = schedule.cuotas.reduce((s, c) => s + c.importe, 0);
    expect(sumaCuotas).toBeCloseTo(1000, 2);
  });
});

describe('validateCreditInstallments / validateCreditScheduleTemplate — 7. rechazo cuando las cuotas no cuadran', () => {
  it('rechaza una plantilla cuyos porcentajes no suman 100%', () => {
    const plantilla: CreditInstallmentTemplate[] = [
      { diasCredito: 30, porcentaje: 40 },
      { diasCredito: 60, porcentaje: 40 },
    ];
    const errores = validateCreditScheduleTemplate(plantilla);
    expect(errores).toContain('La suma de porcentajes debe ser exactamente 100%.');
  });

  it('acepta una plantilla cuyos porcentajes suman exactamente 100%', () => {
    const plantilla: CreditInstallmentTemplate[] = [
      { diasCredito: 30, porcentaje: 60 },
      { diasCredito: 60, porcentaje: 40 },
    ];
    expect(validateCreditScheduleTemplate(plantilla)).toEqual([]);
  });

  it('rechaza un cronograma ya construido con una cuota de importe 0 o negativo', () => {
    const schedule = buildCreditScheduleFromTemplate({
      total: 100,
      issueDate: '2026-07-01',
      templates: [{ diasCredito: 30, porcentaje: 100 }],
    });
    const cuotaInvalida = { ...schedule.cuotas[0], importe: 0 };
    const errores = validateCreditInstallments([cuotaInvalida]);
    expect(errores.some((e) => e.includes('importe mayor a 0'))).toBe(true);
  });

  it('rechaza un cronograma sin ninguna cuota', () => {
    expect(validateCreditInstallments([])).toEqual(['Debe definir al menos una cuota.']);
  });
});
