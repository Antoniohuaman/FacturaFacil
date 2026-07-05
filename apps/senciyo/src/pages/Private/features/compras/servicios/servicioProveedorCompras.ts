import { clientesClient } from '../../gestion-clientes/api';
import {
  buildCreateClientePayloadFromLookup,
  isExactDocumentoMatch,
} from '../../gestion-clientes/utils/saleClienteMapping';
import type { useClientes } from '../../gestion-clientes/hooks/useClientes';
import type { ProveedorSeleccionado } from '../componentes/BuscadorProveedor';

/**
 * Persiste en Gestión de Clientes/Proveedores un proveedor obtenido por
 * consulta RUC/DNI (SUNAT/RENIEC) que todavía no existe en el catálogo, para
 * que no quede referenciado como "proveedor fantasma" solo desde la OC/CC.
 * Reutiliza el mismo mapeo y guardia de duplicados que ya usa Ventas
 * (buildCreateClientePayloadFromLookup + isExactDocumentoMatch) en vez de
 * reimplementar la lógica de creación de clientes.
 */
export async function persistirProveedorSiEsNuevo(
  proveedor: ProveedorSeleccionado,
  createCliente: ReturnType<typeof useClientes>['createCliente'],
): Promise<void> {
  if (!proveedor.esNuevoDesdeConsulta) return;

  const construido = buildCreateClientePayloadFromLookup({
    nombre: proveedor.nombre,
    documento: proveedor.numeroDocumento,
    tipoDocumento: proveedor.tipoDocumento === '6' ? 'RUC' : 'DNI',
    direccion: proveedor.direccion,
  });
  if (!construido) return;

  const { documentType, documentNumber, payload } = construido;
  const resultadoBusqueda = await clientesClient.getClientes({ search: documentNumber, limit: 25, page: 1 });
  const yaExiste = resultadoBusqueda.data.some((c) => isExactDocumentoMatch(c, documentType, documentNumber));
  if (yaExiste) return;

  await createCliente({ ...payload, type: 'Proveedor', tipoCuenta: 'Proveedor' }, { origen: 'clientes' });
}
