// src/features/configuration/components/usuarios/UserForm.tsx
import { useState, useEffect, useMemo } from 'react';
import { X, User, Mail, Phone, AlertCircle, Building2, Lock, Eye, EyeOff, RefreshCw, Copy, Check, Info } from 'lucide-react';
import { Button, Select, Input, Checkbox } from '@/contasis';
import { Tooltip } from '@/shared/ui';
import type { Empresa } from '../../../autenticacion/types/auth.types';
import type { User as UsuarioModelo, AsignacionEmpresaUsuario, EstadoAsignacionUsuario } from '../../modelos/User';
import { useConfigurationContext } from '../../contexto/ContextoConfiguracion';
import {
  construirResumenLista,
  generarContrasenaTemporal,
  normalizarCorreo,
  obtenerAsignacionesActualizadas,
  obtenerAsignacionesUsuarioGlobal,
} from '../../utilidades/usuariosAsignaciones';

type DatosFormularioUsuario = {
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  tipoDocumento: 'DNI' | 'CE' | 'PASSPORT' | 'OTHER' | '';
  numeroDocumento: string;
  contrasena: string;
  asignacionesPorEmpresa: AsignacionEmpresaUsuario[];
};

interface PropsFormularioUsuario {
  usuario?: UsuarioModelo;
  empresasDisponibles: Empresa[];
  correosExistentes: string[];
  errorCorreo?: string | null;
  onClearErrorCorreo?: () => void;
  alEnviar: (data: DatosFormularioUsuario) => Promise<void>;
  alCancelar: () => void;
  cargando?: boolean;
}

const tiposDocumento = [
  { value: 'DNI' as const, label: 'DNI', placeholder: '12345678', maxLength: 8 },
  { value: 'CE' as const, label: 'Carnet de Extranjería', placeholder: 'CE123456', maxLength: 12 },
  { value: 'PASSPORT' as const, label: 'Pasaporte', placeholder: 'A1234567', maxLength: 12 },
  { value: 'OTHER' as const, label: 'Otros', placeholder: 'OTR12345', maxLength: 12 },
];

const opcionesEstadoAsignacion: Array<{ value: EstadoAsignacionUsuario; label: string }> = [
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'INACTIVE', label: 'Inactivo' },
];

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
  correosExistentes,
  errorCorreo = null,
  onClearErrorCorreo,
  alEnviar,
  alCancelar,
  cargando = false
}: PropsFormularioUsuario) {
  const { rolesConfigurados } = useConfigurationContext();
  const compactFieldClass = '[&>label]:mb-1';
  const [datosFormulario, setDatosFormulario] = useState<DatosFormularioUsuario>({
    nombres: '',
    apellidos: '',
    correo: '',
    telefono: '',
    tipoDocumento: '',
    numeroDocumento: '',
    contrasena: generarContrasenaTemporal(),
    asignacionesPorEmpresa: [],
  });

  const [errores, setErrores] = useState<Record<string, string>>({});
  const [erroresPorEmpresa, setErroresPorEmpresa] = useState<Record<string, { establecimientos?: string; roles?: string }>>({});
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [contrasenaCopiada, setContrasenaCopiada] = useState(false);

  const empresasOrdenadas = useMemo(() => {
    return [...empresasDisponibles].sort((a, b) =>
      (a.razonSocial || a.nombreComercial || '').localeCompare(
        b.razonSocial || b.nombreComercial || '',
      ),
    );
  }, [empresasDisponibles]);

  useEffect(() => {
    if (!usuario) return;

    const asignaciones = obtenerAsignacionesUsuarioGlobal(usuario, empresasOrdenadas);

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
  }, [empresasOrdenadas, usuario]);

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
          const telefonoLimpio = telefono.replace(/\D/g, '');
          if (!/^\d{1,9}$/.test(telefonoLimpio)) {
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
              if (!/^\d+$/.test(numeroDocumento) || numeroDocumento.length > 8) {
                return 'El DNI debe tener maximo 8 digitos numericos';
              }
            } else if (!/^[a-zA-Z0-9]+$/.test(numeroDocumento)) {
              return 'El documento solo debe contener letras y numeros';
            } else if (docType.maxLength && numeroDocumento.length > docType.maxLength) {
              return `El documento debe tener maximo ${docType.maxLength} caracteres`;
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

    if (campo === 'correo' && onClearErrorCorreo) {
      onClearErrorCorreo();
    }

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
    const nuevaContrasena = generarContrasenaTemporal();
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
    const tieneEstablecimientos = establecimientosSeleccionados.length > 0;
    const resumenTexto = tieneEstablecimientos ? resumenEstablecimientos.resumen : 'Dar accesos';

    return (
      <details key={asignacion.empresaId} className="border border-gray-200 rounded-lg">
        <summary className="flex items-center justify-between px-3 py-2 cursor-pointer text-sm font-medium text-gray-900">
          <span>{empresa?.razonSocial ?? asignacion.empresaNombre ?? asignacion.empresaId}</span>
          <span className={`${tieneEstablecimientos ? 'text-[11px] text-gray-500' : 'text-[11px] text-blue-600'}`}>
            {resumenTexto}
          </span>
        </summary>
        <div className="px-3 pb-3 space-y-3">
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-700">Establecimientos</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {establecimientos.map((establecimiento) => (
                <label
                  key={establecimiento.id}
                  className="flex items-center gap-2 text-xs text-gray-700"
                >
                  <Checkbox
                    checked={establecimientosSeleccionados.includes(establecimiento.id)}
                    onChange={() => manejarToggleEstablecimiento(asignacion.empresaId, establecimiento.id)}
                    disabled={cargando}
                    size="sm"
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
            <div className="text-xs font-medium text-gray-700">Roles</div>
            <div className="space-y-2">
              {establecimientosSeleccionados.map((establecimientoId) => {
                const establecimiento = establecimientos.find((item) => item.id === establecimientoId);
                const rolSeleccionado = asignacion.establecimientos.find(
                  (item) => item.establecimientoId === establecimientoId,
                )?.roleId ?? '';
                return (
                  <div key={establecimientoId} className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-2 items-center">
                    <div className="text-xs text-gray-700">
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
                        ...rolesConfigurados.map((rol) => ({
                          value: rol.id,
                          label: rol.nombre,
                        })),
                      ]}
                      disabled={cargando}
                      size="small"
                      containerClassName={compactFieldClass}
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
            size="small"
            containerClassName={compactFieldClass}
          />
        </div>
      </details>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {usuario ? 'Editar usuario' : 'Registrar nuevo usuario'}
                </h3>
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

        <form onSubmit={manejarEnvio} className="p-4 space-y-4">
          <div className="space-y-3">
            <h4 className="text-md font-medium text-gray-900 flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Datos personales</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                size="small"
                containerClassName={compactFieldClass}
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
                size="small"
                containerClassName={compactFieldClass}
              />
            </div>

            <Input
              label="Correo electronico"
              type="email"
              value={datosFormulario.correo}
              onChange={(e) => manejarCambioCampo('correo', e.target.value.toLowerCase())}
              onBlur={() => manejarBlur('correo')}
              error={errores.correo || errorCorreo || ''}
              placeholder="usuario@empresa.com"
              leftIcon={<Mail />}
              disabled={cargando || Boolean(usuario)}
              required
              size="small"
              containerClassName={compactFieldClass}
            />

            <Input
              label="Telefono"
              type="tel"
              value={datosFormulario.telefono}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 9);
                manejarCambioCampo('telefono', value);
              }}
              onBlur={() => manejarBlur('telefono')}
              error={errores.telefono}
              placeholder="+51 987 654 321"
              leftIcon={<Phone />}
              disabled={cargando}
              size="small"
              containerClassName={compactFieldClass}
            />
          </div>

          <details
            className="border border-gray-200 rounded-lg"
            open={Boolean(datosFormulario.tipoDocumento || datosFormulario.numeroDocumento)}
          >
            <summary className="flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-900 cursor-pointer">
              <span>
                Documento de identidad <span className="text-xs font-normal text-gray-500">(Opcional)</span>
              </span>
            </summary>

            <div className="px-3 pb-3 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                  size="small"
                  containerClassName={compactFieldClass}
                />

                <Input
                  label="Numero de documento"
                  type="text"
                  value={datosFormulario.numeroDocumento}
                  onChange={(e) => {
                    let value = e.target.value;
                    const docType = tiposDocumento.find(dt => dt.value === datosFormulario.tipoDocumento);

                    if (datosFormulario.tipoDocumento === 'DNI') {
                      value = value.replace(/\D/g, '').slice(0, 8);
                    } else {
                      const maxLength = docType?.maxLength ?? 12;
                      value = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, maxLength);
                    }

                    manejarCambioCampo('numeroDocumento', value);
                  }}
                  placeholder={configuracionDocumento?.placeholder}
                  error={errores.numeroDocumento}
                  size="small"
                  containerClassName={compactFieldClass}
                />
              </div>
            </div>
          </details>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <h4 className="text-md font-medium text-gray-900 flex items-center space-x-2">
                <Building2 className="w-4 h-4" />
                <span>Empresas y accesos</span>
                <span className="text-sm font-normal text-red-500">*</span>
              </h4>
              <Tooltip contenido="Selecciona empresas, establecimientos y rol por establecimiento." ubicacion="arriba" multilinea>
                <span className="inline-flex items-center text-gray-400">
                  <Info className="w-4 h-4" />
                </span>
              </Tooltip>
            </div>
            {empresasOrdenadas.length > 1 ? (
              <div className="space-y-2">
                {empresasOrdenadas.map((empresa) => (
                  <label key={empresa.id} className="flex items-center gap-2 text-xs text-gray-700">
                    <Checkbox
                      checked={datosFormulario.asignacionesPorEmpresa.some(asignacion => asignacion.empresaId === empresa.id)}
                      onChange={() => manejarSeleccionEmpresa(empresa)}
                      disabled={cargando}
                      size="sm"
                    />
                    <span>{empresa.razonSocial}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-gray-600">Empresa</span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                  {empresasOrdenadas[0]?.razonSocial ?? empresasOrdenadas[0]?.nombreComercial ?? ''}
                </span>
              </div>
            )}

            {errores.empresas && (
              <p className="text-xs text-red-600 mt-2 flex items-center space-x-1">
                <AlertCircle className="w-4 h-4" />
                <span>{errores.empresas}</span>
              </p>
            )}

            <div className="space-y-2">
              {datosFormulario.asignacionesPorEmpresa.map(renderizarAsignacionEmpresa)}
            </div>
          </div>

          {!usuario && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h4 className="text-md font-medium text-gray-900 flex items-center space-x-2">
                    <Lock className="w-4 h-4" />
                    <span>Acceso al sistema</span>
                    <span className="text-sm font-normal text-red-500">*</span>
                  </h4>
                  <Tooltip contenido="Se genera con el email y se recomienda cambiar al primer inicio." ubicacion="arriba" multilinea>
                    <span className="inline-flex items-center text-gray-400">
                      <Info className="w-4 h-4" />
                    </span>
                  </Tooltip>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-3 space-y-3">
                <Input
                  label="Usuario (correo)"
                  type="email"
                  value={datosFormulario.correo}
                  placeholder="correo@dominio.com"
                  leftIcon={<User />}
                  readOnly
                  size="small"
                  containerClassName={compactFieldClass}
                  className="bg-gray-50 text-gray-700"
                />

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type={mostrarContrasena ? 'text' : 'password'}
                      value={datosFormulario.contrasena}
                      onChange={(e) => manejarCambioCampo('contrasena', e.target.value)}
                      onBlur={() => manejarBlur('contrasena')}
                      className={`w-full pl-10 pr-28 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm ${errores.contrasena
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300 bg-white'
                        }`}
                      placeholder="Ingresa una contraseña"
                      disabled={cargando}
                    />

                    <div className="absolute right-2 top-1.5 flex items-center space-x-1">
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
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-gray-500">Fortaleza</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${fortalezaContrasena.color === 'green' ? 'text-green-600' :
                            fortalezaContrasena.color === 'yellow' ? 'text-yellow-600' :
                              fortalezaContrasena.color === 'red' ? 'text-red-600' :
                                'text-gray-600'
                          }`}>
                          {fortalezaContrasena.label}
                        </span>
                        <Tooltip
                          contenido="Minimo 8 caracteres, incluye mayusculas, minusculas, numeros y simbolos."
                          ubicacion="arriba"
                          multilinea
                        >
                          <span className="inline-flex items-center text-gray-400">
                            <Info className="w-3.5 h-3.5" />
                          </span>
                        </Tooltip>
                      </div>
                    </div>
                  )}

                  {errores.contrasena && (
                    <p className="text-xs text-red-600 mt-2 flex items-center space-x-1">
                      <AlertCircle className="w-4 h-4" />
                      <span>{errores.contrasena}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
            <Button
              variant="secondary"
              size="sm"
              onClick={alCancelar}
              disabled={cargando}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
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


