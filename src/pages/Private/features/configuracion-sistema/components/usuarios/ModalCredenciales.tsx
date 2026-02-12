// src/features/configuration/components/usuarios/ModalCredenciales.tsx
import { useState } from 'react';
import { X, Copy, Check, User, Lock, Shield, Building2, MessageCircle, Info } from 'lucide-react';
import { Button } from '@/contasis';
import { Tooltip } from '@/shared/ui';
import type { User as UserModel } from '../../modelos/User';
import type { Establecimiento } from '../../modelos/Establecimiento';
import type { Role } from '../../modelos/Role';

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

  if (!isOpen) return null;

  // Get user Establecimientos
  const userEstablecimientos = Establecimientos.filter(est =>
    user.assignment.EstablecimientoIds.includes(est.id)
  );

  // Get user roles
  const userRoles = (user.systemAccess.roles || []) as Role[];

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      return;
    }
  };

  const handleCopyAll = async () => {
    const rolesText = userRoles.map(r => `  - ${r.name}`).join('\n');
    const EstablecimientosText = userEstablecimientos.map(e => `  - ${e.nombreEstablecimiento}`).join('\n');

    const allCredentials = `
═══════════════════════════════════════
    CREDENCIALES DE ACCESO
═══════════════════════════════════════

Usuario: ${credentials.fullName}
Email: ${credentials.email}
Usuario: ${credentials.email}
Contraseña: ${credentials.password}

Roles Asignados:
${rolesText || '  - Ninguno'}

Establecimientos:
${EstablecimientosText || '  - Ninguno'}

═══════════════════════════════════════
⚠️  RECOMENDADO: Actualiza tu contraseña despues del primer inicio de sesion
`;

    try {
      await navigator.clipboard.writeText(allCredentials);
      setCopiedField('all');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      return;
    }
  };

  const handleSendWhatsApp = () => {
    const rolesText = userRoles.map(r => `  - ${r.name}`).join('\n');
    const EstablecimientosText = userEstablecimientos.map(e => `  - ${e.nombreEstablecimiento}`).join('\n');

    const message = `
═══════════════════════════════════════
    CREDENCIALES DE ACCESO
═══════════════════════════════════════

*Usuario:* ${credentials.fullName}
*Email:* ${credentials.email}
*Usuario:* ${credentials.email}
*Contraseña:* ${credentials.password}

*Roles Asignados:*
${rolesText || '  - Ninguno'}

*Establecimientos:*
${EstablecimientosText || '  - Ninguno'}

═══════════════════════════════════════
⚠️ *RECOMENDADO:* Actualiza tu contraseña despues del primer inicio de sesion
    `.trim();

    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);

    // Open WhatsApp with pre-filled message
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[60] p-3 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
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
                    Usuario creado
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
                  Usuario
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
              <Tooltip contenido={userRoles.map(r => r.name).join('\n') || 'Sin roles asignados'} ubicacion="arriba" multilinea>
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
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleCopyAll}
                variant="primary"
                size="sm"
                className="flex-1"
              >
                {copiedField === 'all' ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span className="text-xs">Credenciales copiadas</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span className="text-xs">Copiar credenciales</span>
                  </>
                )}
              </Button>

              <Button
                onClick={handleSendWhatsApp}
                size="sm"
                className="flex-1 bg-[#25D366] hover:bg-[#20BA5A] border-[#25D366] text-white rounded-lg transition-colors font-medium"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-xs">Enviar WhatsApp</span>
              </Button>
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
