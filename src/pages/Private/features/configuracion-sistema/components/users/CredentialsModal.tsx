// src/features/configuration/components/users/CredentialsModal.tsx
import { useState } from 'react';
import { X, Copy, Check, User, Lock, Mail, Shield, Building2, MessageCircle } from 'lucide-react';
import { Button } from '@/contasis';
import type { User as UserModel } from '../../models/User';
import type { Establishment } from '../../models/Establishment';
import type { Role } from '../../models/Role';

interface CredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: {
    fullName: string;
    email: string;
    username: string;
    password: string;
  };
  user: UserModel;
  establishments: Establishment[];
}

export function CredentialsModal({ isOpen, onClose, credentials, user, establishments }: CredentialsModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  // Get user establishments
  const userEstablishments = establishments.filter(est =>
    user.assignment.establishmentIds.includes(est.id)
  );

  // Get user roles
  const userRoles = (user.systemAccess.roles || []) as Role[];

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyAll = async () => {
    const rolesText = userRoles.map(r => `  - ${r.name}`).join('\n');
    const establishmentsText = userEstablishments.map(e => `  - ${e.name}`).join('\n');

    const allCredentials = `
═══════════════════════════════════════
    CREDENCIALES DE ACCESO
═══════════════════════════════════════

Usuario: ${credentials.fullName}
Email: ${credentials.email}
Usuario: ${credentials.username}
Contraseña: ${credentials.password}

Roles Asignados:
${rolesText || '  - Ninguno'}

Establecimientos:
${establishmentsText || '  - Ninguno'}

═══════════════════════════════════════
⚠️  IMPORTANTE: Cambia tu contraseña en el primer inicio de sesión
`;

    try {
      await navigator.clipboard.writeText(allCredentials);
      setCopiedField('all');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy all:', err);
    }
  };

  const handleSendWhatsApp = () => {
    const rolesText = userRoles.map(r => `  - ${r.name}`).join('\n');
    const establishmentsText = userEstablishments.map(e => `  - ${e.name}`).join('\n');

    const message = `
═══════════════════════════════════════
    CREDENCIALES DE ACCESO
═══════════════════════════════════════

*Usuario:* ${credentials.fullName}
*Email:* ${credentials.email}
*Usuario:* ${credentials.username}
*Contraseña:* ${credentials.password}

*Roles Asignados:*
${rolesText || '  - Ninguno'}

*Establecimientos:*
${establishmentsText || '  - Ninguno'}

═══════════════════════════════════════
⚠️ *IMPORTANTE:* Cambia tu contraseña en el primer inicio de sesión
    `.trim();

    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Open WhatsApp with pre-filled message
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Check className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    ¡Usuario Creado Exitosamente!
                  </h2>
                  <p className="text-green-100 text-xs mt-0.5">
                    Las credenciales de acceso han sido generadas
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* User Info */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-lg font-bold">
                {credentials.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {credentials.fullName}
                </h3>
                <p className="text-sm text-gray-600">{credentials.email}</p>
              </div>
            </div>

            {/* Credentials */}
            <div className="space-y-3">
              {/* Username */}
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">
                  Usuario
                </label>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="font-mono text-base font-semibold text-gray-900">
                      {credentials.username}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(credentials.username, 'username')}
                    className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors group"
                    title="Copiar usuario"
                  >
                    {copiedField === 'username' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">
                  Contraseña Temporal
                </label>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1">
                    <Lock className="w-4 h-4 text-blue-600" />
                    <span className="font-mono text-base font-semibold text-gray-900 select-all">
                      {credentials.password}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(credentials.password, 'password')}
                    className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors group"
                    title="Copiar contraseña"
                  >
                    {copiedField === 'password' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Roles and Establishments Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Roles */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-4 h-4 text-purple-600" />
                <h4 className="text-sm font-semibold text-purple-900">Roles Asignados</h4>
              </div>
              {userRoles.length > 0 ? (
                <div className="space-y-1.5">
                  {userRoles.map((role) => (
                    <div
                      key={role.id}
                      className="bg-white border border-purple-200 rounded px-2 py-1.5"
                    >
                      <div className="text-xs font-medium text-purple-900">{role.name}</div>
                      <div className="text-[10px] text-purple-600 line-clamp-1">{role.description}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-purple-600 italic">Sin roles asignados</p>
              )}
            </div>

            {/* Establishments */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <h4 className="text-sm font-semibold text-indigo-900">Establecimientos</h4>
              </div>
              {userEstablishments.length > 0 ? (
                <div className="space-y-1.5">
                  {userEstablishments.map((establishment) => (
                    <div
                      key={establishment.id}
                      className="bg-white border border-indigo-200 rounded px-2 py-1.5"
                    >
                      <div className="text-xs font-medium text-indigo-900">{establishment.name}</div>
                      <div className="text-[10px] text-indigo-600 line-clamp-1">{establishment.address}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-indigo-600 italic">Sin establecimientos asignados</p>
              )}
            </div>
          </div>

          {/* Warning Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <div className="w-5 h-5 bg-amber-500 rounded flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-amber-900 mb-1">
                  Importante - Guarda estas credenciales
                </h4>
                <ul className="text-xs text-amber-800 space-y-0.5">
                  <li className="flex items-start">
                    <span className="mr-1.5">•</span>
                    <span>Esta es la única vez que verás la contraseña completa</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-1.5">•</span>
                    <span>El usuario debe cambiar su contraseña en el primer inicio de sesión</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-1.5">•</span>
                    <span>Comparte estas credenciales de forma segura</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-800">
            <p className="font-medium mb-1">📋 Resumen de Acceso</p>
            <ul className="space-y-0.5 text-[11px]">
              <li>✓ Credenciales de acceso generadas</li>
              <li>✓ {userRoles.length} rol(es) asignado(s)</li>
              <li>✓ {userEstablishments.length} establecimiento(s) asignado(s)</li>
              <li className="text-blue-600 mt-1">💡 Puedes modificar roles desde la lista de usuarios</li>
            </ul>
          </div>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex flex-col gap-2">
            {/* Main action buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleCopyAll}
                variant="primary"
                className="flex-1 shadow-lg shadow-blue-500/30"
              >
                {copiedField === 'all' ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span className="text-sm">¡Credenciales Copiadas!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span className="text-sm">Copiar Credenciales</span>
                  </>
                )}
              </Button>

              <Button
                onClick={handleSendWhatsApp}
                className="flex-1 bg-[#25D366] hover:bg-[#20BA5A] border-[#25D366] text-white rounded-lg transition-colors font-medium shadow-lg shadow-green-500/30"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm">Enviar por WhatsApp</span>
              </Button>
            </div>

            {/* Close button */}
            <Button
              variant="secondary"
              onClick={onClose}
              className="w-full"
            >
              <span className="text-sm">Cerrar</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
