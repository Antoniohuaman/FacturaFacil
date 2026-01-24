/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars -- Example/playground file */
import { useState } from 'react';
import { EmpresaSelector } from './EmpresaSelector';
import type { Empresa } from './types';

// ========================================
// DATOS DE EJEMPLO
// ========================================

const empresasEjemplo: Empresa[] = [
  {
    id: '1',
    nombre: 'Contasis Corp',
    ruc: '20512345678',
    gradient: 'linear-gradient(135deg, #0050CB 0%, #003D9E 100%)'
  },
  {
    id: '2',
    nombre: 'TechCorp SAC',
    ruc: '20598765432',
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
  },
  {
    id: '3',
    nombre: 'InnovaPeru EIRL',
    ruc: '20587654321',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
  }
];

const sedesEjemplo: any[] = [
  // Contasis Corp (4 sedes)
  {
    id: 'est-1',
    nombre: 'Lima Centro',
    direccion: 'Av. Javier Prado Este 4200',
    empresaId: '1'
  },
  {
    id: 'est-2',
    nombre: 'San Isidro',
    direccion: 'Av. República de Panamá 3591',
    empresaId: '1'
  },
  {
    id: 'est-3',
    nombre: 'Miraflores',
    direccion: 'Av. Larco 1301',
    empresaId: '1'
  },
  {
    id: 'est-4',
    nombre: 'Chorrillos',
    direccion: 'Av. Huaylas 1050',
    empresaId: '1'
  },
  // TechCorp SAC (3 sedes)
  {
    id: 'est-5',
    nombre: 'Sede Principal',
    direccion: 'Jr. Lampa 850, Lima',
    empresaId: '2'
  },
  {
    id: 'est-6',
    nombre: 'Sucursal Norte',
    direccion: 'Av. Túpac Amaru 210',
    empresaId: '2'
  },
  {
    id: 'est-7',
    nombre: 'Sucursal Este',
    direccion: 'Carretera Central Km 8.5',
    empresaId: '2'
  },
  // InnovaPeru EIRL (2 sedes)
  {
    id: 'est-8',
    nombre: 'Callao',
    direccion: 'Av. Colonial 1234',
    empresaId: '3'
  },
  {
    id: 'est-9',
    nombre: 'Arequipa',
    direccion: 'Calle Mercaderes 201',
    empresaId: '3'
  }
];

// ========================================
// CASOS DE USO
// ========================================

// CASO 1: Una empresa con múltiples establecimientos (sin otras empresas)
export const Caso1_UnaEmpresaVariosEstablecimientos = () => {
  const [actual, setActual] = useState<any>({
    empresa: empresasEjemplo[0],
    sede: sedesEjemplo[0]
  });

  const handleChangeSede = (sedeId: string) => {
    const nuevoany = sedesEjemplo.find(est => est.id === sedeId);
    if (nuevoany) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setActual((prev: any) => ({
        ...prev,
        sede: nuevoany
      }));
      console.log('any cambiado:', nuevoany.nombre);
    }
  };

  return (
    <EmpresaSelector
      actual={actual}
      empresas={[empresasEjemplo[0]]} // Solo una empresa
      sedes={sedesEjemplo.filter(est => est.empresaId === '1')}
      onChangeSede={handleChangeSede}
      
    />
  );
};

// CASO 2: Empresa actual con otros establecimientos + Otras empresas
export const Caso2_VariosEstablecimientosYEmpresas = () => {
  const [actual, setActual] = useState<any>({
    empresa: empresasEjemplo[0],
    sede: sedesEjemplo[0]
  });

  const handleChangeEmpresa = (empresaId: string) => {
    const nuevaEmpresa = empresasEjemplo.find(emp => emp.id === empresaId);
    if (nuevaEmpresa) {
      console.log('Empresa cambiada:', nuevaEmpresa.nombre);
    }
  };

  const handleChangeSede = (sedeId: string) => {
    const nuevoany = sedesEjemplo.find(est => est.id === sedeId);
    if (nuevoany) {
      const empresa = empresasEjemplo.find(emp => emp.id === nuevoany.empresaId);
      if (empresa) {
        setActual({
          empresa,
          sede: nuevoany
        });
        console.log('Cambiado a:', empresa.nombre, '-', nuevoany.nombre);
      }
    }
  };

  return (
    <EmpresaSelector
      actual={actual}
      empresas={empresasEjemplo} // Todas las empresas
      sedes={sedesEjemplo} // Todos los establecimientos
      onChangeEmpresa={handleChangeEmpresa}
      onChangeSede={handleChangeSede}
      
    />
  );
};

// CASO 3: Empresa con 1 solo any + Otras empresas
export const Caso3_UnEstablecimientoYOtrasEmpresas = () => {
  // Creamos una empresa con un solo any
  const empresaUnica: Empresa = {
    id: '10',
    nombre: 'MiEmpresa SAC',
    ruc: '20511111111',
    gradient: 'linear-gradient(135deg, #0050CB 0%, #003D9E 100%)'
  };

  const establecimientoUnico: any = {
    id: 'est-10',
    nombre: 'Sede Única',
    direccion: 'Av. Javier Prado Este 4200',
    empresaId: '10'
  };

  const [actual, setActual] = useState<any>({
    empresa: empresaUnica,
    sede: establecimientoUnico
  });

  const handleChangeEmpresa = (empresaId: string) => {
    const nuevaEmpresa = empresasEjemplo.find(emp => emp.id === empresaId);
    if (nuevaEmpresa) {
      console.log('Empresa cambiada:', nuevaEmpresa.nombre);
    }
  };

  const handleChangeSede = (sedeId: string) => {
    const nuevoany = sedesEjemplo.find(est => est.id === sedeId);
    if (nuevoany) {
      const empresa = empresasEjemplo.find(emp => emp.id === nuevoany.empresaId);
      if (empresa) {
        setActual({
          empresa,
          sede: nuevoany
        });
        console.log('Cambiado a:', empresa.nombre, '-', nuevoany.nombre);
      }
    }
  };

  return (
    <EmpresaSelector
      actual={actual}
      empresas={[empresaUnica, ...empresasEjemplo]} // Empresa actual + otras
      sedes={[establecimientoUnico, ...sedesEjemplo]} // Solo 1 de la actual
      onChangeEmpresa={handleChangeEmpresa}
      onChangeSede={handleChangeSede}
      
    />
  );
};

// ========================================
// EJEMPLO COMPLETO CON ESTADO GLOBAL
// ========================================

export const EjemploCompleto = () => {
  const [actual, setActual] = useState<any>({
    empresa: empresasEjemplo[0],
    sede: sedesEjemplo[0]
  });

  const handleChangeEmpresa = (empresaId: string) => {
    console.log('Nueva empresa seleccionada:', empresaId);
    // Aquí podrías hacer una llamada a tu API o actualizar tu estado global
  };

  const handleChangeSede = (sedeId: string) => {
    const nuevoany = sedesEjemplo.find(
      est => est.id === sedeId
    );
    
    if (nuevoany) {
      const empresa = empresasEjemplo.find(
        emp => emp.id === nuevoany.empresaId
      );
      
      if (empresa) {
        setActual({
          empresa,
          sede: nuevoany
        });
        
        console.log('Contexto actualizado:', {
          empresa: empresa.nombre,
          sede: nuevoany.nombre
        });
        
        // Aquí podrías actualizar tu estado global, localStorage, etc.
        // localStorage.setItem('empresaActual', empresaId);
        // localStorage.setItem('establecimientoActual', sedeId);
      }
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Selector de Empresa y any</h1>
      
      <div className="mb-8">
        <EmpresaSelector
          actual={actual}
          empresas={empresasEjemplo}
          sedes={sedesEjemplo}
          onChangeEmpresa={handleChangeEmpresa}
          onChangeSede={handleChangeSede}
          
        />
      </div>

      {/* Info del contexto actual */}
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="font-semibold mb-2">Contexto Actual:</h2>
        <p className="text-sm">
          <strong>Empresa:</strong> {actual.empresa.nombre} ({actual.empresa.ruc})
        </p>
        <p className="text-sm">
          <strong>sede:</strong> {actual.any.nombre}
        </p>
        {actual.any.direccion && (
          <p className="text-sm">
            <strong>Dirección:</strong> {actual.any.direccion}
          </p>
        )}
      </div>
    </div>
  );
};

// ========================================
// DEMO CON TODOS LOS CASOS
// ========================================

export const DemoCompleta = () => {
  return (
    <div className="p-8 space-y-12">
      <div>
        <h2 className="text-xl font-bold mb-4">Caso 1: Una Empresa con Múltiples Establecimientos</h2>
        <p className="text-sm text-gray-600 mb-4">
          Solo muestra otros establecimientos de la misma empresa, sin opción de cambiar de empresa.
        </p>
        <Caso1_UnaEmpresaVariosEstablecimientos />
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Caso 2: Varios Establecimientos + Otras Empresas</h2>
        <p className="text-sm text-gray-600 mb-4">
          Muestra otros establecimientos de la empresa actual Y permite cambiar a otras empresas.
        </p>
        <Caso2_VariosEstablecimientosYEmpresas />
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Caso 3: Un any + Otras Empresas</h2>
        <p className="text-sm text-gray-600 mb-4">
          No muestra "Otros establecimientos" porque solo hay uno, pero sí permite cambiar de empresa.
        </p>
        <Caso3_UnEstablecimientoYOtrasEmpresas />
      </div>
    </div>
  );
};
