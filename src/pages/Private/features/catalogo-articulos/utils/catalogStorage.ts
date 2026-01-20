import { tryEnsureEmpresaId, tryLsKey } from '../../../../../shared/tenant';
import type { Product, Package } from '../models/types';
import type { Category } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { inferUnitMeasureType } from './unitMeasureHelpers';

const LEGACY_KEYS = [
  'catalog_products',
  'catalog_categories',
  'catalog_packages',
  'productTableColumns',
  'productTableColumnsVersion',
  'productFieldsConfig'
];

const PRODUCT_STORAGE_KEY = 'catalog_products';
const PACKAGE_STORAGE_KEY = 'catalog_packages';
const CATEGORY_STORAGE_KEY = 'catalog_categories';
const MIGRATION_MARKER = 'catalog_migrated';

type ProductLike = Partial<Product> & Record<string, unknown>;
type PackageLike = Partial<Package> & Record<string, unknown>;
type CategoryLike = Partial<Category> & Record<string, unknown>;

export function runCatalogStorageMigration() {
  try {
    const empresaId = tryEnsureEmpresaId();
    if (!empresaId) {
      return;
    }
    const markerKey = `${empresaId}:${MIGRATION_MARKER}`;
    if (localStorage.getItem(markerKey) === 'v1') {
      return;
    }

    LEGACY_KEYS.forEach((key) => {
      const namespaced = `${empresaId}:${key}`;
      const hasNamespaced = localStorage.getItem(namespaced) !== null;
      if (hasNamespaced) {
        return;
      }
      const legacyValue = localStorage.getItem(key);
      if (legacyValue !== null) {
        localStorage.setItem(namespaced, legacyValue);
        localStorage.removeItem(key);
      }
    });

    localStorage.setItem(markerKey, 'v1');
  } catch (error) {
    console.warn('Migración legacy->namespaced omitida (catalogStorage):', error);
  }
}

export function loadProductsFromStorage(): Product[] {
  return readCollection<ProductLike, Product>(PRODUCT_STORAGE_KEY, deserializeProduct);
}

export function saveProductsToStorage(products: Product[]) {
  writeCollection(PRODUCT_STORAGE_KEY, products);
}

export function loadPackagesFromStorage(): Package[] {
  return readCollection<PackageLike, Package>(PACKAGE_STORAGE_KEY, deserializePackage);
}

export function savePackagesToStorage(packages: Package[]) {
  writeCollection(PACKAGE_STORAGE_KEY, packages);
}

export function loadCategoriesFromStorage(): Category[] {
  return readCollection<CategoryLike, Category>(CATEGORY_STORAGE_KEY, deserializeCategory);
}

export function saveCategoriesToStorage(categories: Category[]) {
  writeCollection(CATEGORY_STORAGE_KEY, categories);
}

export function loadCollectionsForEmpresa(empresaId: string) {
  const read = <T extends Record<string, unknown>>(key: string, reviver: (item: T) => Product | Package) => {
    try {
      const raw = localStorage.getItem(`${empresaId}:${key}`);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.map((item: T) => reviver(item));
    } catch (error) {
      console.warn(`No se pudo leer ${key} para empresa ${empresaId}:`, error);
      return [];
    }
  };

  return {
    products: read<ProductLike>(PRODUCT_STORAGE_KEY, deserializeProduct),
    packages: read<PackageLike>(PACKAGE_STORAGE_KEY, deserializePackage)
  };
}

function readCollection<T extends Record<string, unknown>, R>(key: string, reviver: (item: T) => R): R[] {
  try {
    const storageKey = tryLsKey(key);
    if (!storageKey) {
      return [];
    }
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((item: T) => reviver(item));
  } catch (error) {
    console.warn(`No se pudo leer ${key}:`, error);
    return [];
  }
}

function writeCollection<T>(key: string, data: T[]) {
  try {
    const storageKey = tryLsKey(key);
    if (!storageKey) {
      return;
    }
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch (error) {
    console.warn(`No se pudo escribir ${key}:`, error);
  }
}

function deserializeProduct(item: ProductLike): Product {
  const fechaCreacion = item.fechaCreacion ? new Date(item.fechaCreacion) : new Date();
  const fechaActualizacion = item.fechaActualizacion ? new Date(item.fechaActualizacion) : fechaCreacion;

  return {
    ...item,
    id: String(item.id ?? Date.now().toString()),
    codigo: String(item.codigo ?? ''),
    nombre: String(item.nombre ?? ''),
    unidad: String(item.unidad ?? ''),
    tipoUnidadMedida: (item.tipoUnidadMedida as Product['tipoUnidadMedida']) ?? inferUnitMeasureType(String(item.unidad ?? '')),
    precio: Number(item.precio ?? 0),
    categoria: String(item.categoria ?? ''),
    descripcion: item.descripcion ? String(item.descripcion) : undefined,
    imagen: item.imagen ? String(item.imagen) : undefined,
    impuesto: item.impuesto ? String(item.impuesto) : undefined,
    unidadesMedidaAdicionales: Array.isArray(item.unidadesMedidaAdicionales)
      ? item.unidadesMedidaAdicionales
      : [],
    establecimientoIds: Array.isArray(item.establecimientoIds) ? item.establecimientoIds as string[] : [],
    disponibleEnTodos: Boolean(item.disponibleEnTodos),
    alias: item.alias ? String(item.alias) : undefined,
    precioCompra: typeof item.precioCompra === 'number' ? item.precioCompra : undefined,
    porcentajeGanancia: typeof item.porcentajeGanancia === 'number' ? item.porcentajeGanancia : undefined,
    codigoBarras: item.codigoBarras ? String(item.codigoBarras) : undefined,
    codigoFabrica: item.codigoFabrica ? String(item.codigoFabrica) : undefined,
    codigoSunat: item.codigoSunat ? String(item.codigoSunat) : undefined,
    descuentoProducto: typeof item.descuentoProducto === 'number' ? item.descuentoProducto : undefined,
    marca: item.marca ? String(item.marca) : undefined,
    modelo: item.modelo ? String(item.modelo) : undefined,
    peso: typeof item.peso === 'number' ? item.peso : undefined,
    tipoExistencia: (item.tipoExistencia as Product['tipoExistencia']) ?? 'MERCADERIAS',
    fechaCreacion,
    fechaActualizacion,
    cantidad: typeof item.cantidad === 'number' ? item.cantidad : undefined,
    stockPorEstablecimiento: item.stockPorEstablecimiento as Product['stockPorEstablecimiento'],
    stockPorAlmacen: item.stockPorAlmacen as Product['stockPorAlmacen'],
    stockMinimoPorAlmacen: item.stockMinimoPorAlmacen as Product['stockMinimoPorAlmacen'],
    stockMaximoPorAlmacen: item.stockMaximoPorAlmacen as Product['stockMaximoPorAlmacen']
  } as Product;
}

function deserializePackage(item: PackageLike): Package {
  const fechaCreacion = item.fechaCreacion ? new Date(item.fechaCreacion) : new Date();
  return {
    ...item,
    id: String(item.id ?? Date.now().toString()),
    nombre: String(item.nombre ?? ''),
    descripcion: item.descripcion ? String(item.descripcion) : undefined,
    productos: Array.isArray(item.productos) ? item.productos as Package['productos'] : [],
    precio: Number(item.precio ?? 0),
    descuento: typeof item.descuento === 'number' ? item.descuento : undefined,
    imagen: item.imagen ? String(item.imagen) : undefined,
    fechaCreacion
  } as Package;
}

function deserializeCategory(item: CategoryLike): Category {
  const fechaCreacion = item.fechaCreacion ? new Date(item.fechaCreacion) : new Date();
  return {
    ...item,
    id: String(item.id ?? Date.now().toString()),
    nombre: String(item.nombre ?? ''),
    descripcion: item.descripcion ? String(item.descripcion) : undefined,
    color: item.color ? String(item.color) : undefined,
    productCount: typeof item.productCount === 'number' ? item.productCount : 0,
    fechaCreacion
  } as Category;
}
