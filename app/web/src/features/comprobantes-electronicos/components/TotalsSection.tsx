import React from 'react';

interface TotalsSectionProps {
  totals: {
    subtotal: number;
    igv: number;
    total: number;
  };
}

const TotalsSection: React.FC<TotalsSectionProps> = ({ totals }) => {
  return (
    <div className="mt-6 border-t border-gray-200 pt-6">
      <div className="flex justify-end">
        <div className="w-96 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Descuentos</span>
            <div className="flex items-center space-x-2">
              <span className="text-gray-900">S/</span>
              <input 
                type="number" 
                value="0" 
                className="w-16 px-2 py-1 text-right text-sm border border-gray-300 rounded" 
                readOnly 
              />
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="text-gray-900">S/ {totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">I.G.V.</span>
            <span className="text-gray-900">S/ {totals.igv.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Redondeo</span>
            <div className="flex items-center space-x-2">
              <span className="text-gray-900">S/</span>
              <input 
                type="number" 
                value="0" 
                className="w-16 px-2 py-1 text-right text-sm border border-gray-300 rounded" 
                readOnly 
              />
            </div>
          </div>
          <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-3">
            <span className="text-gray-900">Total</span>
            <span className="text-gray-900">S/ {totals.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TotalsSection;