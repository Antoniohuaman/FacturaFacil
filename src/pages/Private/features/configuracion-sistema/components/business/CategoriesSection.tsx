// src/features/configuracion-sistema/components/business/CategoriesSection.tsx

import { useState } from 'react';
import { Tag, Package, AlertTriangle, Pencil, Trash2, Plus } from 'lucide-react';
import { Button } from '@/contasis';

export interface Category {
  id: string;
  nombre: string;
  descripcion?: string;
  color?: string;
  productCount: number;
  fechaCreacion: Date;
}

interface CategoriesSectionProps {
  categories: Category[];
  onUpdate: (categories: Category[]) => Promise<void>;
}

export function CategoriesSection({ categories, onUpdate }: CategoriesSectionProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const colors = [
    { name: 'Rojo', value: '#ef4444' },
    { name: 'Azul', value: '#3b82f6' },
    { name: 'Verde', value: '#10b981' },
    { name: 'Amarillo', value: '#f59e0b' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Rosa', value: '#ec4899' },
    { name: 'Gris', value: '#6b7280' },
    { name: 'Naranja', value: '#f97316' }
  ];

  const filteredCategories = categories.filter(category =>
    category.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.descripcion?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setShowCreateModal(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setShowCreateModal(true);
  };

  const handleDeleteCategory = async (category: Category) => {
    if (category.productCount > 0) {
      alert(`No se puede eliminar la categoría "${category.nombre}" porque tiene ${category.productCount} productos asociados.`);
      return;
    }

    if (window.confirm(`¿Estás seguro de que quieres eliminar la categoría "${category.nombre}"?`)) {
      const updatedCategories = categories.filter(c => c.id !== category.id);
      await onUpdate(updatedCategories);
    }
  };

  const CategoryModal: React.FC<{ category?: Category; onClose: () => void }> = ({ category, onClose }) => {
    const [formData, setFormData] = useState({
      nombre: category?.nombre || '',
      descripcion: category?.descripcion || '',
      color: category?.color || '#ef4444'
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.nombre.trim()) return;

      let updatedCategories: Category[];

      if (category) {
        // Update existing category
        updatedCategories = categories.map(c =>
          c.id === category.id
            ? {
                ...c,
                nombre: formData.nombre,
                descripcion: formData.descripcion || undefined,
                color: formData.color
              }
            : c
        );
      } else {
        // Create new category
        const newCategory: Category = {
          id: `cat-${Date.now()}`,
          nombre: formData.nombre,
          descripcion: formData.descripcion || undefined,
          color: formData.color,
          productCount: 0,
          fechaCreacion: new Date()
        };
        updatedCategories = [...categories, newCategory];
      }

      await onUpdate(updatedCategories);
      onClose();
    };

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={onClose}
          />
          <div className="relative inline-block w-full max-w-md my-8 overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left align-middle shadow-xl transition-all transform">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {category ? 'Editar categoría' : 'Nueva categoría'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre <span className="text-blue-600 dark:text-blue-400 font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Nombre de la categoría"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Descripción opcional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                      className={`
                        w-full h-10 rounded-md border-2 transition-all
                        ${formData.color === color.value
                          ? 'border-gray-400 dark:border-gray-500 ring-2 ring-gray-300 dark:ring-gray-600'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }
                      `}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors"
                >
                  {category ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Categorías</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Organiza tus productos por categorías para mejor gestión
          </p>
        </div>

        <button
          onClick={handleCreateCategory}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva categoría
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Buscar categorías..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Tag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total categorías</dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-white">{categories.length}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Con productos</dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-white">
                  {categories.filter(cat => cat.productCount > 0).length}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Vacías</dt>
                <dd className="text-lg font-medium text-gray-900 dark:text-white">
                  {categories.filter(cat => cat.productCount === 0).length}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((category) => (
          <div
            key={category.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-6 hover:shadow-md dark:hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                  style={{ backgroundColor: category.color || '#ef4444' }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                    {category.nombre}
                  </h3>
                  {category.descripcion && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {category.descripcion}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleEditCategory(category)}
                  className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Editar categoría"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteCategory(category)}
                  className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title="Eliminar categoría"
                  disabled={category.productCount > 0}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Package className="w-4 h-4 mr-1" />
                {category.productCount} productos
              </div>

              <div className="text-xs text-gray-400 dark:text-gray-500">
                Creada {category.fechaCreacion.toLocaleDateString('es-PE', {
                  day: '2-digit',
                  month: 'short'
                })}
              </div>
            </div>

            {category.productCount > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      backgroundColor: category.color || '#ef4444',
                      width: `${Math.min((category.productCount / 10) * 100, 100)}%`
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <Tag className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {searchTerm ? 'No se encontraron categorías' : 'No hay categorías'}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm
              ? 'Intenta con otros términos de búsqueda'
              : 'Comienza creando tu primera categoría para organizar tus productos.'
            }
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <Button
                variant="primary"
                size="md"
                icon={<Plus />}
                iconPosition="left"
                onClick={handleCreateCategory}
              >
                Nueva categoría
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showCreateModal && (
        <CategoryModal
          category={editingCategory ?? undefined}
          onClose={() => {
            setShowCreateModal(false);
            setEditingCategory(null);
          }}
        />
      )}
    </div>
  );
}
