import { useState, useRef, useEffect } from 'react';

export interface Product {
  id: number;
  code: string;
  name: string;
  price: number;
  category?: string;
  stock?: number;
  image?: string;
}

interface ProductSearchSelectorProps {
  products: Product[];
  multiple?: boolean;
  onSelect: (selected: Product[]) => void;
}

const ProductSearchSelector = ({ products, multiple = false, onSelect }: ProductSearchSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target) &&
          searchRef.current && !searchRef.current.contains(target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setShowDropdown(true);
  };

  const handleProductSelect = (product: Product) => {
    if (multiple) {
      setSelectedProducts(prev => {
        const exists = prev.find(p => p.id === product.id);
        if (exists) {
          return prev.filter(p => p.id !== product.id);
        } else {
          return [...prev, product];
        }
      });
    } else {
      setSelectedProducts([product]);
      setShowDropdown(false);
      setSearchTerm(product.name);
      onSelect([product]);
    }
  };

  const handleAddSelected = () => {
    onSelect(selectedProducts);
    setShowDropdown(false);
    setSearchTerm('');
  };

  return (
    <div className="relative w-full">
      <input
        ref={searchRef}
        type="text"
        value={multiple && selectedProducts.length > 0 ? `${selectedProducts.length} seleccionados` : searchTerm}
        onFocus={() => setShowDropdown(true)}
        onChange={handleSearchChange}
        placeholder="Buscar producto..."
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        readOnly={multiple && selectedProducts.length > 0}
      />
      {showDropdown && (
        <div ref={dropdownRef} className="absolute z-10 left-0 w-full mt-2 bg-white border border-gray-200 rounded shadow-lg max-h-64 overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <div className="p-4 text-gray-500 text-sm">No hay productos</div>
          ) : (
            filteredProducts.slice(0, 20).map(product => (
              <div key={product.id} className="flex items-center px-4 py-2 hover:bg-blue-50 cursor-pointer">
                {multiple ? (
                  <input
                    type="checkbox"
                    checked={!!selectedProducts.find(p => p.id === product.id)}
                    onChange={() => handleProductSelect(product)}
                    className="mr-2"
                  />
                ) : null}
                <span onClick={() => handleProductSelect(product)} className="flex-1">
                  {product.name} <span className="text-xs text-gray-400">({product.code})</span>
                </span>
                <span className="text-xs text-gray-500 ml-2">S/ {product.price.toFixed(2)}</span>
              </div>
            ))
          )}
          {multiple && (
            <div className="p-2 border-t border-gray-100 flex justify-end">
              <button
                onClick={handleAddSelected}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >Agregar</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductSearchSelector;
