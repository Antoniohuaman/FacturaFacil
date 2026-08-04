import { describe, it, expect } from 'vitest';
import { siguienteNumeroPago } from './formatearCompras';

describe('siguienteNumeroPago — numeración PG GLOBAL, nunca filtrada por origen (corrección técnica final §8)', () => {
  it('un pago de Gasto ve el siguiente número correcto aunque el último emitido haya sido de Compras (y viceversa)', () => {
    const pagosDeAmbosOrigenes = [
      { numeroPago: 'PG01-00000001' },
      { numeroPago: 'PG01-00000002' },
    ];
    expect(siguienteNumeroPago(pagosDeAmbosOrigenes, 'PG01')).toBe('PG01-00000003');
  });

  it('lista filtrada por origen (compra) produciría un número YA emitido por gasto — confirma por qué la previsualización nunca debe filtrar por origen', () => {
    const soloCompra = [{ numeroPago: 'PG01-00000001' }];
    // Si el siguiente número se calculara solo contra pagos de Compras,
    // "PG01-00000002" parecería libre aunque Gastos ya lo haya emitido —
    // por eso `useFormularioPagoCompra`/`ContextoCompras`/`ContextoGastos`
    // deben pasar SIEMPRE el almacén global (`cargarPagosCompra()`), nunca
    // `listarPagosPorOrigen('compra'|'gasto')`.
    expect(siguienteNumeroPago(soloCompra, 'PG01')).toBe('PG01-00000002');

    const global = [{ numeroPago: 'PG01-00000001' }, { numeroPago: 'PG01-00000002' }];
    expect(siguienteNumeroPago(global, 'PG01')).toBe('PG01-00000003');
  });

  it('series PG distintas mantienen numeración independiente', () => {
    const pagos = [{ numeroPago: 'PG01-00000001' }, { numeroPago: 'PG02-00000001' }];
    expect(siguienteNumeroPago(pagos, 'PG01')).toBe('PG01-00000002');
    expect(siguienteNumeroPago(pagos, 'PG02')).toBe('PG02-00000002');
  });
});
