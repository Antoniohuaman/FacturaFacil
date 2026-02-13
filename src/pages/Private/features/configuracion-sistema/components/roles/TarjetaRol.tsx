import { Shield, Users, ChevronDown, ChevronRight, CheckCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { PermisoCatalogo, RolDelSistema } from '../../roles/tiposRolesPermisos';
import { MAPA_PERMISOS_POR_ID } from '../../roles/catalogoPermisos';

interface PropsTarjetaRol {
  rol: RolDelSistema;
  cantidadUsuarios?: number;
}

export function TarjetaRol({ rol, cantidadUsuarios = 0 }: PropsTarjetaRol) {
  const [showPermissions, setShowPermissions] = useState(false);
  const roleFocusId = rol.id || 'rol-sin-id';

  const permisosCatalogados = useMemo(() => {
    const permisos: PermisoCatalogo[] = [];
    rol.permisos.forEach((permisoId) => {
      const permiso = MAPA_PERMISOS_POR_ID[permisoId];
      if (permiso) {
        permisos.push(permiso);
      }
    });
    return permisos;
  }, [rol.permisos]);

  const permisosPorModulo = useMemo(() => {
    return permisosCatalogados.reduce<Record<string, PermisoCatalogo[]>>((acc, permiso) => {
      const clave = permiso.modulo;
      if (!acc[clave]) {
        acc[clave] = [];
      }
      acc[clave].push(permiso);
      return acc;
    }, {});
  }, [permisosCatalogados]);

  const ordenarModulos = (modulo: string) => {
    const orden = [
      'ventas',
      'clientes',
      'cobranzas',
      'caja',
      'inventario',
      'catalogo',
      'precios',
      'indicadores',
      'configuracion',
      'notificaciones',
    ];
    return orden.indexOf(modulo);
  };

  const obtenerNombreModulo = (modulo: string) => {
    switch (modulo) {
      case 'ventas':
        return 'Ventas';
      case 'clientes':
        return 'Clientes';
      case 'cobranzas':
        return 'Cobranzas';
      case 'caja':
        return 'Caja';
      case 'inventario':
        return 'Inventario';
      case 'catalogo':
        return 'Catalogo';
      case 'precios':
        return 'Precios';
      case 'indicadores':
        return 'Indicadores';
      case 'configuracion':
        return 'Configuracion';
      case 'notificaciones':
        return 'Notificaciones';
      default:
        return 'Otros';
    }
  };

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
      data-focus={`configuracion:roles:${roleFocusId}`}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3 flex-1">
            <div className={`
              flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
              bg-gradient-to-br from-blue-500 to-blue-600
            `}>
              <Shield className="w-5 h-5 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-base font-semibold text-gray-900">
                  {rol.nombre}
                </h3>
                <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                  Sistema
                </span>
              </div>

              <p className="text-xs text-gray-600 mb-3">
                {rol.descripcion}
              </p>

              {/* Stats */}
              <div className="flex items-center space-x-4 text-xs">
                <div className="flex items-center space-x-1 text-gray-600">
                  <Shield className="w-3.5 h-3.5" />
                  <span>{rol.permisos.length} permisos activos</span>
                </div>
                <div className="flex items-center space-x-1 text-gray-600">
                  <Users className="w-3.5 h-3.5" />
                  <span>{cantidadUsuarios} usuario{cantidadUsuarios !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Permissions Button */}
        <button
          onClick={() => setShowPermissions(!showPermissions)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-xs font-medium text-gray-700"
        >
          <span>{showPermissions ? 'Ocultar permisos detallados' : 'Ver permisos detallados'}</span>
          {showPermissions ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Permissions Details */}
      {showPermissions && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-3">
            {Object.entries(permisosPorModulo)
              .sort(([moduloA], [moduloB]) => ordenarModulos(moduloA) - ordenarModulos(moduloB))
              .map(([modulo, permisos]) => (
                <div key={modulo} className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-medium text-gray-700">
                      {obtenerNombreModulo(modulo)}
                    </h5>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      {permisos.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {permisos.map((permiso) => (
                      <div
                        key={permiso.id}
                        className="flex items-center space-x-2 text-xs px-2 py-1.5 rounded bg-green-50 text-green-700"
                      >
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        <span className="flex-1">{permiso.nombre}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
