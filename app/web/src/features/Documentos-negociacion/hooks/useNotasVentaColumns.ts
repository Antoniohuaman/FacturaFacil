import type { ColumnConfig } from '../../comprobantes-electronicos/lista-comprobantes/types/columnConfig';
import { useDocumentoColumns } from './useDocumentoColumns';

const DEFAULT_NOTAS_VENTA_COLUMNS: ColumnConfig[] = [
  { id: 'documentNumber', key: 'id', label: 'N° Nota de Venta', visible: true, fixed: 'left', align: 'left', minWidth: '168px', width: 'w-[168px]' },
  { id: 'client', key: 'client', label: 'Cliente', visible: true, fixed: null, align: 'left', minWidth: '220px', width: 'w-[220px]' },
  { id: 'clientDoc', key: 'clientDoc', label: 'N° Doc Cliente', visible: true, fixed: null, align: 'left', minWidth: '130px', width: 'w-[130px]' },
  { id: 'vendor', key: 'vendor', label: 'Vendedor', visible: true, fixed: null, align: 'left', minWidth: '150px', width: 'w-[150px]' },
  { id: 'paymentMethod', key: 'paymentMethod', label: 'Forma de pago', visible: true, fixed: null, align: 'left', minWidth: '130px', width: 'w-[130px]' },
  { id: 'total', key: 'total', label: 'Total', visible: true, fixed: null, align: 'right', minWidth: '110px', width: 'w-[110px]' },
  { id: 'status', key: 'status', label: 'Estado', visible: true, fixed: null, align: 'center', minWidth: '170px', width: 'w-[170px]' },
  { id: 'actions', key: 'actions', label: 'ACCIONES', visible: true, fixed: 'right', align: 'center', minWidth: '110px', width: 'w-[110px]' },
  { id: 'date', key: 'date', label: 'F. Emisión', visible: false, fixed: null, align: 'center', minWidth: '120px' },
  { id: 'validUntil', key: 'validUntil', label: 'F. Vencimiento', visible: false, fixed: null, align: 'center', minWidth: '130px' },
  { id: 'currency', key: 'currency', label: 'Moneda', visible: false, fixed: null, align: 'left', minWidth: '100px' },
  { id: 'address', key: 'address', label: 'Dirección', visible: false, fixed: null, align: 'left', minWidth: '200px' },
  { id: 'email', key: 'email', label: 'Correo', visible: false, fixed: null, align: 'left', minWidth: '200px' },
  { id: 'observations', key: 'observations', label: 'Observaciones', visible: false, fixed: null, align: 'left', minWidth: '200px' }
];

export const useNotasVentaColumns = () =>
  useDocumentoColumns({
    storageKey: 'notas_venta_columns_config',
    legacyKey: 'notas_venta_columns_config',
    defaultColumns: DEFAULT_NOTAS_VENTA_COLUMNS
  });
