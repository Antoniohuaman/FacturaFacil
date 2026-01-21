import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SearchDataset } from '../../../../contasis/SearchBar/types/search.types.ts';
import { useProductStore } from '../../features/catalogo-articulos/hooks/useProductStore';
import { useClientes } from '../../features/gestion-clientes/hooks/useClientes';
import type { ClienteFilters } from '../../features/gestion-clientes/models';
import { buildRichHaystack } from '../../../../contasis/SearchBar/utils/searchAlgorithm.ts';

export const useContasisDatasets = () => {
  const navigate = useNavigate();
  const productos = useProductStore((state) => state.allProducts);
  
  const clienteFilters = useMemo<ClienteFilters>(() => ({ page: 1, limit: 50 }), []);
  const { clientes } = useClientes(clienteFilters);

  // Datos de prueba para debugging
  const hasRealData = productos.length > 0 || clientes.length > 0;
  
  const datasets = useMemo<SearchDataset[]>(() => {
    const productosDataset: SearchDataset = {
      key: 'productos',
      title: 'Productos',
      routeBase: '/catalogo',
      items: productos.map((producto) => ({
        id: producto.id,
        label: producto.nombre,
        secondary: producto.codigo,
        description: producto.descripcion,
        haystack: buildRichHaystack(
          producto.nombre,
          producto.codigo,
          producto.alias,
          producto.descripcion,
          producto.categoria,
          producto.marca,
          producto.modelo
        ),
        meta: {
          Categoria: producto.categoria,
          Marca: producto.marca,
          Modelo: producto.modelo,
        },
        amountLabel: 'Precio',
        amountValue: typeof producto.precio === 'number' ? producto.precio : undefined,
        amountCurrency: 'PEN',
        entity: producto,
        keywords: [
          { value: producto.nombre, weight: 140, isKey: true },
          { value: producto.codigo, weight: 140, isKey: true },
          { value: producto.alias, weight: 110 },
          { value: producto.categoria, weight: 90 },
          { value: producto.marca, weight: 90 },
        ],
      })),
    };

    const clientesDataset: SearchDataset = {
      key: 'clientes',
      title: 'Clientes',
      routeBase: '/clientes',
      items: clientes.map((cliente) => {
        const id = String(cliente.id ?? cliente.numeroDocumento ?? cliente.document ?? Date.now());
        const title = cliente.name || cliente.razonSocial || cliente.nombreCompleto || 'Cliente sin nombre';
        const subtitle = cliente.razonSocial && cliente.razonSocial !== cliente.name ? cliente.razonSocial : cliente.nombreComercial;
        const document = cliente.document || cliente.numeroDocumento;

        return {
          id,
          label: title,
          secondary: subtitle ?? undefined,
          description: cliente.address ?? cliente.direccion ?? undefined,
          haystack: buildRichHaystack(
            cliente.name,
            cliente.razonSocial,
            cliente.nombreCompleto,
            cliente.nombreComercial,
            cliente.document,
            cliente.numeroDocumento,
            cliente.email,
            cliente.phone
          ),
          meta: {
            Documento: document,
            Correo: cliente.email,
            Telefono: cliente.phone,
          },
          entity: cliente,
          keywords: [
            { value: cliente.name, weight: 120, isKey: true },
            { value: cliente.razonSocial, weight: 120, isKey: true },
            { value: cliente.document, weight: 160, isKey: true },
            { value: cliente.numeroDocumento, weight: 160, isKey: true },
            { value: cliente.email, weight: 90 },
            { value: cliente.phone, weight: 80 },
          ],
        };
      }),
    };

    // Agregar datos de prueba si no hay datos reales (solo para debugging)
    if (!hasRealData) {
      const testProductsDataset: SearchDataset = {
        key: 'productos',
        title: 'Productos',
        routeBase: '/catalogo',
        items: [
          {
            id: 'test-1',
            label: 'Producto de Prueba',
            secondary: 'TEST001',
            description: 'Producto para probar búsqueda',
            haystack: 'producto prueba test001',
            entity: { id: 'test-1', nombre: 'Producto de Prueba', codigo: 'TEST001' }
          }
        ]
      };
      return [testProductsDataset];
    }

    return [productosDataset, clientesDataset];
  }, [productos, clientes, hasRealData]);

  const handleSearchSelect = (type: string, item: any) => {
    switch (type) {
      case 'productos':
        navigate(`/catalogo?search=${encodeURIComponent(item.codigo || item.nombre)}`);
        break;
      case 'clientes':
        const searchParam = item.document || item.numeroDocumento || item.name;
        navigate(`/clientes?search=${encodeURIComponent(searchParam)}`);
        break;
      default:
        console.log('Tipo de resultado no manejado:', type, item);
    }
  };

  return {
    datasets,
    handleSearchSelect,
  };
};