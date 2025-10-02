// src/features/catalogo-articulos/components/StockSummaryCards.tsx

import React from 'react';
import type { Product } from '../models/types';

interface StockSummaryCardsProps {
  products: Product[];
}

const StockSummaryCards: React.FC<StockSummaryCardsProps> = ({ products }) => {
  // Calcular estadísticas
  const totalProductos = products.length;
  const totalStock = products.reduce((sum, p) => sum + p.cantidad, 0);
  const productosSinStock = products.filter(p => p.cantidad === 0).length;
  const productosStockBajo = products.filter(p => p.cantidad > 0 && p.cantidad < 10).length;
  
  const valorTotalStock = products.reduce((sum, p) => {
    const precioCompra = p.precioCompra || p.precio;
    return sum + (precioCompra * p.cantidad);
  }, 0);

  const cards = [
    {
      title: 'Total Productos',
      value: totalProductos,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4M4 7v10l8 4" />
        </svg>
      ),
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      iconBg: 'bg-blue-100'
    },
    {
      title: 'Stock Total',
      value: totalStock.toLocaleString(),
      subtitle: 'unidades',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      iconBg: 'bg-green-100'
    },
    {
      title: 'Valor Total Stock',
      value: `S/ ${valorTotalStock.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'purple',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      iconBg: 'bg-purple-100'
    },
    {
      title: 'Sin Stock',
      value: productosSinStock,
      subtitle: 'productos',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      color: 'red',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
      iconBg: 'bg-red-100'
    },
    {
      title: 'Stock Bajo',
      value: productosStockBajo,
      subtitle: 'productos',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
      ),
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
      iconBg: 'bg-yellow-100'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`${card.bgColor} rounded-lg p-6 border border-${card.color}-200 hover:shadow-md transition-shadow`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`${card.iconBg} p-3 rounded-lg`}>
              <div className={card.textColor}>
                {card.icon}
              </div>
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
            <div className="flex items-baseline space-x-2">
              <p className={`text-2xl font-bold ${card.textColor}`}>
                {card.value}
              </p>
              {card.subtitle && (
                <span className="text-sm text-gray-500">{card.subtitle}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StockSummaryCards;
