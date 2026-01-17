// src/features/gestion-clientes/pages/ClientesTestPage.tsx
// Pagina de prueba para testear el servicio API de clientes con validacion

import { useState } from 'react';
import { clientesService, type Cliente, type CreateClienteDTO } from '@/services/api/clientes.service';
import { ApiError } from '@/services/api';
import { formValidation, commonRules, type Validators, FieldErrors, getInputErrorClass } from '@/utils';

type FormData = CreateClienteDTO;

const initialFormData: FormData = {
  nombre: '',
  email: '',
  telefono: '',
  direccion: '',
  ruc: '',
};

// Crear validadores iniciales
const createInitialValidators = (): Validators => ({
  nombre: formValidation.createFieldValidator([
    commonRules.required('El nombre es requerido'),
    commonRules.minLength(3, 'Minimo 3 caracteres'),
  ]),
  email: formValidation.createFieldValidator([
    commonRules.email('Email invalido'),
  ]),
  telefono: formValidation.createFieldValidator([
    commonRules.phone('Telefono invalido (9-12 digitos)'),
  ]),
  ruc: formValidation.createFieldValidator([
    commonRules.ruc('RUC invalido (11 digitos)'),
  ]),
  direccion: formValidation.createFieldValidator([]),
});

export default function ClientesTestPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [validators, setValidators] = useState<Validators>(createInitialValidators);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Validar campo en tiempo real
    const updatedValidators = formValidation.updateValidators(field, value, validators);
    setValidators(updatedValidators);
  };

  const validateForm = (): boolean => {
    const result = formValidation.isFormValid(validators, formData as unknown as Record<string, string>);
    if (result.validators) {
      setValidators({ ...result.validators });
    }
    return result.status;
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setValidators(createInitialValidators());
    setEditingId(null);
  };

  const handleFetchClientes = async () => {
    clearMessages();
    setLoading(true);
    try {
      const response = await clientesService.getAll({ page: 1, per_page: 10 });
      setClientes(response.data.data);
      setSuccess(`Se cargaron ${response.data.data.length} clientes`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    clearMessages();

    if (!validateForm()) {
      setError('Por favor corrige los errores del formulario');
      return;
    }

    setLoading(true);
    try {
      const response = await clientesService.create(formData);
      setClientes(prev => [...prev, response.data]);
      resetForm();
      setSuccess('Cliente creado exitosamente');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) {
          const updatedValidators = formValidation.updateErrorsFromServer(err.errors, validators);
          setValidators({ ...updatedValidators });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    clearMessages();
    if (!editingId) return;

    if (!validateForm()) {
      setError('Por favor corrige los errores del formulario');
      return;
    }

    setLoading(true);
    try {
      const response = await clientesService.update({ id: editingId, ...formData });
      setClientes(prev => prev.map(c => c.id === editingId ? response.data : c));
      resetForm();
      setSuccess('Cliente actualizado exitosamente');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) {
          const updatedValidators = formValidation.updateErrorsFromServer(err.errors, validators);
          setValidators({ ...updatedValidators });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    clearMessages();
    if (!confirm('Eliminar este cliente?')) return;

    setLoading(true);
    try {
      await clientesService.delete(id);
      setClientes(prev => prev.filter(c => c.id !== id));
      setSuccess('Cliente eliminado exitosamente');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingId(cliente.id);
    setFormData({
      nombre: cliente.nombre,
      email: cliente.email || '',
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || '',
      ruc: cliente.ruc || '',
    });
    setValidators(createInitialValidators());
  };

  const handleCancel = () => {
    resetForm();
    clearMessages();
  };

  // Clase base del input
  const inputBaseClass = "w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent";

  // Helper para clases de error
  const errorClass = (field: string) => getInputErrorClass({ field, validators });

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Test API Clientes (con Validacion)
        </h1>

        {/* Mensajes */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        {/* Formulario */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingId ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => handleInputChange('nombre', e.target.value)}
                className={`${inputBaseClass} ${errorClass('nombre')}`}
                placeholder="Nombre del cliente"
              />
              <FieldErrors field="nombre" validators={validators} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`${inputBaseClass} ${errorClass('email')}`}
                placeholder="email@ejemplo.com"
              />
              <FieldErrors field="email" validators={validators} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Telefono
              </label>
              <input
                type="text"
                value={formData.telefono}
                onChange={(e) => handleInputChange('telefono', e.target.value)}
                className={`${inputBaseClass} ${errorClass('telefono')}`}
                placeholder="999999999"
              />
              <FieldErrors field="telefono" validators={validators} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                RUC
              </label>
              <input
                type="text"
                value={formData.ruc}
                onChange={(e) => handleInputChange('ruc', e.target.value)}
                className={`${inputBaseClass} ${errorClass('ruc')}`}
                placeholder="20123456789"
              />
              <FieldErrors field="ruc" validators={validators} />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Direccion
              </label>
              <input
                type="text"
                value={formData.direccion}
                onChange={(e) => handleInputChange('direccion', e.target.value)}
                className={`${inputBaseClass} ${errorClass('direccion')}`}
                placeholder="Av. Ejemplo 123"
              />
              <FieldErrors field="direccion" validators={validators} />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            {editingId ? (
              <>
                <button
                  onClick={handleUpdate}
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Actualizando...' : 'Actualizar'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                onClick={handleCreate}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creando...' : 'Crear Cliente'}
              </button>
            )}
          </div>
        </div>

        {/* Lista de clientes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Lista de Clientes
            </h2>
            <button
              onClick={handleFetchClientes}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Cargando...' : 'Cargar Clientes'}
            </button>
          </div>

          {clientes.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No hay clientes. Haz clic en "Cargar Clientes" para obtener datos del API.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-500 dark:text-gray-400">ID</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-500 dark:text-gray-400">Nombre</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-500 dark:text-gray-400">Email</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-500 dark:text-gray-400">Telefono</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-gray-500 dark:text-gray-400">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((cliente) => (
                    <tr key={cliente.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-3 px-2 text-sm text-gray-900 dark:text-white">{cliente.id}</td>
                      <td className="py-3 px-2 text-sm text-gray-900 dark:text-white">{cliente.nombre}</td>
                      <td className="py-3 px-2 text-sm text-gray-600 dark:text-gray-300">{cliente.email || '-'}</td>
                      <td className="py-3 px-2 text-sm text-gray-600 dark:text-gray-300">{cliente.telefono || '-'}</td>
                      <td className="py-3 px-2 text-right">
                        <button
                          onClick={() => handleEdit(cliente)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm mr-3"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(cliente.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info del API y Validacion */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-200 dark:bg-gray-700 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Endpoints testeados:</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <li>GET /api/v1/clientes</li>
              <li>POST /api/v1/clientes</li>
              <li>PUT /api/v1/clientes/:id</li>
              <li>DELETE /api/v1/clientes/:id</li>
            </ul>
          </div>
          <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <h3 className="font-medium text-purple-900 dark:text-purple-200 mb-2">Validaciones activas:</h3>
            <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
              <li>Nombre: requerido, min 3 caracteres</li>
              <li>Email: formato valido</li>
              <li>Telefono: 9-12 digitos</li>
              <li>RUC: exactamente 11 digitos</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
