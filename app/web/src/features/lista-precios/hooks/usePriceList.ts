import { useState } from 'react';
import type { Column, Product, NewColumnForm, PriceForm, FixedPrice } from '../models/PriceTypes';
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
      name: 'Precio online', 
      mode: 'fixed', 
      visible: false, 
      isBase: false,
      order: 3
    }
  ]);

  const [products, setProducts] = useState<Product[]>([
    { 
      sku: 'PROD001', 
      name: 'Cable USB', 
      prices: {
        P1: { type: 'fixed', value: 25.50, validFrom: '2024-01-01', validUntil: '2024-12-31' },
        P2: { 
          type: 'volume',
          ranges: [
            { id: '1', minQuantity: 1, maxQuantity: 10, price: 22.00 },
            { id: '2', minQuantity: 11, maxQuantity: 50, price: 20.00 },
            { id: '3', minQuantity: 51, maxQuantity: null, price: 18.00 }
          ],
          validFrom: '2024-01-01', 
          validUntil: '2024-12-31' 
        },
        P3: { type: 'fixed', value: 28.00, validFrom: '2024-01-01', validUntil: '2024-12-31' }
      }
    },
    { 
      sku: 'PROD002', 
      name: 'Adaptador de memoria', 
      prices: {
        P1: { type: 'fixed', value: 15.75, validFrom: '2024-01-01', validUntil: '2024-12-31' },
        P2: { 
          type: 'volume',
          ranges: [
            { id: '1', minQuantity: 1, maxQuantity: 15, price: 13.50 },
            { id: '2', minQuantity: 16, maxQuantity: null, price: 12.00 }
          ],
          validFrom: '2024-01-01', 
          validUntil: '2024-12-31' 
        }
      }
    },
    {
      sku: 'LAP001',
      name: 'Laptop Dell XPS 13',
      prices: {
        P1: { type: 'fixed', value: 1250.00, validFrom: '2024-01-01', validUntil: '2024-12-31' },
        P2: { 
          type: 'volume',
          ranges: [
            { id: '1', minQuantity: 1, maxQuantity: 5, price: 1150.00 },
            { id: '2', minQuantity: 6, maxQuantity: null, price: 1050.00 }
          ],
          validFrom: '2024-01-01', 
          validUntil: '2024-12-31' 
        }
      }
    },
    {
      sku: 'MON001',
      name: 'Monitor Samsung 27" 4K',
      prices: {
        P1: { type: 'fixed', value: 350.00, validFrom: '2024-01-01', validUntil: '2024-12-31' },
        P2: { 
          type: 'volume',
          ranges: [
            { id: '1', minQuantity: 1, maxQuantity: 10, price: 320.00 },
            { id: '2', minQuantity: 11, maxQuantity: null, price: 300.00 }
          ],
          validFrom: '2024-01-01', 
          validUntil: '2024-12-31' 
        }
      }
    },
    {
      sku: 'TEC001',
      name: 'Teclado Mecánico RGB',
      prices: {
        P1: { type: 'fixed', value: 89.99, validFrom: '2024-01-01', validUntil: '2024-12-31' },
        P2: { 
          type: 'volume',
          ranges: [
            { id: '1', minQuantity: 1, maxQuantity: 20, price: 75.00 },
            { id: '2', minQuantity: 21, maxQuantity: null, price: 65.00 }
          ],
          validFrom: '2024-01-01', 
          validUntil: '2024-12-31' 
        }
      }
    },
    {
      sku: 'MOU001',
      name: 'Mouse Gaming Inalámbrico',
      prices: {
        P1: { type: 'fixed', value: 45.50, validFrom: '2024-01-01', validUntil: '2024-12-31' },
        P2: { 
          type: 'volume',
          ranges: [
            { id: '1', minQuantity: 1, maxQuantity: 25, price: 39.99 },
            { id: '2', minQuantity: 26, maxQuantity: null, price: 35.00 }
          ],
          validFrom: '2024-01-01', 
          validUntil: '2024-12-31' 
        }
      }
    },
    {
      sku: 'CAM001',
      name: 'Cámara Web HD 1080p',
      prices: {
        P1: { type: 'fixed', value: 55.00, validFrom: '2024-01-01', validUntil: '2024-12-31' },
        P2: { 
          type: 'volume',
          ranges: [
            { id: '1', minQuantity: 1, maxQuantity: 12, price: 48.00 },
            { id: '2', minQuantity: 13, maxQuantity: null, price: 42.00 }
          ],
          validFrom: '2024-01-01', 
          validUntil: '2024-12-31' 
        }
      }
    },
    {
      sku: 'AUD001',
      name: 'Audífonos Bluetooth Premium',
      prices: {
        P1: { type: 'fixed', value: 129.99, validFrom: '2024-01-01', validUntil: '2024-12-31' },
        P2: { 
          type: 'volume',
          ranges: [
            { id: '1', minQuantity: 1, maxQuantity: 8, price: 115.00 },
            { id: '2', minQuantity: 9, maxQuantity: null, price: 105.00 }
          ],
          validFrom: '2024-01-01', 
          validUntil: '2024-12-31' 
        }
      }
    }
  ]);

  const [activeTab, setActiveTab] = useState<'columns' | 'products'>('columns');
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showProductPriceModal, setShowProductPriceModal] = useState(false);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchSKU, setSearchSKU] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computed values
  const filteredProducts = products.filter(product => {
    if (searchSKU === '') return true;
    
    const searchTerm = searchSKU.toLowerCase().trim();
    const skuMatch = product.sku.toLowerCase().includes(searchTerm);
    const nameMatch = product.name.toLowerCase().includes(searchTerm);
    
    return skuMatch || nameMatch;
  });

  // Column management functions
  const addColumn = async (newColumnData: NewColumnForm) => {
    if (newColumnData.name.trim() && columns.length < 10) {
      setLoading(true);
      setError(null);
      
      try {
        // Simular operación async
        await new Promise(resolve => setTimeout(resolve, 500));
        
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
      } catch (err) {
        setError('Error al agregar columna');
        return false;
      } finally {
        setLoading(false);
      }
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
    const { sku, columnId, validFrom, validUntil } = priceData;
    
    if (!sku.trim() || !columnId || !validFrom || !validUntil) {
      return false;
    }

    // Extract value based on type
    let value: string;
    if (priceData.type === 'fixed') {
      value = priceData.value;
    } else {
      // For volume pricing, we'll need a different approach
      return false; // For now, only support fixed prices
    }

    if (!value) {
      return false;
    }

    const existingProductIndex = products.findIndex(p => p.sku === sku);
    
    const newPrice: FixedPrice = {
      type: 'fixed',
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
    loading,
    error,
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