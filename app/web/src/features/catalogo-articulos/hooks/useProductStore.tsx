import { create } from 'zustand';
import type { Category } from '../../configuracion-sistema/context/ConfigurationContext';
import type {
  Product,
  Package,
  FilterOptions,
  PaginationConfig,
  ProductFormData
} from '../models/types';
import { inferUnitMeasureType } from '../utils/unitMeasureHelpers';
import {
  runCatalogStorageMigration,
  loadProductsFromStorage,
  saveProductsToStorage,
  loadPackagesFromStorage,
  savePackagesToStorage,
  loadCategoriesFromStorage,
  saveCategoriesToStorage
} from '../utils/catalogStorage';

export type ProductInput = Omit<Product, 'id' | 'fechaCreacion' | 'fechaActualizacion' | 'precio'>;
type PackageInput = Omit<Package, 'id' | 'fechaCreacion'>;

interface ProductStoreState {
  allProducts: Product[];
  products: Product[];
  categories: Category[];
  packages: Package[];
  filters: FilterOptions;
  pagination: PaginationConfig;
  loading: boolean;
  addProduct: (data: ProductInput) => Product;
  updateProduct: (id: string, data: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  deleteAllProducts: () => void;
  addCategory: (nombre: string, descripcion?: string, color?: string) => Category | undefined;
  updateFilters: (changes: Partial<FilterOptions>) => void;
  resetFilters: () => void;
  changePage: (page: number) => void;
  changeItemsPerPage: (size: number) => void;
  importProducts: (rows: ProductFormData[]) => { createdCount: number; updatedCount: number };
  addPackage: (input: PackageInput) => Package;
  updatePackage: (id: string, data: Partial<PackageInput>) => void;
  deletePackage: (id: string) => void;
}

const STORAGE_AVAILABLE = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
const DEFAULT_ITEMS_PER_PAGE = 10;

if (STORAGE_AVAILABLE) {
  try {
    runCatalogStorageMigration();
  } catch (error) {
    console.warn('catalogStorage: migration skipped', error);
  }
}

const initialProducts = STORAGE_AVAILABLE ? loadProductsFromStorage() : [];
const initialPackages = STORAGE_AVAILABLE ? loadPackagesFromStorage() : [];
const initialCategoriesRaw = STORAGE_AVAILABLE ? loadCategoriesFromStorage() : [];
const defaultFilters = createDefaultFilters();
const defaultPagination = createDefaultPagination();
const initialCategories = syncCategoriesWithProducts(initialCategoriesRaw, initialProducts);
const initialListing = buildListing(initialProducts, defaultFilters, defaultPagination);

export const useProductStore = create<ProductStoreState>((set) => ({
  allProducts: initialProducts,
  products: initialListing.pageItems,
  categories: initialCategories,
  packages: initialPackages,
  filters: defaultFilters,
  pagination: initialListing.pagination,
  loading: false,

  addProduct: (data) => {
    let createdProduct: Product | undefined;
    set((state) => {
      const product = buildProduct(undefined, data);
      const allProducts = [product, ...state.allProducts];
      persistProducts(allProducts);
      const categories = updateCategoriesAfterProductChange(state.categories, allProducts);
      const listing = buildListing(allProducts, state.filters, state.pagination);
      createdProduct = product;
      return {
        allProducts,
        categories,
        products: listing.pageItems,
        pagination: listing.pagination
      };
    });
    return createdProduct!;
  },

  updateProduct: (id, changes) => {
    set((state) => {
      const index = state.allProducts.findIndex((product) => product.id === id);
      if (index === -1) {
        return state;
      }
      const updatedProduct = buildProduct(state.allProducts[index], changes);
      const allProducts = [...state.allProducts];
      allProducts[index] = updatedProduct;
      persistProducts(allProducts);
      const categories = updateCategoriesAfterProductChange(state.categories, allProducts);
      const listing = buildListing(allProducts, state.filters, state.pagination);
      return {
        allProducts,
        categories,
        products: listing.pageItems,
        pagination: listing.pagination
      };
    });
  },

  deleteProduct: (id) => {
    set((state) => {
      if (!state.allProducts.some((product) => product.id === id)) {
        return state;
      }
      const allProducts = state.allProducts.filter((product) => product.id !== id);
      const { packages, changed } = removeProductFromPackages(state.packages, id);
      if (changed) {
        persistPackages(packages);
      }
      persistProducts(allProducts);
      const categories = updateCategoriesAfterProductChange(state.categories, allProducts);
      const listing = buildListing(allProducts, state.filters, state.pagination);
      return {
        allProducts,
        categories,
        packages,
        products: listing.pageItems,
        pagination: listing.pagination
      };
    });
  },

  deleteAllProducts: () => {
    set((state) => {
      if (!state.allProducts.length && !state.packages.length) {
        return state;
      }
      persistProducts([]);
      persistPackages([]);
      const categories = updateCategoriesAfterProductChange(state.categories, []);
      const listing = buildListing([], state.filters, { ...state.pagination, currentPage: 1 });
      return {
        allProducts: [],
        products: listing.pageItems,
        pagination: listing.pagination,
        categories,
        packages: []
      };
    });
  },

  addCategory: (nombre, descripcion, color) => {
    let created: Category | undefined;
    set((state) => {
      const sanitizedName = nombre.trim();
      if (!sanitizedName) {
        return state;
      }
      const normalized = normalizeCategoryKey(sanitizedName);
      const existing = state.categories.find((category) => normalizeCategoryKey(category.nombre) === normalized);
      let categories: Category[];

      if (existing) {
        const updated: Category = {
          ...existing,
          nombre: sanitizedName,
          descripcion: descripcion?.trim() || existing.descripcion,
          color: color || existing.color
        };
        categories = state.categories.map((category) => (category.id === existing.id ? updated : category));
        created = updated;
      } else {
        const newCategory: Category = {
          id: generateId('cat'),
          nombre: sanitizedName,
          descripcion: descripcion?.trim() || undefined,
          color,
          productCount: state.allProducts.filter((product) => normalizeCategoryKey(product.categoria) === normalized).length,
          fechaCreacion: new Date()
        };
        categories = [...state.categories, newCategory].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
        created = newCategory;
      }

      persistCategories(categories);
      return { categories };
    });

    return created;
  },

  updateFilters: (changes) => {
    set((state) => {
      const filters = mergeFilters(state.filters, changes);
      const listing = buildListing(state.allProducts, filters, { ...state.pagination, currentPage: 1 });
      return {
        filters,
        products: listing.pageItems,
        pagination: listing.pagination
      };
    });
  },

  resetFilters: () => {
    set((state) => {
      const filters = createDefaultFilters();
      const listing = buildListing(state.allProducts, filters, { ...state.pagination, currentPage: 1 });
      return {
        filters,
        products: listing.pageItems,
        pagination: listing.pagination
      };
    });
  },

  changePage: (page) => {
    set((state) => {
      const listing = buildListing(state.allProducts, state.filters, { ...state.pagination, currentPage: page });
      return {
        products: listing.pageItems,
        pagination: listing.pagination
      };
    });
  },

  changeItemsPerPage: (size) => {
    set((state) => {
      const nextPagination = {
        ...state.pagination,
        currentPage: 1,
        itemsPerPage: Math.max(1, size)
      };
      const listing = buildListing(state.allProducts, state.filters, nextPagination);
      return {
        products: listing.pageItems,
        pagination: listing.pagination
      };
    });
  },

  importProducts: (rows) => {
    if (!rows?.length) {
      return { createdCount: 0, updatedCount: 0 };
    }

    const stats = { createdCount: 0, updatedCount: 0 };

    set((state) => {
      const nextProducts = [...state.allProducts];
      const indexByCode = new Map<string, number>();
      nextProducts.forEach((product, index) => {
        indexByCode.set(normalizeProductCode(product.codigo), index);
      });

      rows.forEach((row) => {
        const input = mapFormDataToInput(row);
        const codeKey = normalizeProductCode(input.codigo);
        if (!codeKey) {
          return;
        }
        if (indexByCode.has(codeKey)) {
          const index = indexByCode.get(codeKey)!;
          nextProducts[index] = buildProduct(nextProducts[index], input);
          stats.updatedCount += 1;
        } else {
          const created = buildProduct(undefined, input);
          nextProducts.push(created);
          indexByCode.set(codeKey, nextProducts.length - 1);
          stats.createdCount += 1;
        }
      });

      persistProducts(nextProducts);
      const categories = updateCategoriesAfterProductChange(state.categories, nextProducts);
      const listing = buildListing(nextProducts, state.filters, state.pagination);
      return {
        allProducts: nextProducts,
        categories,
        products: listing.pageItems,
        pagination: listing.pagination
      };
    });

    return stats;
  },

  addPackage: (input) => {
    let createdPackage: Package | undefined;
    set((state) => {
      const payload = buildPackage(undefined, input);
      const packages = [...state.packages, payload];
      createdPackage = payload;
      persistPackages(packages);
      return { packages };
    });
    return createdPackage!;
  },

  updatePackage: (id, changes) => {
    set((state) => {
      const index = state.packages.findIndex((pkg) => pkg.id === id);
      if (index === -1) {
        return state;
      }
      const updated = buildPackage(state.packages[index], changes);
      const packages = [...state.packages];
      packages[index] = updated;
      persistPackages(packages);
      return { packages };
    });
  },

  deletePackage: (id) => {
    set((state) => {
      if (!state.packages.some((pkg) => pkg.id === id)) {
        return state;
      }
      const packages = state.packages.filter((pkg) => pkg.id !== id);
      persistPackages(packages);
      return { packages };
    });
  }
}));

function createDefaultFilters(): FilterOptions {
  return {
    busqueda: '',
    categoria: '',
    unidad: '',
    marca: '',
    modelo: '',
    impuesto: '',
    ordenarPor: 'fechaCreacion',
    direccion: 'desc'
  };
}

function createDefaultPagination(): PaginationConfig {
  return {
    currentPage: 1,
    totalPages: 1,
    itemsPerPage: DEFAULT_ITEMS_PER_PAGE,
    totalItems: 0
  };
}

function buildListing(allProducts: Product[], filters: FilterOptions, pagination: PaginationConfig) {
  const filtered = applyFilters(allProducts, filters);
  const sorted = sortProducts(filtered, filters);
  const nextPagination = computePagination(sorted.length, pagination.itemsPerPage, pagination.currentPage);
  const start = (nextPagination.currentPage - 1) * nextPagination.itemsPerPage;
  const end = start + nextPagination.itemsPerPage;
  return {
    pageItems: sorted.slice(start, end),
    pagination: nextPagination
  };
}

function applyFilters(products: Product[], filters: FilterOptions): Product[] {
  const search = filters.busqueda.trim().toLowerCase();
  const hasSearch = search.length > 0;

  return products.filter((product) => {
    if (hasSearch) {
      const haystack = `${product.nombre} ${product.codigo} ${product.descripcion ?? ''}`.toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }

    if (filters.categoria && product.categoria !== filters.categoria) return false;
    if (filters.unidad && product.unidad !== filters.unidad) return false;
    if (filters.marca && (product.marca ?? '').toLowerCase() !== filters.marca.toLowerCase()) return false;
    if (filters.modelo && (product.modelo ?? '').toLowerCase() !== filters.modelo.toLowerCase()) return false;
    if (filters.impuesto && (product.impuesto ?? '').toLowerCase() !== filters.impuesto.toLowerCase()) return false;

    return true;
  });
}

function sortProducts(products: Product[], filters: FilterOptions): Product[] {
  const sorted = [...products];
  sorted.sort((a, b) => {
    let comparison = 0;
    switch (filters.ordenarPor) {
      case 'nombre':
        comparison = a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
        break;
      case 'fechaCreacion':
        comparison = (a.fechaCreacion?.getTime() ?? 0) - (b.fechaCreacion?.getTime() ?? 0);
        break;
      case 'fechaActualizacion':
        comparison = (a.fechaActualizacion?.getTime() ?? 0) - (b.fechaActualizacion?.getTime() ?? 0);
        break;
      default:
        comparison = (a.fechaCreacion?.getTime() ?? 0) - (b.fechaCreacion?.getTime() ?? 0);
        break;
    }
    return filters.direccion === 'asc' ? comparison : -comparison;
  });
  return sorted;
}

function computePagination(totalItems: number, itemsPerPage: number, requestedPage: number): PaginationConfig {
  const size = Math.max(1, itemsPerPage);
  const totalPages = Math.max(1, Math.ceil(Math.max(0, totalItems) / size) || 1);
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
  return {
    currentPage,
    totalPages,
    itemsPerPage: size,
    totalItems
  };
}

function mergeFilters(current: FilterOptions, changes: Partial<FilterOptions>): FilterOptions {
  return {
    ...current,
    ...changes
  };
}

function buildProduct(existing: Product | undefined, input: Partial<ProductInput>): Product {
  const now = new Date();
  const unidad = (input.unidad ?? existing?.unidad ?? 'NIU') as Product['unidad'];
  const producto: Product = {
    ...existing,
    ...input,
    id: existing?.id ?? generateId('prod'),
    codigo: (input.codigo ?? existing?.codigo ?? generateId('PROD')).trim(),
    nombre: (input.nombre ?? existing?.nombre ?? 'Producto sin nombre').trim(),
    unidad,
    tipoUnidadMedida: input.tipoUnidadMedida ?? existing?.tipoUnidadMedida ?? inferUnitMeasureType(unidad),
    precio: existing?.precio ?? 0,
    categoria: input.categoria ?? existing?.categoria ?? '',
    descripcion: input.descripcion ?? existing?.descripcion,
    imagen: resolveImageValue(input.imagen ?? existing?.imagen),
    impuesto: input.impuesto ?? existing?.impuesto ?? 'IGV (18.00%)',
    unidadesMedidaAdicionales: input.unidadesMedidaAdicionales ?? existing?.unidadesMedidaAdicionales ?? [],
    establecimientoIds: input.establecimientoIds ?? existing?.establecimientoIds ?? [],
    disponibleEnTodos: input.disponibleEnTodos ?? existing?.disponibleEnTodos ?? false,
    alias: input.alias ?? existing?.alias,
    precioCompra: toOptionalNumber(input.precioCompra, existing?.precioCompra),
    porcentajeGanancia: toOptionalNumber(input.porcentajeGanancia, existing?.porcentajeGanancia),
    codigoBarras: input.codigoBarras ?? existing?.codigoBarras,
    codigoFabrica: input.codigoFabrica ?? existing?.codigoFabrica,
    codigoSunat: input.codigoSunat ?? existing?.codigoSunat,
    descuentoProducto: toOptionalNumber(input.descuentoProducto, existing?.descuentoProducto),
    marca: input.marca ?? existing?.marca,
    modelo: input.modelo ?? existing?.modelo,
    peso: toOptionalNumber(input.peso, existing?.peso),
    tipoExistencia: input.tipoExistencia ?? existing?.tipoExistencia ?? 'MERCADERIAS',
    cantidad: toOptionalNumber(input.cantidad, existing?.cantidad),
    stockPorEstablecimiento: input.stockPorEstablecimiento ?? existing?.stockPorEstablecimiento,
    stockPorAlmacen: input.stockPorAlmacen ?? existing?.stockPorAlmacen,
    stockMinimoPorAlmacen: input.stockMinimoPorAlmacen ?? existing?.stockMinimoPorAlmacen,
    stockMaximoPorAlmacen: input.stockMaximoPorAlmacen ?? existing?.stockMaximoPorAlmacen,
    fechaCreacion: existing?.fechaCreacion ?? now,
    fechaActualizacion: now
  };

  return producto;
}

function buildPackage(existing: Package | undefined, input: Partial<PackageInput>): Package {
  const productos = input.productos ?? existing?.productos ?? [];
  const precio = typeof input.precio === 'number' ? input.precio : computePackagePrice(productos, input.descuento ?? existing?.descuento);

  return {
    id: existing?.id ?? generateId('pkg'),
    nombre: (input.nombre ?? existing?.nombre ?? 'Paquete').trim(),
    descripcion: input.descripcion?.trim() ?? existing?.descripcion,
    productos,
    precio,
    descuento: toOptionalNumber(input.descuento, existing?.descuento),
    imagen: resolveImageValue(input.imagen ?? existing?.imagen),
    fechaCreacion: existing?.fechaCreacion ?? new Date()
  };
}

function mapFormDataToInput(data: ProductFormData): ProductInput {
  return {
    nombre: data.nombre,
    codigo: data.codigo,
    unidad: data.unidad,
    tipoUnidadMedida: data.tipoUnidadMedida ?? inferUnitMeasureType(data.unidad),
    categoria: data.categoria?.trim() || '',
    descripcion: data.descripcion,
    impuesto: data.impuesto,
    imagen: typeof data.imagen === 'string' ? data.imagen : undefined,
    unidadesMedidaAdicionales: data.unidadesMedidaAdicionales ?? [],
    establecimientoIds: data.establecimientoIds ?? [],
    disponibleEnTodos: data.disponibleEnTodos ?? false,
    alias: data.alias,
    precioCompra: toOptionalNumber(data.precioCompra),
    porcentajeGanancia: toOptionalNumber(data.porcentajeGanancia),
    codigoBarras: data.codigoBarras,
    codigoFabrica: data.codigoFabrica,
    codigoSunat: data.codigoSunat,
    descuentoProducto: toOptionalNumber(data.descuentoProducto),
    marca: data.marca,
    modelo: data.modelo,
    peso: toOptionalNumber(data.peso),
    tipoExistencia: data.tipoExistencia ?? 'MERCADERIAS'
  };
}

function syncCategoriesWithProducts(existingCategories: Category[], products: Product[]): Category[] {
  const registry = new Map<string, Category>();

  existingCategories.forEach((category) => {
    const key = normalizeCategoryKey(category.nombre);
    if (!key) {
      return;
    }
    registry.set(key, { ...category, productCount: 0 });
  });

  products.forEach((product) => {
    const key = normalizeCategoryKey(product.categoria);
    if (!key) {
      return;
    }
    if (!registry.has(key)) {
      registry.set(key, {
        id: generateId('cat'),
        nombre: product.categoria,
        descripcion: undefined,
        color: undefined,
        productCount: 0,
        fechaCreacion: product.fechaCreacion ?? new Date()
      });
    }
    const current = registry.get(key)!;
    current.productCount += 1;
  });

  return Array.from(registry.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
}

function updateCategoriesAfterProductChange(categories: Category[], products: Product[]): Category[] {
  const updated = syncCategoriesWithProducts(categories, products);
  persistCategories(updated);
  return updated;
}

function removeProductFromPackages(packages: Package[], productId: string) {
  let changed = false;
  const sanitized = packages
    .map((pkg) => {
      const productos = pkg.productos.filter((item) => item.productId !== productId);
      if (productos.length === pkg.productos.length) {
        return pkg;
      }
      changed = true;
      return {
        ...pkg,
        productos,
        precio: computePackagePrice(productos, pkg.descuento)
      };
    })
    .filter((pkg) => pkg.productos.length > 0);

  return { packages: changed ? sanitized : packages, changed };
}

function computePackagePrice(items: Package['productos'], discount?: number): number {
  const subtotal = items.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0);
  if (!discount) {
    return subtotal;
  }
  return subtotal - (subtotal * discount) / 100;
}

function normalizeProductCode(code?: string): string {
  return (code ?? '').trim().toLowerCase();
}

function normalizeCategoryKey(value?: string): string {
  return (value ?? '').trim().toLowerCase();
}

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function toOptionalNumber(value: unknown, fallback?: number): number | undefined {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveImageValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
}

function persistProducts(products: Product[]) {
  if (!STORAGE_AVAILABLE) {
    return;
  }
  saveProductsToStorage(products);
}

function persistPackages(packages: Package[]) {
  if (!STORAGE_AVAILABLE) {
    return;
  }
  savePackagesToStorage(packages);
}

function persistCategories(categories: Category[]) {
  if (!STORAGE_AVAILABLE) {
    return;
  }
  saveCategoriesToStorage(categories);
}
