import { describe, it, expect } from 'vitest';
import { evaluateStockAlert, getStockAlertType } from './stockAlerts';

describe('getStockAlertType', () => {
  it('disponible below mínimo should flag LOW', () => {
    expect(getStockAlertType({ disponible: 4, stockMinimo: 5 })).toBe('LOW');
  });

  it('disponible equal to mínimo should flag LOW', () => {
    expect(getStockAlertType({ disponible: 5, stockMinimo: 5 })).toBe('LOW');
  });

  it('disponible above máximo should flag OVER', () => {
    expect(getStockAlertType({ disponible: 12, stockMaximo: 10 })).toBe('OVER');
  });

  it('disponible within thresholds should be OK', () => {
    expect(getStockAlertType({ disponible: 8, stockMinimo: 5, stockMaximo: 10 })).toBe('OK');
  });

  it('without thresholds and stock > 0 should be OK', () => {
    expect(getStockAlertType({ disponible: 8 })).toBe('OK');
  });

  it('disponible = 0 without thresholds should flag LOW (sin stock)', () => {
    expect(getStockAlertType({ disponible: 0 })).toBe('LOW');
  });

  it('disponible = 0 with mínimo should flag LOW', () => {
    expect(getStockAlertType({ disponible: 0, stockMinimo: 5 })).toBe('LOW');
  });
});

describe('evaluateStockAlert', () => {
  it('below half of mínimo should be critical with correct missing', () => {
    const result = evaluateStockAlert({ disponible: 2, stockMinimo: 6 });
    expect(result.type).toBe('LOW');
    expect(result.isCritical).toBe(true);
    expect(result.missing).toBe(4);
  });

  it('above half of mínimo should not be critical', () => {
    const result = evaluateStockAlert({ disponible: 9, stockMinimo: 10 });
    expect(result.type).toBe('LOW');
    expect(result.isCritical).toBe(false);
    expect(result.missing).toBe(1);
  });

  it('OVER should expose excess units and not be critical', () => {
    const result = evaluateStockAlert({ disponible: 15, stockMaximo: 10 });
    expect(result.type).toBe('OVER');
    expect(result.isCritical).toBe(false);
    expect(result.excess).toBe(5);
  });

  it('disponible = 0 without mínimo should be LOW and critical', () => {
    const result = evaluateStockAlert({ disponible: 0 });
    expect(result.type).toBe('LOW');
    expect(result.isCritical).toBe(true);
    expect(result.missing).toBeUndefined();
  });

  it('disponible = 0 with mínimo should be LOW, critical, and report missing', () => {
    const result = evaluateStockAlert({ disponible: 0, stockMinimo: 5 });
    expect(result.type).toBe('LOW');
    expect(result.isCritical).toBe(true);
    expect(result.missing).toBe(5);
  });

  it('stock OK should not be critical', () => {
    const result = evaluateStockAlert({ disponible: 8, stockMinimo: 5, stockMaximo: 10 });
    expect(result.type).toBe('OK');
    expect(result.isCritical).toBe(false);
  });

  it('null stockMinimo should be treated as unconfigured', () => {
    const result = evaluateStockAlert({ disponible: 5, stockMinimo: null });
    expect(result.type).toBe('OK');
  });

  it('negative disponible should be normalized to 0 and flag LOW', () => {
    const result = evaluateStockAlert({ disponible: -3 });
    expect(result.type).toBe('LOW');
    expect(result.isCritical).toBe(true);
  });
});
