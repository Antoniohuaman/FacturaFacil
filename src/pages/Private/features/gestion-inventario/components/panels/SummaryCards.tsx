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
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4M4 7v10l8 4" />
        </svg>
      ),
      bgColor: 'bg-[#6F36FF]/10 dark:bg-[#6F36FF]/15',
      textColor: 'text-[#6F36FF] dark:text-[#8B5CF6]',
      iconBg: 'bg-[#6F36FF]/15 dark:bg-[#6F36FF]/20',
      borderColor: 'border-[#6F36FF]/30 dark:border-[#6F36FF]/40'
    },
    {
      title: 'Stock Total',
      value: stats.totalStock.toLocaleString(),
      subtitle: 'unidades',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      bgColor: 'bg-[#10B981]/10 dark:bg-[#10B981]/15',
      textColor: 'text-[#10B981] dark:text-[#34D399]',
      iconBg: 'bg-[#10B981]/15 dark:bg-[#10B981]/20',
      borderColor: 'border-[#10B981]/30 dark:border-[#10B981]/40'
    },
    {
      title: 'Valor Total Stock',
      value: `S/ ${stats.valorTotalStock.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bgColor: 'bg-[#3B82F6]/10 dark:bg-[#3B82F6]/15',
      textColor: 'text-[#3B82F6] dark:text-[#60A5FA]',
      iconBg: 'bg-[#3B82F6]/15 dark:bg-[#3B82F6]/20',
      borderColor: 'border-[#3B82F6]/30 dark:border-[#3B82F6]/40'
    },
    {
      title: 'Sin Stock',
      value: stats.productosSinStock,
      subtitle: 'productos',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      bgColor: 'bg-[#EF4444]/10 dark:bg-[#EF4444]/15',
      textColor: 'text-[#EF4444] dark:text-[#F87171]',
      iconBg: 'bg-[#EF4444]/15 dark:bg-[#EF4444]/20',
      borderColor: 'border-[#EF4444]/30 dark:border-[#EF4444]/40'
    },
    {
      title: 'Stock Bajo',
      value: stats.productosStockBajo,
      subtitle: 'productos',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
      ),
      bgColor: 'bg-[#D97706]/10 dark:bg-[#D97706]/15',
      textColor: 'text-[#D97706] dark:text-[#F59E0B]',
      iconBg: 'bg-[#D97706]/15 dark:bg-[#D97706]/20',
      borderColor: 'border-[#D97706]/30 dark:border-[#D97706]/40'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`${card.bgColor} rounded-lg p-4 border ${card.borderColor} hover:shadow-md transition-all duration-150`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`${card.iconBg} p-2 rounded-lg`}>
              <div className={card.textColor}>
                {card.icon}
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-[#4B5563] dark:text-gray-400 mb-1">{card.title}</p>
            <div className="flex items-baseline gap-1.5">
              <p className={`text-xl font-bold ${card.textColor} tabular-nums`}>
                {card.value}
              </p>
              {card.subtitle && (
                <span className="text-xs text-[#4B5563] dark:text-gray-400">{card.subtitle}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;
