import { ShoppingBag } from 'lucide-react';

export default function PaginaCompras() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-gray-500 dark:text-gray-400">
      <ShoppingBag size={48} strokeWidth={1.5} />
      <h1 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">Compras</h1>
      <p className="text-sm">Módulo en construcción.</p>
    </div>
  );
}
