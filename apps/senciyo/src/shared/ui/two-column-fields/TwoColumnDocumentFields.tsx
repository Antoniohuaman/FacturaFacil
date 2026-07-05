import type { ReactNode } from 'react';

interface TwoColumnDocumentFieldsProps {
  izquierda: ReactNode;
  derecha: ReactNode;
}

/**
 * Distribución 65/35 para la card principal de un formulario de documento:
 * columna izquierda (cliente/proveedor) más ancha, columna derecha (datos
 * del documento) separada por un borde. Se apila en una sola columna en
 * pantallas angostas.
 */
export default function TwoColumnDocumentFields({ izquierda, derecha }: TwoColumnDocumentFieldsProps) {
  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 lg:col-span-7 space-y-3">{izquierda}</div>
      <div className="col-span-12 lg:col-span-5 lg:border-l lg:border-gray-200 lg:pl-4 space-y-3">{derecha}</div>
    </div>
  );
}
