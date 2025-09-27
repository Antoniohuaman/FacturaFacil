import { useState } from 'react';
import type { Column, Product, NewColumnForm, PriceForm } from '../models/PriceTypes';
import { 
  generateColumnId, 
  getNextOrder, 
  removeProductPricesForColumn 
} from '../utils/priceHelpers';

export const usePriceList = () => {
  const [columns, setColumns] = useState<Column[]>([
    { 
      id: 'P1', 
      name: 'Precio de venta al público', 
      mode: 'fixed', 
      visible: true, 
      isBase: true,
      order: 1
    },
    { 
      id: 'P2', 
      name: 'Precio mayorista', 
      mode: 'volume', 
      visible: true, 
      isBase: false,
      order: 2
    },
    { 
      id: 'P3', 
      name: 'Precio online (oculta)', 
      mode: 'fixed', 
      visible: false, 
      isBase: false,
      order: 3
    }
  ]);

  const [products, setProducts] = useState<Product[]>([
    { 
      sku: 'PROD001', 
      name: 'Producto Ejemplo 1', 
      prices: {
        P1: { value: 25.50, validFrom: '2024-01-01', validUntil: '2024-12-31' },
        P2: { value: 22.00, validFrom: '2024-01-01', validUntil: '2024-12-31' },
        P3: { value: 28.00, validFrom: '2024-01-01', validUntil: '2024-12-31' }
      }
    },
    { 
      sku: 'PROD002', 
      name: 'Producto Ejemplo 2', 
      prices: {
        P1: { value: 15.75, validFrom: '2024-01-01', validUntil: '2024-12-31' },
        P2: { value: 13.50, validFrom: '2024-01-01', validUntil: '2024-12-31' }
      }
    },
    {
      sku: 'LAP001',
      name: 'Laptop Dell XPS 13',
      prices: {
        P1: { value: 1250.00, validFrom: '2024-01-01', validUntil: '2024-12-31' },
        P2: { value: 1150.00, validFrom: '2024-01-01', validUntil: '2024-12-31' }
      }
    },
    {
      sku: 'MON001',
      name: 'Monitor Samsung 27" 4K',
      prices: {
        P1: { value: 350.00, validFrom: '2024-01-01', validUntil: '2024-12-31' },
        P2: { value: 320.00, validFrom: '2024-01-01', validUntil: '2024-12-31' }
      }
    },
    {
      sku: 'TEC001',
      name: 'Teclado Mecánico RGB',
      prices: {
        P1: { value: 89.99, validFrom: '2024-01-01', validUntil: '2024-12-31' },
        P2: { value: 75.00, validFrom: '2024-01-01', validUntil: '2024-12-31' }
      }
    },
    {
      sku: 'MOU001',
      name: 'Mouse Gaming Inalámbrico',
      prices: {
        P1: { value: 45.50, validFrom: '2024-01-01', validUntil: '2024-12-31' },
        P2: { value: 39.99, validFrom: '2024-01-01', validUntil: '2024-12-31' }
      }
    },
    {
      sku: 'CAM001',
      name: 'Cámara Web HD 1080p',
      prices: {
        P1: { value: 55.00, validFrom: '2024-01-01', validUntil: '2024-12-31' },
        P2: { value: 48.00, validFrom: '2024-01-01', validUntil: '2024-12-31' }
      }
    },
    {
      sku: 'AUD001',
      name: 'Audífonos Bluetooth Premium',
      prices: {
        P1: { value: 129.99, validFrom: '2024-01-01', validUntil: '2024-12-31' },
        P2: { value: 115.00, validFrom: '2024-01-01', validUntil: '2024-12-31' }
      }
    }
  ]);

  const [activeTab, setActiveTab] = useState<'columns' | 'products'>('columns');
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showProductPriceModal, setShowProductPriceModal] = useState(false);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchSKU, setSearchSKU] = useState('');

  // Computed values
  const filteredProducts = products.filter(product => {
    if (searchSKU === '') return true;
    
    const searchTerm = searchSKU.toLowerCase().trim();
    const skuMatch = product.sku.toLowerCase().includes(searchTerm);
    const nameMatch = product.name.toLowerCase().includes(searchTerm);
    
    return skuMatch || nameMatch;
  });

  // Column management functions
  const addColumn = (newColumnData: NewColumnForm) => {
    if (newColumnData.name.trim() && columns.length < 10) {
      const newId = generateColumnId(columns);
      const newOrder = getNextOrder(columns);
      
      const newColumn: Column = {
        id: newId,
        name: newColumnData.name.trim(),
        mode: newColumnData.mode,
        visible: newColumnData.visible,
        isBase: newColumnData.isBase && !columns.some(c => c.isBase),
        order: newOrder
      };
      
      setColumns([...columns, newColumn]);
      return true;
    }
    return false;
  };

  const deleteColumn = (columnId: string) => {
    const column = columns.find(c => c.id === columnId);
    if (column && !column.isBase) {
      setColumns(columns.filter(c => c.id !== columnId));
      setProducts(removeProductPricesForColumn(products, columnId));
      return true;
    }
    return false;
  };

  const toggleColumnVisibility = (columnId: string) => {
    setColumns(columns.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ));
  };

  const setBaseColumn = (columnId: string) => {
    setColumns(columns.map(col => ({
      ...col,
      isBase: col.id === columnId
    })));
  };

  const updateColumn = (columnId: string, updates: Partial<Column>) => {
    setColumns(columns.map(col => 
      col.id === columnId ? { ...col, ...updates } : col
    ));
  };

  // Product management functions
  const addOrUpdateProductPrice = (priceData: PriceForm) => {
    const { sku, columnId, value, validFrom, validUntil } = priceData;
    
    if (!sku.trim() || !columnId || !value || !validFrom || !validUntil) {
      return false;
    }

    const existingProductIndex = products.findIndex(p => p.sku === sku);
    
    const newPrice = {
      value: parseFloat(value),
      validFrom,
      validUntil
    };

    if (existingProductIndex >= 0) {
      // Update existing product
      const updatedProducts = [...products];
      updatedProducts[existingProductIndex] = {
        ...updatedProducts[existingProductIndex],
        prices: {
          ...updatedProducts[existingProductIndex].prices,
          [columnId]: newPrice
        }
      };
      setProducts(updatedProducts);
    } else {
      // Add new product
      const newProduct: Product = {
        sku: sku.trim(),
        name: `Producto ${sku}`, // This should come from a product catalog
        prices: {
          [columnId]: newPrice
        }
      };
      setProducts([...products, newProduct]);
    }
    
    return true;
  };

  // Modal management
  const openColumnModal = (column?: Column) => {
    setEditingColumn(column || null);
    setShowColumnModal(true);
  };

  const closeColumnModal = () => {
    setShowColumnModal(false);
    setEditingColumn(null);
  };

  const openPriceModal = (product?: Product) => {
    setSelectedProduct(product || null);
    setShowProductPriceModal(true);
  };

  const closePriceModal = () => {
    setShowProductPriceModal(false);
    setSelectedProduct(null);
  };

  return {
    // State
    columns,
    products,
    filteredProducts,
    activeTab,
    showColumnModal,
    showProductPriceModal,
    editingColumn,
    selectedProduct,
    searchSKU,

    // Actions
    setActiveTab,
    setSearchSKU,
    addColumn,
    deleteColumn,
    toggleColumnVisibility,
    setBaseColumn,
    updateColumn,
    addOrUpdateProductPrice,
    openColumnModal,
    closeColumnModal,
    openPriceModal,
    closePriceModal
  };
};