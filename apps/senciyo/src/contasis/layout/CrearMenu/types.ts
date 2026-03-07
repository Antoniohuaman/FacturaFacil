export type DocumentoTipo = 
  | 'boleta'
  | 'factura'
  | 'nota-venta'
  | 'cliente'
  | 'producto'
  | 'nota-credito'
  | 'nota-debito';

export interface MenuItem {
  id: DocumentoTipo;
  label: string;
  icon: React.ReactNode;
  action: () => void;
}

export interface CrearMenuProps {
  onCrearDocumento?: (tipo: DocumentoTipo) => void;
  onCrearCliente?: () => void;
  onCrearProducto?: () => void;
}
