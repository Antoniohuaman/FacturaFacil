// src/features/configuration/components/usuarios/ModalCredenciales.tsx
import { useState } from 'react';
import { X, Copy, Check, User, Lock, Shield, Building2, MessageCircle, Info, Mail } from 'lucide-react';
import { Button } from '@/contasis';
import { Tooltip } from '@/shared/ui';
import type { User as UserModel, AsignacionEmpresaUsuario } from '../../modelos/User';
import type { Establecimiento } from '../../modelos/Establecimiento';
import { useConfigurationContext } from '../../contexto/ContextoConfiguracion';
import { obtenerRolesPorIds } from '../../utilidades/permisos';

interface PropsModalCredenciales {
  isOpen: boolean;
  onClose: () => void;
  credentials: {
    fullName: string;
    email: string;
    username: string;
    password: string;
  };
  user: UserModel;
  Establecimientos: Establecimiento[];
}

export function ModalCredenciales({ isOpen, onClose, credentials, user, Establecimientos }: PropsModalCredenciales) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { rolesConfigurados } = useConfigurationContext();

  if (!isOpen) return null;

  // Get user Establecimientos
  const userEstablecimientos = Establecimientos.filter(est =>
    user.assignment.EstablecimientoIds.includes(est.id)
  );

  // Get user roles
  const userRoles = obtenerRolesPorIds(user.systemAccess.roleIds ?? [], rolesConfigurados);

  const mapaRoles = new Map(
    rolesConfigurados.map((rol) => [rol.id, rol.nombre]),
  );

  const mapaEstablecimientos = new Map(
    Establecimientos.map((establecimiento) => [establecimiento.id, establecimiento.nombreEstablecimiento]),
  );

  const normalizarEstablecimientosAsignacion = (asignacion: AsignacionEmpresaUsuario) => {
    if (asignacion.establecimientos?.length) {
      return asignacion.establecimientos;
    }

    const establecimientoIds = asignacion.establecimientoIds ?? [];
    const rolesPorEstablecimiento = asignacion.rolesPorEstablecimiento ?? {};
    const roleIds = asignacion.roleIds ?? [];

    if (Object.keys(rolesPorEstablecimiento).length > 0) {
      return establecimientoIds.map((establecimientoId) => ({
        establecimientoId,
        roleId: rolesPorEstablecimiento[establecimientoId] ?? '',
      }));
    }

    if (roleIds.length === 1) {
      return establecimientoIds.map((establecimientoId) => ({ establecimientoId, roleId: roleIds[0] }));
    }

    if (roleIds.length > 1 && establecimientoIds.length === 1) {
      return [{ establecimientoId: establecimientoIds[0], roleId: roleIds[0] }];
    }

    return establecimientoIds.map((establecimientoId) => ({ establecimientoId, roleId: '' }));
  };

  const construirAccesosAsignados = () => {
    const asignaciones = user.asignacionesPorEmpresa ?? [];

    if (asignaciones.length === 0) {
      return '(Sin accesos asignados)';
    }

    return asignaciones
      .map((asignacion) => {
        const nombreEmpresa = asignacion.empresaNombre
          ?? asignacion.empresaId
          ?? 'Empresa sin nombre';
        const establecimientosAsignacion = normalizarEstablecimientosAsignacion(asignacion);

        if (establecimientosAsignacion.length === 0) {
          return `- ${nombreEmpresa}\n  • Establecimiento sin nombre → Rol sin nombre`;
        }

        const lineasEstablecimientos = establecimientosAsignacion
          .map((item) => {
            const nombreEstablecimiento = mapaEstablecimientos.get(item.establecimientoId)
              ?? item.establecimientoId
              ?? 'Establecimiento sin nombre';
            const nombreRol = item.roleId
              ? mapaRoles.get(item.roleId) ?? 'Rol sin nombre'
              : 'Rol sin nombre';
            return `  • ${nombreEstablecimiento} → ${nombreRol}`;
          })
          .join('\n');

        return `- ${nombreEmpresa}\n${lineasEstablecimientos}`;
      })
      .join('\n');
  };

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      return;
    }
  };

  const buildCredentialsMessage = () => {
    const accesosAsignados = construirAccesosAsignados();

    return `
═══════════════════════════════
        CREDENCIALES DE ACCESO
═══════════════════════════════

Nombre: ${credentials.fullName}
Usuario (correo): ${credentials.email}
Contraseña: ${credentials.password}

ACCESOS ASIGNADOS
${accesosAsignados}

Recomendado: Actualiza tu contraseña después del primer inicio de sesión.
`.trim();
  };

  const handleCopyAll = async () => {
    const allCredentials = buildCredentialsMessage();

    try {
      await navigator.clipboard.writeText(allCredentials);
      setCopiedField('all');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      return;
    }
  };

  const handleSendWhatsApp = () => {
    const message = buildCredentialsMessage();

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent('Credenciales de acceso');
    const body = encodeURIComponent(buildCredentialsMessage());
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[60] p-3 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-emerald-600 px-4 py-3 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">
                    Usuario creado exitosamente
                  </h2>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-md transition-colors text-white flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-700 text-sm font-semibold">
                {credentials.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {credentials.fullName}
                </h3>
                <p className="text-xs text-gray-600">{credentials.email}</p>
              </div>
            </div>

            {/* Credentials */}
            <div className="space-y-2">
              {/* Username */}
              <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-200">
                <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide mb-1 block">
                  Usuario (correo)
                </label>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span className="font-mono text-sm font-semibold text-gray-900">
                      {credentials.email}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(credentials.email, 'username')}
                    className="p-1 hover:bg-emerald-50 rounded-md transition-colors group"
                    title="Copiar usuario"
                  >
                    {copiedField === 'username' ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400 group-hover:text-emerald-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-200">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                    Contraseña temporal
                  </label>
                  <Tooltip contenido="Solo se muestra una vez. Recomendada cambiar al primer inicio." ubicacion="arriba" multilinea>
                    <span className="inline-flex items-center text-gray-400">
                      <Info className="w-3.5 h-3.5" />
                    </span>
                  </Tooltip>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1">
                    <Lock className="w-4 h-4 text-emerald-600" />
                    <span className="font-mono text-sm font-semibold text-gray-900 select-all">
                      {credentials.password}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(credentials.password, 'password')}
                    className="p-1 hover:bg-emerald-50 rounded-md transition-colors group"
                    title="Copiar contraseña"
                  >
                    {copiedField === 'password' ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400 group-hover:text-emerald-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Tooltip contenido={userRoles.map(r => r.nombre).join('\n') || 'Sin roles asignados'} ubicacion="arriba" multilinea>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Shield className="w-3.5 h-3.5 text-gray-400" />
                  <span>{userRoles.length} rol(es)</span>
                </div>
              </Tooltip>
              <Tooltip contenido={userEstablecimientos.map(e => e.nombreEstablecimiento).join('\n') || 'Sin establecimientos'} ubicacion="arriba" multilinea>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  <span>{userEstablecimientos.length} establecimiento(s)</span>
                </div>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="flex-shrink-0 border-t border-gray-200 p-3 bg-gray-50">
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Tooltip contenido="Copiar credenciales" ubicacion="arriba">
                <Button
                  onClick={handleCopyAll}
                  variant="primary"
                  size="sm"
                  className="w-full"
                >
                  {copiedField === 'all' ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span className="text-xs">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span className="text-xs">Copiar</span>
                    </>
                  )}
                </Button>
              </Tooltip>

              <Tooltip contenido="Enviar por correo" ubicacion="arriba">
                <Button
                  onClick={handleSendEmail}
                  variant="primary"
                  size="sm"
                  className="w-full"
                >
                  <Mail className="w-4 h-4" />
                  <span className="text-xs">Correo</span>
                </Button>
              </Tooltip>

              <Tooltip contenido="Enviar por WhatsApp" ubicacion="arriba">
                <Button
                  onClick={handleSendWhatsApp}
                  size="sm"
                  className="w-full col-span-2 sm:col-span-1 bg-[#25D366] hover:bg-[#20BA5A] border-[#25D366] text-white rounded-lg transition-colors font-medium"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-xs">WhatsApp</span>
                </Button>
              </Tooltip>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="w-full"
            >
              <span className="text-xs">Cerrar</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
