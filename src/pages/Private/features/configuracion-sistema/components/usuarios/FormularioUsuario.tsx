// src/features/configuration/components/usuarios/UserForm.tsx
import { useState, useEffect, useMemo } from 'react';
import { X, User, Mail, Phone, FileText, AlertCircle, Building2, Lock, Eye, EyeOff, RefreshCw, Copy, Check } from 'lucide-react';
import { Button, Select, Input, Checkbox } from '@/contasis';
import type { Empresa } from '../../../autenticacion/types/auth.types';
import type { User as UsuarioModelo, AsignacionEmpresaUsuario, EstadoAsignacionUsuario } from '../../modelos/User';
import { SYSTEM_ROLES } from '../../modelos/Role';
import {
  construirResumenLista,
  normalizarCorreo,
  obtenerAsignacionesActualizadas,
  obtenerAsignacionesUsuario,
} from '../../utilidades/usuariosAsignaciones';

type DatosFormularioUsuario = {
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  tipoDocumento: 'DNI' | 'CE' | 'PASSPORT' | '';
  numeroDocumento: string;
  contrasena: string;
  asignacionesPorEmpresa: AsignacionEmpresaUsuario[];
};

interface PropsFormularioUsuario {
  usuario?: UsuarioModelo;
  empresasDisponibles: Empresa[];
  empresaActual?: Empresa | null;
  correosExistentes: string[];
  alEnviar: (data: DatosFormularioUsuario) => Promise<void>;
  alCancelar: () => void;
  cargando?: boolean;
}

const tiposDocumento = [
  { value: 'DNI' as const, label: 'DNI', placeholder: '12345678', maxLength: 8 },
  { value: 'CE' as const, label: 'Carnet de Extranjería', placeholder: '123456789', maxLength: 9 },
  { value: 'PASSPORT' as const, label: 'Pasaporte', placeholder: 'A1234567', maxLength: 12 }
];

const opcionesEstadoAsignacion: Array<{ value: EstadoAsignacionUsuario; label: string }> = [
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'INACTIVE', label: 'Inactivo' },
];

const generarContrasenaSegura = (): string => {
  const length = 12;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%&*';

  const allChars = uppercase + lowercase + numbers + symbols;
  let password = '';

  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill the rest
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

const calcularFortalezaContrasena = (contrasena: string): { score: number; label: string; color: string } => {
  if (!contrasena) return { score: 0, label: 'Sin contraseña', color: 'gray' }

  let score = 0;

  if (contrasena.length >= 8) score += 1;
  if (contrasena.length >= 12) score += 1;

  if (/[a-z]/.test(contrasena)) score += 1;
  if (/[A-Z]/.test(contrasena)) score += 1;
  if (/[0-9]/.test(contrasena)) score += 1;
  const hasSymbol = /[!@#$%^&*()_+=\]{};':"\\|,.<>/?-]/.test(contrasena) || /\[/.test(contrasena);
  if (hasSymbol) score += 1;

  if (score <= 2) return { score, label: 'Débil', color: 'red' }
  if (score <= 4) return { score, label: 'Media', color: 'yellow' }
  return { score, label: 'Fuerte', color: 'green' }
}

export function FormularioUsuario({
  usuario,
  empresasDisponibles,
  empresaActual,
  correosExistentes,
  alEnviar,
  alCancelar,
  cargando = false
}: PropsFormularioUsuario) {
  const [datosFormulario, setDatosFormulario] = useState<DatosFormularioUsuario>({
    nombres: '',
    apellidos: '',
    correo: '',
    telefono: '',
    tipoDocumento: '',
    numeroDocumento: '',
    contrasena: generarContrasenaSegura(),
    asignacionesPorEmpresa: [],
  });

  const [errores, setErrores] = useState<Record<string, string>>({});
  const [erroresPorEmpresa, setErroresPorEmpresa] = useState<Record<string, { establecimientos?: string; roles?: string }>>({});
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [contrasenaCopiada, setContrasenaCopiada] = useState(false);

  const empresasOrdenadas = useMemo(
    () => [...empresasDisponibles].sort((a, b) => a.razonSocial.localeCompare(b.razonSocial)),
    [empresasDisponibles],
  );

  useEffect(() => {
    if (!usuario) return;

    const asignaciones = obtenerAsignacionesUsuario(
      usuario,
      empresaActual?.id,
      empresaActual?.razonSocial ?? empresaActual?.nombreComercial,
    );

    setDatosFormulario({
      nombres: usuario.personalInfo.firstName,
      apellidos: usuario.personalInfo.lastName,
      correo: usuario.personalInfo.email,
      telefono: usuario.personalInfo.phone || '',
      tipoDocumento: usuario.personalInfo.documentType || '',
      numeroDocumento: usuario.personalInfo.documentNumber || '',
      contrasena: '',
      asignacionesPorEmpresa: asignaciones,
    });
  }, [empresaActual?.id, empresaActual?.nombreComercial, empresaActual?.razonSocial, usuario]);

  useEffect(() => {
    if (usuario) return;
    if (empresasOrdenadas.length !== 1) return;
    if (datosFormulario.asignacionesPorEmpresa.length > 0) return;

    const empresa = empresasOrdenadas[0];
    setDatosFormulario((prev) => ({
      ...prev,
      asignacionesPorEmpresa: [
        {
          empresaId: empresa.id,
          empresaNombre: empresa.razonSocial,
          establecimientos: [],
          estado: 'ACTIVE',
        },
      ],
    }));
  }, [datosFormulario.asignacionesPorEmpresa.length, empresasOrdenadas, usuario]);

  const validarCampo = (
    campo: keyof DatosFormularioUsuario,
    valor: DatosFormularioUsuario[keyof DatosFormularioUsuario]
  ): string | null => {
    switch (campo) {
      case 'nombres': {
        const nombres = typeof valor === 'string' ? valor : '';
        if (!nombres || nombres.trim().length < 2) {
          return 'Los nombres son obligatorios';
        }
        if (!/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/.test(nombres.trim())) {
          return 'Los nombres solo pueden contener letras y espacios';
        }
        break;
      }
      case 'apellidos': {
        const apellidos = typeof valor === 'string' ? valor : '';
        if (!apellidos || apellidos.trim().length < 2) {
          return 'Los apellidos son obligatorios';
        }
        if (!/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/.test(apellidos.trim())) {
          return 'Los apellidos solo pueden contener letras y espacios';
        }
        break;
      }
      case 'correo': {
        const correo = typeof valor === 'string' ? valor : '';
        if (!correo || correo.trim() === '') {
          return 'El correo es obligatorio';
        }
        const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!correoRegex.test(correo)) {
          return 'Ingresa un correo válido';
        }
        const correoNormalizado = normalizarCorreo(correo);
        const correoActual = normalizarCorreo(usuario?.personalInfo.email);
        if (correosExistentes.includes(correoNormalizado) && correoNormalizado !== correoActual) {
          return 'Ya existe un usuario con este correo';
        }
        break;
      }
      case 'telefono': {
        const telefono = typeof valor === 'string' ? valor : '';
        if (telefono && telefono.trim()) {
          const telefonoRegex = /^[+]?[\d\s()-]{9,15}$/;
          if (!telefonoRegex.test(telefono.replace(/\s/g, ''))) {
            return 'Ingresa un teléfono válido';
          }
        }
        break;
      }
      case 'numeroDocumento': {
        const numeroDocumento = typeof valor === 'string' ? valor : '';
        if (datosFormulario.tipoDocumento && numeroDocumento) {
          const docType = tiposDocumento.find(dt => dt.value === datosFormulario.tipoDocumento);
          if (docType) {
            if (datosFormulario.tipoDocumento === 'DNI') {
              if (!/^\d{8}$/.test(numeroDocumento)) {
                return 'El DNI debe tener 8 dígitos';
              }
            } else if (datosFormulario.tipoDocumento === 'CE') {
              if (!/^\d{9}$/.test(numeroDocumento)) {
                return 'El CE debe tener 9 dígitos';
              }
            } else if (datosFormulario.tipoDocumento === 'PASSPORT') {
              if (numeroDocumento.length < 6 || numeroDocumento.length > 12) {
                return 'El pasaporte debe tener entre 6 y 12 caracteres';
              }
            }
          }
        }
        break;
      }
      case 'contrasena': {
        const contrasena = typeof valor === 'string' ? valor : '';
        if (!usuario && (!contrasena || contrasena.trim() === '')) {
          return 'La contraseña es obligatoria';
        }
        if (contrasena && contrasena.length < 8) {
          return 'La contraseña debe tener al menos 8 caracteres';
        }
        break;
      }
    }

    return null;
  };

  const validarAsignaciones = (asignaciones: AsignacionEmpresaUsuario[]) => {
    const erroresLocales: Record<string, { establecimientos?: string; roles?: string }> = {};
    asignaciones.forEach((asignacion) => {
      const erroresAsignacion: { establecimientos?: string; roles?: string } = {};
      if (asignacion.establecimientos.length === 0) {
        erroresAsignacion.establecimientos = 'Selecciona al menos un establecimiento';
      }
      const faltanRoles = asignacion.establecimientos.some(
        (establecimiento) => !establecimiento.roleId,
      );
      if (faltanRoles) {
        erroresAsignacion.roles = 'Selecciona un rol por establecimiento';
      }
      if (Object.keys(erroresAsignacion).length > 0) {
        erroresLocales[asignacion.empresaId] = erroresAsignacion;
      }
    });
    return erroresLocales;
  };

  const manejarCambioCampo = <K extends keyof DatosFormularioUsuario>(campo: K, valor: DatosFormularioUsuario[K]) => {
    setDatosFormulario(prev => ({ ...prev, [campo]: valor }));

    const error = validarCampo(campo, valor);
    setErrores(prev => ({
      ...prev,
      [campo]: error || ''
    }));

    if (campo === 'tipoDocumento') {
      setDatosFormulario(prev => ({ ...prev, numeroDocumento: '' }));
      setErrores(prev => ({ ...prev, numeroDocumento: '' }));
    }
  };

  const manejarBlur = (campo: keyof DatosFormularioUsuario) => {
    const error = validarCampo(campo, datosFormulario[campo]);
    setErrores(prev => ({
      ...prev,
      [campo]: error || ''
    }));
  };

  const manejarSeleccionEmpresa = (empresa: Empresa) => {
    const existe = datosFormulario.asignacionesPorEmpresa.some(asignacion => asignacion.empresaId === empresa.id);
    if (existe) {
      if (datosFormulario.asignacionesPorEmpresa.length === 1) {
        setErrores(prev => ({ ...prev, empresas: 'Selecciona al menos una empresa' }));
        return;
      }
      setDatosFormulario(prev => ({
        ...prev,
        asignacionesPorEmpresa: prev.asignacionesPorEmpresa.filter(asignacion => asignacion.empresaId !== empresa.id),
      }));
      return;
    }

    setDatosFormulario(prev => ({
      ...prev,
      asignacionesPorEmpresa: obtenerAsignacionesActualizadas(prev.asignacionesPorEmpresa, empresa.id, {
        empresaNombre: empresa.razonSocial,
        establecimientos: [],
        estado: 'ACTIVE',
      }),
    }));
  };

  const manejarCambioAsignacion = (empresaId: string, cambios: Partial<AsignacionEmpresaUsuario>) => {
    setDatosFormulario(prev => ({
      ...prev,
      asignacionesPorEmpresa: obtenerAsignacionesActualizadas(prev.asignacionesPorEmpresa, empresaId, cambios),
    }));
  };

  const manejarToggleEstablecimiento = (empresaId: string, establecimientoId: string) => {
    const asignacion = datosFormulario.asignacionesPorEmpresa.find(item => item.empresaId === empresaId);
    if (!asignacion) return;
    const existe = asignacion.establecimientos.some(
      (establecimiento) => establecimiento.establecimientoId === establecimientoId,
    );
    const nuevosEstablecimientos = existe
      ? asignacion.establecimientos.filter(
          (establecimiento) => establecimiento.establecimientoId !== establecimientoId,
        )
      : [...asignacion.establecimientos, { establecimientoId, roleId: '' }];

    if (existe && nuevosEstablecimientos.length === 0 && datosFormulario.asignacionesPorEmpresa.length > 1) {
      setDatosFormulario(prev => ({
        ...prev,
        asignacionesPorEmpresa: prev.asignacionesPorEmpresa.filter(item => item.empresaId !== empresaId),
      }));
      return;
    }

    manejarCambioAsignacion(empresaId, { establecimientos: nuevosEstablecimientos });
  };

  const manejarSeleccionRolEstablecimiento = (empresaId: string, establecimientoId: string, rolId: string) => {
    const asignacion = datosFormulario.asignacionesPorEmpresa.find(item => item.empresaId === empresaId);
    if (!asignacion) return;
    const nuevosEstablecimientos = asignacion.establecimientos.some(
      (establecimiento) => establecimiento.establecimientoId === establecimientoId,
    )
      ? asignacion.establecimientos.map((establecimiento) =>
          establecimiento.establecimientoId === establecimientoId
            ? { ...establecimiento, roleId: rolId }
            : establecimiento,
        )
      : [...asignacion.establecimientos, { establecimientoId, roleId: rolId }];
    manejarCambioAsignacion(empresaId, { establecimientos: nuevosEstablecimientos });
  };

  const manejarCambioEstadoAsignacion = (empresaId: string, estado: EstadoAsignacionUsuario) => {
    manejarCambioAsignacion(empresaId, { estado });
  };

  const manejarGenerarContrasena = () => {
    const nuevaContrasena = generarContrasenaSegura();
    manejarCambioCampo('contrasena', nuevaContrasena);
    setContrasenaCopiada(false);
  };

  const manejarCopiarContrasena = async () => {
    try {
      await navigator.clipboard.writeText(datosFormulario.contrasena);
      setContrasenaCopiada(true);
      setTimeout(() => setContrasenaCopiada(false), 2000);
    } catch {
      return;
    }
  };

  const configuracionDocumento = tiposDocumento.find(dt => dt.value === datosFormulario.tipoDocumento);
  const fortalezaContrasena = calcularFortalezaContrasena(datosFormulario.contrasena);

  const esValido = () => {
    const camposRequeridos: Array<keyof DatosFormularioUsuario> = usuario
      ? ['nombres', 'apellidos', 'correo']
      : ['nombres', 'apellidos', 'correo', 'contrasena'];

    for (const campo of camposRequeridos) {
      const error = validarCampo(campo, datosFormulario[campo]);
      if (error) return false;
    }

    const camposOpcionales: Array<keyof DatosFormularioUsuario> = ['telefono', 'numeroDocumento'];
    for (const campo of camposOpcionales) {
      if (datosFormulario[campo]) {
        const error = validarCampo(campo, datosFormulario[campo]);
        if (error) return false;
      }
    }

    if (datosFormulario.asignacionesPorEmpresa.length === 0) {
      return false;
    }

    const erroresAsignaciones = validarAsignaciones(datosFormulario.asignacionesPorEmpresa);
    return Object.keys(erroresAsignaciones).length === 0;
  };

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();

    const nuevosErrores: Record<string, string> = {};
    const camposValidar: Array<keyof DatosFormularioUsuario> = usuario
      ? ['nombres', 'apellidos', 'correo', 'telefono', 'numeroDocumento']
      : ['nombres', 'apellidos', 'correo', 'telefono', 'numeroDocumento', 'contrasena'];

    camposValidar.forEach((campo) => {
      const error = validarCampo(campo, datosFormulario[campo]);
      if (error) nuevosErrores[campo] = error;
    });

    const erroresAsignaciones = validarAsignaciones(datosFormulario.asignacionesPorEmpresa);
    setErrores(nuevosErrores);
    setErroresPorEmpresa(erroresAsignaciones);

    if (Object.keys(nuevosErrores).some(key => nuevosErrores[key])) {
      return;
    }

    if (datosFormulario.asignacionesPorEmpresa.length === 0) {
      setErrores(prev => ({ ...prev, empresas: 'Selecciona al menos una empresa' }));
      return;
    }

    if (Object.keys(erroresAsignaciones).length > 0) {
      return;
    }

    await alEnviar(datosFormulario);
  };

  const renderizarAsignacionEmpresa = (asignacion: AsignacionEmpresaUsuario) => {
    const empresa = empresasOrdenadas.find(item => item.id === asignacion.empresaId);
    const establecimientos: Empresa['establecimientos'] = empresa?.establecimientos ?? [];
    const establecimientosSeleccionados = asignacion.establecimientos.map(
      (item) => item.establecimientoId,
    );
    const resumenEstablecimientos = construirResumenLista(
      establecimientos
        .filter((item) => establecimientosSeleccionados.includes(item.id))
        .map((item) => item.nombre),
    );

    return (
      <details key={asignacion.empresaId} className="border border-gray-200 rounded-lg">
        <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm font-medium text-gray-900">
          <span>{empresa?.razonSocial ?? asignacion.empresaNombre ?? asignacion.empresaId}</span>
          <span className="text-xs text-gray-500">{resumenEstablecimientos.resumen}</span>
        </summary>
        <div className="px-4 pb-4 space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Establecimientos</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {establecimientos.map((establecimiento) => (
                <label
                  key={establecimiento.id}
                  className="flex items-center gap-2 text-sm text-gray-700"
                >
                  <Checkbox
                    checked={establecimientosSeleccionados.includes(establecimiento.id)}
                    onChange={() => manejarToggleEstablecimiento(asignacion.empresaId, establecimiento.id)}
                    disabled={cargando}
                  />
                  <span>{establecimiento.nombre}</span>
                </label>
              ))}
            </div>
            {erroresPorEmpresa[asignacion.empresaId]?.establecimientos && (
              <p className="text-xs text-red-600">{erroresPorEmpresa[asignacion.empresaId]?.establecimientos}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Roles</div>
            <div className="space-y-3">
              {establecimientosSeleccionados.map((establecimientoId) => {
                const establecimiento = establecimientos.find((item) => item.id === establecimientoId);
                const rolSeleccionado = asignacion.establecimientos.find(
                  (item) => item.establecimientoId === establecimientoId,
                )?.roleId ?? '';
                return (
                  <div key={establecimientoId} className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-2 items-center">
                    <div className="text-sm text-gray-700">
                      {establecimiento?.nombre ?? establecimientoId}
                    </div>
                    <Select
                      value={rolSeleccionado}
                      onChange={(e) => manejarSeleccionRolEstablecimiento(
                        asignacion.empresaId,
                        establecimientoId,
                        e.target.value,
                      )}
                      options={[
                        { value: '', label: 'Selecciona un rol' },
                        ...SYSTEM_ROLES.map((rol) => ({
                          value: rol.id,
                          label: rol.name ?? 'Rol sin nombre',
                        })),
                      ]}
                      disabled={cargando}
                    />
                  </div>
                );
              })}
            </div>
            {erroresPorEmpresa[asignacion.empresaId]?.roles && (
              <p className="text-xs text-red-600">{erroresPorEmpresa[asignacion.empresaId]?.roles}</p>
            )}
          </div>

          <Select
            label="Estado"
            value={asignacion.estado}
            onChange={(e) => manejarCambioEstadoAsignacion(asignacion.empresaId, e.target.value as EstadoAsignacionUsuario)}
            options={opcionesEstadoAsignacion}
            disabled={cargando}
          />
        </div>
      </details>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {usuario ? 'Editar usuario' : 'Registrar nuevo usuario'}
                </h3>
                <p className="text-sm text-gray-500">
                  {usuario ? 'Actualiza los datos del usuario' : 'Completa la informacion para registrar al usuario'}
                </p>
              </div>
            </div>
            <Button
              variant="tertiary"
              size="sm"
              icon={<X />}
              iconOnly
              onClick={alCancelar}
              disabled={cargando}
            />
          </div>
        </div>

        <form onSubmit={manejarEnvio} className="p-6 space-y-6">
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900 flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Datos personales</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nombres"
                type="text"
                value={datosFormulario.nombres}
                onChange={(e) => manejarCambioCampo('nombres', e.target.value)}
                onBlur={() => manejarBlur('nombres')}
                error={errores.nombres}
                placeholder="Juan"
                disabled={cargando}
                required
              />
              <Input
                label="Apellidos"
                type="text"
                value={datosFormulario.apellidos}
                onChange={(e) => manejarCambioCampo('apellidos', e.target.value)}
                onBlur={() => manejarBlur('apellidos')}
                error={errores.apellidos}
                placeholder="Perez Garcia"
                disabled={cargando}
                required
              />
            </div>

            <Input
              label="Correo electronico"
              type="email"
              value={datosFormulario.correo}
              onChange={(e) => manejarCambioCampo('correo', e.target.value.toLowerCase())}
              onBlur={() => manejarBlur('correo')}
              error={errores.correo}
              placeholder="usuario@empresa.com"
              leftIcon={<Mail />}
              disabled={cargando}
              required
            />

            <Input
              label="Telefono"
              type="tel"
              value={datosFormulario.telefono}
              onChange={(e) => manejarCambioCampo('telefono', e.target.value)}
              onBlur={() => manejarBlur('telefono')}
              error={errores.telefono}
              placeholder="+51 987 654 321"
              leftIcon={<Phone />}
              disabled={cargando}
            />
          </div>

          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900 flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Documento de identidad</span>
              <span className="text-sm font-normal text-gray-500">(Opcional)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Tipo de documento"
                value={datosFormulario.tipoDocumento}
                onChange={(e) => manejarCambioCampo('tipoDocumento', e.target.value as DatosFormularioUsuario['tipoDocumento'])}
                options={[
                  { value: '', label: 'Seleccionar tipo' },
                  ...tiposDocumento.map(docType => ({
                    value: docType.value,
                    label: docType.label
                  }))
                ]}
                disabled={cargando}
              />

              <Input
                label="Numero de documento"
                type="text"
                value={datosFormulario.numeroDocumento}
                onChange={(e) => {
                  let value = e.target.value;

                  if (datosFormulario.tipoDocumento === 'DNI') {
                    value = value.replace(/\D/g, '').slice(0, 8);
                  } else if (datosFormulario.tipoDocumento === 'CE') {
                    value = value.replace(/\D/g, '').slice(0, 9);
                  } else if (datosFormulario.tipoDocumento === 'PASSPORT') {
                    value = value.toUpperCase().slice(0, 12);
                  }

                  manejarCambioCampo('numeroDocumento', value);
                }}
                placeholder={configuracionDocumento?.placeholder}
                error={errores.numeroDocumento}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900 flex items-center space-x-2">
              <Building2 className="w-4 h-4" />
              <span>Empresas y accesos</span>
              <span className="text-sm font-normal text-red-500">*</span>
            </h4>
            {empresasOrdenadas.length > 1 ? (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">Selecciona las empresas donde este usuario tendra acceso</div>
                {empresasOrdenadas.map((empresa) => (
                  <label key={empresa.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <Checkbox
                      checked={datosFormulario.asignacionesPorEmpresa.some(asignacion => asignacion.empresaId === empresa.id)}
                      onChange={() => manejarSeleccionEmpresa(empresa)}
                      disabled={cargando}
                    />
                    <span>{empresa.razonSocial}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-700">
                Empresa asignada por defecto: {empresasOrdenadas[0]?.razonSocial ?? 'Empresa sin nombre'}
              </div>
            )}

            {errores.empresas && (
              <p className="text-sm text-red-600 mt-2 flex items-center space-x-1">
                <AlertCircle className="w-4 h-4" />
                <span>{errores.empresas}</span>
              </p>
            )}

            <div className="space-y-3">
              {datosFormulario.asignacionesPorEmpresa.map(renderizarAsignacionEmpresa)}
            </div>
          </div>

          {!usuario && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-medium text-gray-900 flex items-center space-x-2">
                  <Lock className="w-4 h-4" />
                  <span>Acceso al sistema</span>
                  <span className="text-sm font-normal text-red-500">*</span>
                </h4>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de usuario
                  </label>
                  <div className="flex items-center space-x-2 px-4 py-3 bg-white border border-gray-300 rounded-lg">
                    <User className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-900 font-medium">
                      {datosFormulario.correo.split('@')[0] || 'usuario'}
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">
                      (basado en el email)
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                    <input
                      type={mostrarContrasena ? 'text' : 'password'}
                      value={datosFormulario.contrasena}
                      onChange={(e) => manejarCambioCampo('contrasena', e.target.value)}
                      onBlur={() => manejarBlur('contrasena')}
                      className={`w-full pl-10 pr-32 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm ${errores.contrasena
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300 bg-white'
                        }`}
                      placeholder="Ingresa una contraseña segura"
                      disabled={cargando}
                    />

                    <div className="absolute right-2 top-2 flex items-center space-x-1">
                      <Button
                        variant="tertiary"
                        size="sm"
                        icon={mostrarContrasena ? <EyeOff /> : <Eye />}
                        iconOnly
                        onClick={() => setMostrarContrasena(!mostrarContrasena)}
                      />

                      <Button
                        variant="tertiary"
                        size="sm"
                        icon={contrasenaCopiada ? <Check /> : <Copy />}
                        iconOnly
                        onClick={manejarCopiarContrasena}
                      />

                      <Button
                        variant="tertiary"
                        size="sm"
                        icon={<RefreshCw />}
                        iconOnly
                        onClick={manejarGenerarContrasena}
                      />
                    </div>
                  </div>

                  {datosFormulario.contrasena && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Fortaleza de la contraseña:</span>
                        <span className={`font-semibold ${fortalezaContrasena.color === 'green' ? 'text-green-600' :
                            fortalezaContrasena.color === 'yellow' ? 'text-yellow-600' :
                              fortalezaContrasena.color === 'red' ? 'text-red-600' :
                                'text-gray-600'
                          }`}>
                          {fortalezaContrasena.label}
                        </span>
                      </div>

                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${fortalezaContrasena.color === 'green' ? 'bg-green-500' :
                              fortalezaContrasena.color === 'yellow' ? 'bg-yellow-500' :
                                fortalezaContrasena.color === 'red' ? 'bg-red-500' :
                                  'bg-gray-400'
                            }`}
                          style={{ width: `${(fortalezaContrasena.score / 6) * 100}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                        <div className={`flex items-center space-x-1 ${datosFormulario.contrasena.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${datosFormulario.contrasena.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span>Mín. 8 caracteres</span>
                        </div>
                        <div className={`flex items-center space-x-1 ${/[A-Z]/.test(datosFormulario.contrasena) ? 'text-green-600' : 'text-gray-500'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(datosFormulario.contrasena) ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span>Mayúsculas</span>
                        </div>
                        <div className={`flex items-center space-x-1 ${/[a-z]/.test(datosFormulario.contrasena) ? 'text-green-600' : 'text-gray-500'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${/[a-z]/.test(datosFormulario.contrasena) ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span>Minúsculas</span>
                        </div>
                        <div className={`flex items-center space-x-1 ${/[0-9]/.test(datosFormulario.contrasena) ? 'text-green-600' : 'text-gray-500'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(datosFormulario.contrasena) ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span>Números</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {errores.contrasena && (
                    <p className="text-sm text-red-600 mt-2 flex items-center space-x-1">
                      <AlertCircle className="w-4 h-4" />
                      <span>{errores.contrasena}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              variant="secondary"
              size="md"
              onClick={alCancelar}
              disabled={cargando}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={cargando || !esValido()}
            >
              {cargando ? 'Guardando...' : (usuario ? 'Actualizar' : 'Registrar')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}


