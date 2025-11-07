// src/features/inventario/components/panels/SummaryCards.tsx

import React, { useMemo } from 'react';
import type { Product } from '../../../catalogo-articulos/models/types';

interface SummaryCardsProps {
  products: Product[];
  warehouseFiltro?: string;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({
  products,
  warehouseFiltro
}) => {
  // Calcular estadísticas basadas en el filtro de almacén
  const stats = useMemo(() => {
    let totalProductos = 0;
    let totalStock = 0;
    let productosSinStock = 0;
    let productosStockBajo = 0;
    let valorTotalStock = 0;

    if (!warehouseFiltro || warehouseFiltro === 'todos') {
      // Sin filtro: calcular estadísticas de todos los almacenes
      totalProductos = products.length;

      products.forEach(product => {
        // Sumar stock de todos los almacenes
        const stockPorAlmacen = product.stockPorAlmacen || {};
        const stockTotal = Object.values(stockPorAlmacen).reduce((sum, qty) => sum + (qty || 0), 0);

        totalStock += stockTotal;
        valorTotalStock += stockTotal * product.precio;

        if (stockTotal === 0) {
          productosSinStock++;
        }

        // Verificar stock bajo en al menos un almacén
        const stockMinimos = product.stockMinimoPorAlmacen || {};
        const tieneStockBajo = Object.entries(stockPorAlmacen).some(([whId, stock]) => {
          const minimo = stockMinimos[whId] || 0;
          return minimo > 0 && stock < minimo && stock > 0;
        });

        if (tieneStockBajo) {
          productosStockBajo++;
        }
      });
    } else {
      // Con filtro: calcular estadísticas del almacén específico
      totalProductos = products.length;

      products.forEach(product => {
        const stockEnAlmacen = product.stockPorAlmacen?.[warehouseFiltro] ?? 0;
        const stockMinimo = product.stockMinimoPorAlmacen?.[warehouseFiltro] ?? 0;

        totalStock += stockEnAlmacen;
        valorTotalStock += stockEnAlmacen * product.precio;

        if (stockEnAlmacen === 0) {
          productosSinStock++;
        } else if (stockMinimo > 0 && stockEnAlmacen < stockMinimo) {
          productosStockBajo++;
        }
      });
    }

    return {
      totalProductos,
      totalStock,
      productosSinStock,
      productosStockBajo,
      valorTotalStock
    };
  }, [products, warehouseFiltro]);

  const cards = [
    {
      title: 'Total Productos',
      value: stats.totalProductos,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4M4 7v10l8 4" />
        </svg>
      ),
      color: 'blue',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30'
    },
    {
      title: 'Stock Total',
      value: stats.totalStock.toLocaleString(),
      subtitle: 'unidades',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      color: 'green',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-600 dark:text-green-400',
      iconBg: 'bg-green-100 dark:bg-green-900/30'
    },
    {
      title: 'Valor Total Stock',
      value: `S/ ${stats.valorTotalStock.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'purple',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      textColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-100 dark:bg-purple-900/30'
    },
    {
      title: 'Sin Stock',
      value: stats.productosSinStock,
      subtitle: 'productos',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      color: 'red',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      textColor: 'text-red-600 dark:text-red-400',
      iconBg: 'bg-red-100 dark:bg-red-900/30'
    },
    {
      title: 'Stock Bajo',
      value: stats.productosStockBajo,
      subtitle: 'productos',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
      ),
      color: 'yellow',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      textColor: 'text-yellow-600 dark:text-yellow-400',
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/30'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`${card.bgColor} rounded-lg p-6 border border-${card.color}-200 dark:border-${card.color}-700 hover:shadow-md transition-shadow`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`${card.iconBg} p-3 rounded-lg`}>
              <div className={card.textColor}>
                {card.icon}
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{card.title}</p>
            <div className="flex items-baseline space-x-2">
              <p className={`text-2xl font-bold ${card.textColor}`}>
                {card.value}
              </p>
              {card.subtitle && (
                <span className="text-sm text-gray-500 dark:text-gray-400">{card.subtitle}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;
