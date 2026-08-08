// Cierre de bloqueante 3 de la revisión de Etapa 2: la correspondencia visual↔valor persistido de
// `TratamientoImpuestoCompra` estaba INVERTIDA en `SeccionValorizacionInventario.tsx`
// (`impuesto_recuperable`/`impuesto_no_recuperable` con la etiqueta/ayuda de la otra). Estas
// pruebas relacionan cada opción visual con el valor persistido Y con el `esRecuperable` real que
// `resolverTratamientoTributarioProducto` calcula para ese valor — nunca solo el texto visible.
import { describe, it, expect } from 'vitest';
import { OPCIONES_TRATAMIENTO_IMPUESTO } from './opcionesTratamientoImpuestoCompra';
import { resolverTratamientoTributarioProducto } from '@/shared/catalogos-sunat/resolucionTributaria';
import type { Tax } from '../../modelos/Tax';

function crearTaxGravado(): Tax {
  return {
    id: 'tax-igv18',
    code: 'IGV18',
    name: 'IGV 18%',
    shortName: 'IGV 18%',
    type: 'PERCENTAGE',
    rate: 18,
    sunatCode: '1000',
    sunatName: 'IGV - Impuesto General a las Ventas',
    sunatType: 'VAT',
    affectationCode: '10',
    affectationName: 'Gravado - Operación Onerosa',
    category: 'PURCHASE',
    includeInPrice: false,
    isCompound: false,
    applicableTo: { products: true, services: true, both: true },
    rules: { roundingMethod: 'ROUND', roundingPrecision: 2 },
    jurisdiction: { country: 'PE' },
    isDefault: true,
    isActive: true,
    validFrom: new Date('2011-03-01'),
    validTo: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
}

describe('OPCIONES_TRATAMIENTO_IMPUESTO — correspondencia opción visual ↔ valor persistido ↔ esRecuperable', () => {
  it('tiene exactamente 3 opciones, una por cada valor confirmable (excluye pendiente_configuracion, que no es una elección del usuario)', () => {
    expect(OPCIONES_TRATAMIENTO_IMPUESTO.map((o) => o.valor).sort()).toEqual(
      ['impuesto_no_recuperable', 'impuesto_recuperable', 'segun_afectacion'].sort()
    );
  });

  it('"Excluir impuestos recuperables" persiste "impuesto_recuperable" y resuelve esRecuperable=true', () => {
    const opcion = OPCIONES_TRATAMIENTO_IMPUESTO.find((o) => o.label === 'Excluir impuestos recuperables');
    expect(opcion?.valor).toBe('impuesto_recuperable');
    expect(opcion?.ayuda).toMatch(/no forma parte del costo/i);

    const resolucion = resolverTratamientoTributarioProducto({ impuestoId: 'tax-igv18' }, opcion!.valor, [crearTaxGravado()]);
    expect(resolucion.esRecuperable).toBe(true);
  });

  it('"Incluir impuestos en el costo" persiste "impuesto_no_recuperable" y resuelve esRecuperable=false', () => {
    const opcion = OPCIONES_TRATAMIENTO_IMPUESTO.find((o) => o.label === 'Incluir impuestos en el costo');
    expect(opcion?.valor).toBe('impuesto_no_recuperable');
    expect(opcion?.ayuda).toMatch(/forma parte del costo/i);
    expect(opcion?.ayuda).not.toMatch(/no forma parte/i);

    const resolucion = resolverTratamientoTributarioProducto({ impuestoId: 'tax-igv18' }, opcion!.valor, [crearTaxGravado()]);
    expect(resolucion.esRecuperable).toBe(false);
  });

  it('"Decidir en cada línea de compra" persiste "segun_afectacion" y no determina esRecuperable por sí sola (queda null)', () => {
    const opcion = OPCIONES_TRATAMIENTO_IMPUESTO.find((o) => o.label === 'Decidir en cada línea de compra');
    expect(opcion?.valor).toBe('segun_afectacion');

    const resolucion = resolverTratamientoTributarioProducto({ impuestoId: 'tax-igv18' }, opcion!.valor, [crearTaxGravado()]);
    expect(resolucion.esRecuperable).toBeNull();
  });

  it('nunca queda una opción cuyo label sugiera "excluir" pero persista el valor "no_recuperable" (la inversión original de la revisión)', () => {
    const excluir = OPCIONES_TRATAMIENTO_IMPUESTO.find((o) => o.label.toLowerCase().includes('excluir'));
    const incluir = OPCIONES_TRATAMIENTO_IMPUESTO.find((o) => o.label.toLowerCase().includes('incluir'));
    expect(excluir?.valor).toBe('impuesto_recuperable');
    expect(incluir?.valor).toBe('impuesto_no_recuperable');
  });
});
