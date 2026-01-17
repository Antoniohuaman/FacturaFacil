import React from 'react';

interface ProductActionsProps {
  loading: boolean;
  onCancel: () => void;
  onSubmit: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export const ProductActions: React.FC<ProductActionsProps> = ({ loading, onCancel, onSubmit }) => {
  return (
    <div className="flex justify-end space-x-3 px-5 py-3 bg-gray-50 border-t border-gray-200">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={loading}
        className="px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        style={{ backgroundColor: '#1478D4' }}
      >
        {loading ? (
          <div className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Guardando...
          </div>
        ) : (
          'Guardar'
        )}
      </button>
    </div>
  );
};
