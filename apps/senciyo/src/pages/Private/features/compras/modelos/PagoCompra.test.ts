import { describe, it, expect } from 'vitest';
import { ESTADO_DOCUMENTO_PAGO_LABELS } from './PagoCompra';

describe('ESTADO_DOCUMENTO_PAGO_LABELS', () => {
  it('un Pago activo se muestra como "Pagado" (no "Registrado"): un Pago no tiene estado de borrador, su semántica es que está pagado o anulado', () => {
    expect(ESTADO_DOCUMENTO_PAGO_LABELS.registrado).toBe('Pagado');
  });

  it('un Pago anulado se muestra como "Anulado"', () => {
    expect(ESTADO_DOCUMENTO_PAGO_LABELS.anulado).toBe('Anulado');
  });

  it('el valor interno persistido sigue siendo "registrado" (compatibilidad con pagos legados en localStorage)', () => {
    expect(Object.keys(ESTADO_DOCUMENTO_PAGO_LABELS)).toEqual(['registrado', 'anulado']);
  });
});
