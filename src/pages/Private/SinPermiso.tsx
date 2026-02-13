import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from '@/contasis';

export function SinPermiso() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
          <Lock className="w-6 h-6 text-red-600" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Sin permiso</h1>
        <p className="text-sm text-gray-600 mt-2">
          No tienes permisos para acceder a esta seccion. Si crees que es un error,
          contacta al administrador.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="primary" onClick={() => navigate('/comprobantes')}
          >
            Ir a comprobantes
          </Button>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Volver
          </Button>
        </div>
      </div>
    </div>
  );
}
