/**
 * Mock data para borradores de comprobantes
 * Este archivo contiene datos de prueba que serán reemplazados
 * por datos reales desde el backend en producción.
 */

export interface Draft {
  id: string;
  type: string;
  clientDoc: string;
  client: string;
  createdDate: string;
  expiryDate: string;
  vendor: string;
  total: number;
  status: 'Vigente' | 'Por vencer' | 'Vencido';
  daysLeft: number;
  statusColor: 'green' | 'orange' | 'red';
}

export const MOCK_DRAFTS: Draft[] = [
  {
    id: 'DRAFT-B001-00000015',
    type: 'Boleta de venta',
    clientDoc: '08661829',
    client: 'Apolo Guerra Lu',
    createdDate: '22 ago. 2025 14:30',
    expiryDate: '29 ago. 2025',
    vendor: 'Carlos Rueda',
    total: 145.50,
    status: 'Vigente',
    daysLeft: 2,
    statusColor: 'green'
  },
  {
    id: 'DRAFT-F001-00000008',
    type: 'Factura',
    clientDoc: '20236523658',
    client: 'Tienda S.A.C.',
    createdDate: '21 ago. 2025 16:45',
    expiryDate: '28 ago. 2025',
    vendor: 'Carlos Rueda',
    total: 320.00,
    status: 'Por vencer',
    daysLeft: 1,
    statusColor: 'orange'
  },
  {
    id: 'DRAFT-B001-00000014',
    type: 'Boleta de venta',
    clientDoc: '08664589',
    client: 'María Martínez Sánchez',
    createdDate: '20 ago. 2025 11:20',
    expiryDate: '27 ago. 2025',
    vendor: 'Bertha Flores',
    total: 89.99,
    status: 'Vencido',
    daysLeft: -1,
    statusColor: 'red'
  },
  {
    id: 'DRAFT-B001-00000013',
    type: 'Boleta de venta',
    clientDoc: '45878965',
    client: 'Gonzalo Romero Castillo',
    createdDate: '19 ago. 2025 09:15',
    expiryDate: '26 ago. 2025',
    vendor: 'Carlos Rueda',
    total: 75.30,
    status: 'Vigente',
    daysLeft: 5,
    statusColor: 'green'
  },
  {
    id: 'DRAFT-B001-00000012',
    type: 'Boleta de venta',
    clientDoc: '89658965',
    client: 'Alex Guerrero Londres',
    createdDate: '18 ago. 2025 15:40',
    expiryDate: '25 ago. 2025',
    vendor: 'Carlos Rueda',
    total: 120.75,
    status: 'Por vencer',
    daysLeft: 1,
    statusColor: 'orange'
  },
  {
    id: 'DRAFT-F001-00000007',
    type: 'Factura',
    clientDoc: '10236526589',
    client: 'Market S.A.C.',
    createdDate: '17 ago. 2025 13:25',
    expiryDate: '24 ago. 2025',
    vendor: 'Carlos Rueda',
    total: 450.00,
    status: 'Vencido',
    daysLeft: -3,
    statusColor: 'red'
  },
  {
    id: 'DRAFT-B001-00000011',
    type: 'Boleta de venta',
    clientDoc: '00000000',
    client: 'Clientes varios',
    createdDate: '16 ago. 2025 10:30',
    expiryDate: '23 ago. 2025',
    vendor: 'Carlos Rueda',
    total: 65.20,
    status: 'Vigente',
    daysLeft: 8,
    statusColor: 'green'
  },
  {
    id: 'DRAFT-B001-00000025',
    type: 'Boleta de venta',
    clientDoc: '12345678',
    client: 'Pedro Sánchez Vega',
    createdDate: '23 set. 2025 14:15',
    expiryDate: '30 set. 2025',
    vendor: 'Carlos Rueda',
    total: 95.80,
    status: 'Vigente',
    daysLeft: 7,
    statusColor: 'green'
  },
  {
    id: 'DRAFT-F001-00000015',
    type: 'Factura',
    clientDoc: '20536547896',
    client: 'Comercial Norte S.A.C.',
    createdDate: '23 set. 2025 10:30',
    expiryDate: '24 set. 2025',
    vendor: 'Bertha Flores',
    total: 580.00,
    status: 'Por vencer',
    daysLeft: 1,
    statusColor: 'orange'
  },
  {
    id: 'DRAFT-B001-00000024',
    type: 'Boleta de venta',
    clientDoc: '87654321',
    client: 'Ana García López',
    createdDate: '23 set. 2025 16:45',
    expiryDate: '30 set. 2025',
    vendor: 'Carlos Rueda',
    total: 125.60,
    status: 'Vigente',
    daysLeft: 7,
    statusColor: 'green'
  },
  {
    id: 'DRAFT-B001-00000023',
    type: 'Boleta de venta',
    clientDoc: '45789632',
    client: 'Roberto Mendoza Cruz',
    createdDate: '22 set. 2025 11:20',
    expiryDate: '29 set. 2025',
    vendor: 'Carlos Rueda',
    total: 78.40,
    status: 'Vigente',
    daysLeft: 6,
    statusColor: 'green'
  },
  {
    id: 'DRAFT-F001-00000014',
    type: 'Factura',
    clientDoc: '20123456789',
    client: 'Distribuidora Central S.A.C.',
    createdDate: '21 set. 2025 09:15',
    expiryDate: '22 set. 2025',
    vendor: 'Bertha Flores',
    total: 750.00,
    status: 'Vencido',
    daysLeft: -1,
    statusColor: 'red'
  },
  {
    id: 'DRAFT-B001-00000022',
    type: 'Boleta de venta',
    clientDoc: '36985214',
    client: 'Carmen Silva Torres',
    createdDate: '20 set. 2025 13:30',
    expiryDate: '27 set. 2025',
    vendor: 'Carlos Rueda',
    total: 156.90,
    status: 'Vigente',
    daysLeft: 4,
    statusColor: 'green'
  },
  {
    id: 'DRAFT-B001-00000021',
    type: 'Boleta de venta',
    clientDoc: '78912345',
    client: 'Luis Alberto Quispe',
    createdDate: '19 set. 2025 15:45',
    expiryDate: '26 set. 2025',
    vendor: 'Bertha Flores',
    total: 89.75,
    status: 'Vigente',
    daysLeft: 3,
    statusColor: 'green'
  },
  {
    id: 'DRAFT-F001-00000013',
    type: 'Factura',
    clientDoc: '20987654321',
    client: 'Importadora del Sur S.A.C.',
    createdDate: '18 set. 2025 08:20',
    expiryDate: '19 set. 2025',
    vendor: 'Carlos Rueda',
    total: 1250.00,
    status: 'Vencido',
    daysLeft: -4,
    statusColor: 'red'
  },
  {
    id: 'DRAFT-B001-00000020',
    type: 'Boleta de venta',
    clientDoc: '15975346',
    client: 'María Elena Vargas',
    createdDate: '17 set. 2025 12:10',
    expiryDate: '24 set. 2025',
    vendor: 'Carlos Rueda',
    total: 234.50,
    status: 'Vigente',
    daysLeft: 1,
    statusColor: 'green'
  },
  {
    id: 'DRAFT-B001-00000019',
    type: 'Boleta de venta',
    clientDoc: '74185296',
    client: 'Jorge Ramírez Huamán',
    createdDate: '16 set. 2025 14:25',
    expiryDate: '23 set. 2025',
    vendor: 'Bertha Flores',
    total: 167.30,
    status: 'Por vencer',
    daysLeft: 0,
    statusColor: 'orange'
  },
  {
    id: 'DRAFT-F001-00000012',
    type: 'Factura',
    clientDoc: '20456789123',
    client: 'Corporación Andina S.A.C.',
    createdDate: '15 set. 2025 16:40',
    expiryDate: '16 set. 2025',
    vendor: 'Carlos Rueda',
    total: 890.75,
    status: 'Vencido',
    daysLeft: -7,
    statusColor: 'red'
  },
  {
    id: 'DRAFT-B001-00000018',
    type: 'Boleta de venta',
    clientDoc: '96385274',
    client: 'Rosa Delgado Morales',
    createdDate: '14 set. 2025 10:15',
    expiryDate: '21 set. 2025',
    vendor: 'Bertha Flores',
    total: 143.20,
    status: 'Vencido',
    daysLeft: -2,
    statusColor: 'red'
  },
  {
    id: 'DRAFT-B001-00000017',
    type: 'Boleta de venta',
    clientDoc: '85274196',
    client: 'Fernando Castro Díaz',
    createdDate: '13 set. 2025 11:50',
    expiryDate: '20 set. 2025',
    vendor: 'Carlos Rueda',
    total: 198.60,
    status: 'Vencido',
    daysLeft: -3,
    statusColor: 'red'
  },
  {
    id: 'DRAFT-F001-00000011',
    type: 'Factura',
    clientDoc: '20741852963',
    client: 'Servicios Integrales S.A.C.',
    createdDate: '12 set. 2025 09:30',
    expiryDate: '13 set. 2025',
    vendor: 'Bertha Flores',
    total: 672.40,
    status: 'Vencido',
    daysLeft: -10,
    statusColor: 'red'
  },
  {
    id: 'DRAFT-B001-00000016',
    type: 'Boleta de venta',
    clientDoc: '63741985',
    client: 'Lucía Mendoza Vásquez',
    createdDate: '11 set. 2025 15:20',
    expiryDate: '18 set. 2025',
    vendor: 'Carlos Rueda',
    total: 112.80,
    status: 'Vencido',
    daysLeft: -5,
    statusColor: 'red'
  },
  {
    id: 'DRAFT-B001-00000015',
    type: 'Boleta de venta',
    clientDoc: '52963741',
    client: 'Diego Herrera Salinas',
    createdDate: '10 set. 2025 13:45',
    expiryDate: '17 set. 2025',
    vendor: 'Bertha Flores',
    total: 267.90,
    status: 'Vencido',
    daysLeft: -6,
    statusColor: 'red'
  },
  {
    id: 'DRAFT-F001-00000010',
    type: 'Factura',
    clientDoc: '20852741963',
    client: 'Tecnología Avanzada S.A.C.',
    createdDate: '09 set. 2025 08:10',
    expiryDate: '10 set. 2025',
    vendor: 'Carlos Rueda',
    total: 1450.00,
    status: 'Vencido',
    daysLeft: -13,
    statusColor: 'red'
  },
  {
    id: 'DRAFT-B001-00000014',
    type: 'Boleta de venta',
    clientDoc: '41852963',
    client: 'Patricia Rojas Álvarez',
    createdDate: '08 set. 2025 16:30',
    expiryDate: '15 set. 2025',
    vendor: 'Bertha Flores',
    total: 185.50,
    status: 'Vencido',
    daysLeft: -8,
    statusColor: 'red'
  },
  {
    id: 'DRAFT-B001-00000013',
    type: 'Boleta de venta',
    clientDoc: '96325874',
    client: 'Manuel Torres Guerrero',
    createdDate: '07 set. 2025 12:25',
    expiryDate: '14 set. 2025',
    vendor: 'Carlos Rueda',
    total: 324.75,
    status: 'Vencido',
    daysLeft: -9,
    statusColor: 'red'
  },
  {
    id: 'DRAFT-F001-00000009',
    type: 'Factura',
    clientDoc: '20963852741',
    client: 'Logística Express S.A.C.',
    createdDate: '06 set. 2025 14:15',
    expiryDate: '07 set. 2025',
    vendor: 'Bertha Flores',
    total: 823.60,
    status: 'Vencido',
    daysLeft: -16,
    statusColor: 'red'
  },
  {
    id: 'DRAFT-B001-00000012',
    type: 'Boleta de venta',
    clientDoc: '73625814',
    client: 'Sandra Jiménez Paredes',
    createdDate: '05 set. 2025 10:40',
    expiryDate: '12 set. 2025',
    vendor: 'Carlos Rueda',
    total: 156.30,
    status: 'Vencido',
    daysLeft: -11,
    statusColor: 'red'
  },
  {
    id: 'DRAFT-B001-00000011',
    type: 'Boleta de venta',
    clientDoc: '85296374',
    client: 'Raúl Moreno Castillo',
    createdDate: '04 set. 2025 17:20',
    expiryDate: '11 set. 2025',
    vendor: 'Bertha Flores',
    total: 289.40,
    status: 'Vencido',
    daysLeft: -12,
    statusColor: 'red'
  },
  {
    id: 'DRAFT-F001-00000008',
    type: 'Factura',
    clientDoc: '20147258369',
    client: 'Consultoría Global S.A.C.',
    createdDate: '03 set. 2025 11:55',
    expiryDate: '04 set. 2025',
    vendor: 'Carlos Rueda',
    total: 1180.25,
    status: 'Vencido',
    daysLeft: -19,
    statusColor: 'red'
  },
  {
    id: 'DRAFT-B001-00000010',
    type: 'Boleta de venta',
    clientDoc: '62851473',
    client: 'Claudia Vera Núñez',
    createdDate: '02 set. 2025 09:30',
    expiryDate: '09 set. 2025',
    vendor: 'Bertha Flores',
    total: 203.80,
    status: 'Vencido',
    daysLeft: -14,
    statusColor: 'red'
  },
  {
    id: 'DRAFT-B001-00000009',
    type: 'Boleta de venta',
    clientDoc: '14725836',
    client: 'Gabriel Ramos Silva',
    createdDate: '01 set. 2025 15:10',
    expiryDate: '08 set. 2025',
    vendor: 'Carlos Rueda',
    total: 178.65,
    status: 'Vencido',
    daysLeft: -15,
    statusColor: 'red'
  }
];
