import { useMemo, useRef, useState } from 'react';
import { Checkbox } from '@/contasis';
import type { PermisoCatalogo, RolPersonalizado } from '../../roles/tiposRolesPermisos';

interface FormularioRolPersonalizadoProps {
  rol?: RolPersonalizado;
  permisosDisponibles: PermisoCatalogo[];
  onGuardar: (rol: Omit<RolPersonalizado, 'tipo'>) => boolean | Promise<boolean>;
  onCancelar: () => void;
  errorExterno?: string | null;
}

export function FormularioRolPersonalizado({
  rol,
  permisosDisponibles,
  onGuardar,
  onCancelar,
  errorExterno,
}: FormularioRolPersonalizadoProps) {
  const nombreInputRef = useRef<HTMLInputElement | null>(null);
  const [nombre, setNombre] = useState(rol?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(rol?.descripcion ?? '');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionados, setSeleccionados] = useState<Set<string>>(
    new Set(rol?.permisos ?? []),
  );
  const [error, setError] = useState<string | null>(null);
  const [errorPermisos, setErrorPermisos] = useState<string | null>(null);
  const [crearOtro, setCrearOtro] = useState(false);

  const permisosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return permisosDisponibles.filter((permiso) => {
      if (!texto) return true;
      return [permiso.nombre, permiso.descripcion, permiso.id, permiso.modulo]
        .filter(Boolean)
        .some((valor) => valor.toLowerCase().includes(texto));
    });
  }, [busqueda, permisosDisponibles]);

  const permisosPorModulo = useMemo(() => {
    return permisosFiltrados.reduce<Record<string, PermisoCatalogo[]>>((acc, permiso) => {
      const clave = permiso.modulo;
      if (!acc[clave]) {
        acc[clave] = [];
      }
      acc[clave].push(permiso);
      return acc;
    }, {});
  }, [permisosFiltrados]);

  const togglePermiso = (permisoId: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(permisoId)) {
        next.delete(permisoId);
      } else {
        next.add(permisoId);
      }
      if (next.size > 0) {
        setErrorPermisos(null);
      }
      return next;
    });
  };

  const handleGuardar = async () => {
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      setError('El nombre del rol es obligatorio');
      return;
    }

    if (seleccionados.size === 0) {
      setErrorPermisos('Selecciona al menos 1 permiso para crear el rol.');
      return;
    }

    setError(null);
    setErrorPermisos(null);
    const guardado = await Promise.resolve(onGuardar({
      id: rol?.id ?? '',
      nombre: nombreLimpio,
      descripcion: descripcion.trim() || 'Rol personalizado',
      permisos: Array.from(seleccionados),
    }));

    if (!guardado) return;

    if (rol || !crearOtro) {
      onCancelar();
      return;
    }

    setNombre('');
    setDescripcion('');
    setBusqueda('');
    setSeleccionados(new Set());
    setError(null);
    setErrorPermisos(null);
    requestAnimationFrame(() => nombreInputRef.current?.focus());
  };

  const puedeGuardar = nombre.trim().length > 0 && seleccionados.size > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {rol ? 'Editar rol personalizado' : 'Crear rol personalizado'}
            </h3>
            <p className="text-xs text-gray-500">
              Selecciona los permisos que tendra este rol.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelar}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cerrar
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {(error || errorExterno) && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error ?? errorExterno}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Nombre *</label>
              <input
                type="text"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Supervisor de ventas"
                ref={nombreInputRef}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Descripcion</label>
              <input
                type="text"
                value={descripcion}
                onChange={(event) => setDescripcion(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Rol con acceso parcial a ventas"
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Buscar permiso por nombre o modulo"
              />
            </div>
            <div className="text-xs text-gray-500">
              {seleccionados.size} permiso{seleccionados.size !== 1 ? 's' : ''} seleccionado{seleccionados.size !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="space-y-4">
            {Object.entries(permisosPorModulo).map(([modulo, permisos]) => (
              <div key={modulo} className="border border-gray-200 rounded-lg">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-700 capitalize">{modulo}</p>
                </div>
                <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {permisos.map((permiso) => (
                    <label
                      key={permiso.id}
                      className="flex items-start gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={seleccionados.has(permiso.id)}
                        onChange={() => togglePermiso(permiso.id)}
                        className="mt-1"
                      />
                      <span>
                        <span className="font-medium">{permiso.nombre}</span>
                        <span className="block text-xs text-gray-500">{permiso.descripcion}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {errorPermisos && (
              <p className="text-sm text-red-600">
                {errorPermisos}
              </p>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {!rol && (
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <Checkbox
                checked={crearOtro}
                onChange={() => setCrearOtro((prev) => !prev)}
                size="sm"
              />
              <span>Crear otro</span>
            </label>
          )}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancelar}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGuardar}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                puedeGuardar
                  ? 'text-white bg-blue-600 hover:bg-blue-700'
                  : 'text-gray-400 bg-gray-200 cursor-not-allowed'
              }`}
              disabled={!puedeGuardar}
            >
              {rol ? 'Guardar cambios' : 'Crear rol'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
