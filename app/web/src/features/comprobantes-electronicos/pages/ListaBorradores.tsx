import React, { useState } from 'react';
import { Search, Filter, Download, Printer, MoreHorizontal, ChevronDown, ChevronLeft, ChevronRight, Edit, Copy, Trash2, Send, Clock, AlertTriangle, FileText } from 'lucide-react';

type DraftStatus = 'Vigente' | 'Por vencer' | 'Vencido';
type StatusColor = 'green' | 'orange' | 'red';
interface Draft {
  id: string;
  type: string;
  clientDoc: string;
  client: string;
  createdDate: string;
  expiryDate: string;
  vendor: string;
  total: number;
  status: DraftStatus;
  daysLeft: number;
  statusColor: StatusColor;
}

interface DraftInvoicesModuleProps {
  hideSidebar?: boolean;
}

const DraftInvoicesModule: React.FC<DraftInvoicesModuleProps> = ({ hideSidebar }) => {
  const [showEmitPopup, setShowEmitPopup] = useState<boolean>(false);
  const [invalidDrafts, setInvalidDrafts] = useState<Draft[]>([]);
  const [validDrafts, setValidDrafts] = useState<Draft[]>([]);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showTotals, setShowTotals] = useState<boolean>(false);
  const [selectedDrafts, setSelectedDrafts] = useState<string[]>([]);
  const [showPrintPopup, setShowPrintPopup] = useState<boolean>(false);

  // Mock data para los borradores
  const mockDrafts: Draft[] = [
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

  // Leer borradores guardados en localStorage y mapearlos a Draft
  const localDraftsRaw = localStorage.getItem('borradores');
  let localDrafts: Draft[] = [];
  if (localDraftsRaw) {
    try {
      const parsed = JSON.parse(localDraftsRaw);
      localDrafts = parsed.map((d: any) => {
        // Calcular columnas faltantes
        const today = new Date();
        let expiryDate = d.fechaVencimiento || '';
        let daysLeft = 0;
        let status: DraftStatus = 'Vigente';
        let statusColor: StatusColor = 'green';
        if (expiryDate) {
          const expDate = new Date(expiryDate);
          daysLeft = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft < 0) {
            status = 'Vencido';
            statusColor = 'red';
          } else if (daysLeft <= 1) {
            status = 'Por vencer';
            statusColor = 'orange';
          }
        }
        return {
          id: d.id,
          type: d.tipo === 'factura' ? 'Factura' : 'Boleta de venta',
          clientDoc: d.clienteDoc || '',
          client: d.cliente || '',
          createdDate: today.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + today.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
          expiryDate: expiryDate ? new Date(expiryDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
          vendor: d.vendedor || 'Sin asignar',
          total: d.productos?.reduce?.((sum: number, p: any) => sum + (p.price * (p.quantity || 1)), 0) || 0,
          status,
          daysLeft,
          statusColor
        };
      });
    } catch (e) {
      localDrafts = [];
    }
  }

  // Unir mockDrafts y localDrafts
  const drafts: Draft[] = [...mockDrafts, ...localDrafts];

  // Función para parsear fechas en formato español (ej: "20 ago. 2025 19:17")
  const parseDraftDate = (dateStr: string): Date | null => {
    try {
      const spanishMonths = {
        'ene.': 0, 'feb.': 1, 'mar.': 2, 'abr.': 3, 'may.': 4, 'jun.': 5,
        'jul.': 6, 'ago.': 7, 'set.': 8, 'oct.': 9, 'nov.': 10, 'dic.': 11
      } as const;
      
      // Dividir fecha y hora
      const parts = dateStr.split(' ');
      if (parts.length < 3) return null;
      
      const day = parseInt(parts[0]);
      const month = spanishMonths[parts[1] as keyof typeof spanishMonths];
      const year = parseInt(parts[2]);
      
      if (isNaN(day) || month === undefined || isNaN(year)) return null;
      
      return new Date(year, month, day);
    } catch {
      return null;
    }
  };

  // Función para filtrar borradores por rango de fechas
  const filterDraftsByDateRange = (drafts: Draft[], fromDate: string, toDate: string): Draft[] => {
    if (!fromDate && !toDate) return drafts;
    
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    
    return drafts.filter(draft => {
      const draftDate = parseDraftDate(draft.createdDate);
      if (!draftDate) return true; // Include if can't parse date
      
      if (from && draftDate < from) return false;
      if (to && draftDate > to) return false;
      
      return true;
    });
  };

  // Aplicar filtros de fecha
  const filteredDrafts = filterDraftsByDateRange(drafts, dateFrom, dateTo);

  // Validación de fecha de creación para emisión masiva
  const validateDraftsForEmit = (selectedIds: string[]) => {
    const today = new Date();
    const invalid: Draft[] = [];
    const valid: Draft[] = [];
    selectedIds.forEach(id => {
      const draft = drafts.find(d => d.id === id);
      if (!draft) return;
      // Parsear fecha de creación
      let createdDate = draft.createdDate;
      let dateParts = createdDate.split(' ');
      let dateStr = dateParts[0];
      let [day, month, year] = dateStr.split(' ');
      // Convertir mes corto a número
      const months = {
        'ene.': 0, 'feb.': 1, 'mar.': 2, 'abr.': 3, 'may.': 4, 'jun.': 5,
        'jul.': 6, 'ago.': 7, 'set.': 8, 'oct.': 9, 'nov.': 10, 'dic.': 11
      } as const;
      let monthNum = months[month as keyof typeof months] ?? 0;
      let yearNum = parseInt(year);
      let dayNum = parseInt(day);
      let created = new Date(yearNum, monthNum, dayNum);
      // Calcular diferencia en días
      const diffDays = Math.floor((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      if (draft.type === 'Boleta de venta') {
        if (diffDays > 5) {
          invalid.push(draft);
        } else {
          valid.push(draft);
        }
      } else if (draft.type === 'Factura') {
        if (diffDays > 1) {
          invalid.push(draft);
        } else {
          valid.push(draft);
        }
      } else {
        valid.push(draft);
      }
    });
    setInvalidDrafts(invalid);
    setValidDrafts(valid);
    setShowEmitPopup(true);
  };

  const getStatusBadge = (status: DraftStatus, color: StatusColor, daysLeft: number) => {
    const colorClasses: Record<StatusColor, string> = {
      green: 'bg-green-100 text-green-800 border-green-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200',
      red: 'bg-red-100 text-red-800 border-red-200'
    };

    const getStatusText = (): string => {
      if (status === 'Vencido') return 'Vencido';
      if (status === 'Por vencer') return `Vence en ${daysLeft}d`;
      return `${daysLeft} días`;
    };

    return (
      <div className="flex items-center space-x-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClasses[color]}`}>
          {getStatusText()}
        </span>
        {status === 'Vencido' && (
          <AlertTriangle className="w-4 h-4 text-red-500" />
        )}
        {status === 'Por vencer' && (
          <Clock className="w-4 h-4 text-orange-500" />
        )}
      </div>
    );
  };

  const handleSelectDraft = (draftId: string) => {
    if (selectedDrafts.includes(draftId)) {
      setSelectedDrafts(selectedDrafts.filter(id => id !== draftId));
    } else {
      setSelectedDrafts([...selectedDrafts, draftId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedDrafts.length === filteredDrafts.length) {
      setSelectedDrafts([]);
    } else {
      setSelectedDrafts(filteredDrafts.map((draft) => draft.id));
    }
  };

  const totalRecords = filteredDrafts.length;
  const recordsPerPage = 25;
  const startRecord = (currentPage - 1) * recordsPerPage + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);

  // Calculate summary stats using filtered drafts
  const vigenteDrafts = filteredDrafts.filter(d => d.status === 'Vigente').length;
  const porVencerDrafts = filteredDrafts.filter(d => d.status === 'Por vencer').length;
  const vencidoDrafts = filteredDrafts.filter(d => d.status === 'Vencido').length;
  const totalValue = filteredDrafts.reduce((sum, draft) => sum + draft.total, 0);

  return (
    <div className={`min-h-screen bg-gray-50 ${hideSidebar ? '' : 'flex'}`}>
      {/* Sidebar */}
      {!hideSidebar && (
        <div className="w-64 bg-white border-r border-gray-200">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Comprobantes</h2>
            <nav className="space-y-2">
              <a href="#" className="flex items-center px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                <FileText className="w-4 h-4 mr-3" />
                Comprobantes
              </a>
              <a href="#" className="flex items-center px-3 py-2 bg-blue-100 text-blue-600 rounded-md font-medium">
                <Edit className="w-4 h-4 mr-3" />
                Borradores
                <span className="ml-auto bg-blue-200 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {filteredDrafts.length}
                </span>
              </a>
              <a href="#" className="flex items-center px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                <FileText className="w-4 h-4 mr-3" />
                Productos
              </a>
              <a href="#" className="flex items-center px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                <FileText className="w-4 h-4 mr-3" />
                Precios
              </a>
              <a href="#" className="flex items-center px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                <FileText className="w-4 h-4 mr-3" />
                Clientes
              </a>
              <a href="#" className="flex items-center px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                <FileText className="w-4 h-4 mr-3" />
                Indicadores
              </a>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <ChevronLeft className="w-5 h-5 text-gray-400" />
                  <h1 className="text-xl font-semibold text-gray-900">Borradores</h1>
                </div>

                {/* Date filters */}
                <div className="flex items-center space-x-3 ml-8">
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Desde</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-40 px-3 py-2 pr-10 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Hasta</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-40 px-3 py-2 pr-10 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Action icons */}
                <div className="flex items-center space-x-2 ml-6">
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-3">
                <button className="px-4 py-2 text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors text-sm font-medium">
                  Nueva factura
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium">
                  Nueva boleta
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedDrafts.length > 0 && (
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  {selectedDrafts.length} borrador{selectedDrafts.length > 1 ? 'es' : ''} seleccionado{selectedDrafts.length > 1 ? 's' : ''}
                </span>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-3">
                    <button className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
                      Emitir seleccionados
                    </button>
                    <button
                      className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-2 border border-blue-300 rounded-md bg-white hover:bg-blue-50"
                      onClick={() => validateDraftsForEmit(selectedDrafts)}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      <span>Emitir seleccionados</span>
                    </button>
                    <button className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
                      Duplicar seleccionados
                    </button>
                    <button className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 font-medium">
                      Eliminar seleccionados
                    </button>
                    <button 
                      onClick={() => setSelectedDrafts([])}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center ml-auto">
                    <button
                      className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-2 border border-blue-300 rounded-md bg-white hover:bg-blue-50 ml-4"
                      onClick={() => setShowPrintPopup(true)}
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      <span>Imprimir seleccionados</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Borradores Vigentes</p>
                  <p className="text-2xl font-bold text-green-600">{vigenteDrafts}</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Edit className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Por Vencer (24h)</p>
                  <p className="text-2xl font-bold text-orange-600">{porVencerDrafts}</p>
                </div>
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Vencidos</p>
                  <p className="text-2xl font-bold text-red-600">{vencidoDrafts}</p>
                </div>
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Valor Total</p>
                  <p className="text-2xl font-bold text-blue-600">S/ {totalValue.toFixed(2)}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 px-6 py-6">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedDrafts.length === filteredDrafts.length && filteredDrafts.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <span>N° Borrador</span>
                        <Search className="w-4 h-4 text-gray-400" />
                      </div>
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <span>Tipo</span>
                        <Filter className="w-4 h-4 text-gray-400" />
                      </div>
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <span>N° Doc Cliente</span>
                        <Search className="w-4 h-4 text-gray-400" />
                      </div>
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <span>Cliente</span>
                        <Search className="w-4 h-4 text-gray-400" />
                      </div>
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <span>Creado</span>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </div>
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <span>Vence</span>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </div>
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <span>Vendedor</span>
                        <Search className="w-4 h-4 text-gray-400" />
                      </div>
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <span>Estado</span>
                        <Filter className="w-4 h-4 text-gray-400" />
                      </div>
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDrafts.map((draft, index) => (
                    <tr key={index} className={`hover:bg-gray-50 transition-colors ${selectedDrafts.includes(draft.id) ? 'bg-blue-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedDrafts.includes(draft.id)}
                          onChange={() => handleSelectDraft(draft.id)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {/* Mostrar solo la serie para borradores nuevos (sin correlativo) */}
                        {draft.id.startsWith('DRAFT-')
                          ? draft.id.replace(/^DRAFT-([A-Z0-9]+)-.*/, '$1')
                          : draft.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {draft.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {draft.clientDoc}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {draft.client}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {draft.createdDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {draft.expiryDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {draft.vendor}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        S/ {draft.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(draft.status, draft.statusColor, draft.daysLeft)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        <div className="flex items-center space-x-2">
                          <button 
                            className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-100 rounded transition-colors"
                            title="Emitir"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-1.5 text-purple-500 hover:text-purple-700 hover:bg-purple-100 rounded transition-colors"
                            title="Duplicar"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="Más opciones"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => setShowTotals(!showTotals)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Mostrar totales
                  </button>
                </div>

                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">
                    {startRecord} – {endRecord} de {totalRecords}
                  </span>
                  
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setCurrentPage(Math.min(Math.ceil(totalRecords / recordsPerPage), currentPage + 1))}
                      disabled={currentPage >= Math.ceil(totalRecords / recordsPerPage)}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Totals Panel (conditionally shown) */}
      {/* Popup de confirmación de impresión masiva */}
      {/* Popup de validación de emisión masiva */}
      {showEmitPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-8 min-w-[340px] max-w-[90vw]">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Emisión masiva de borradores</h2>
            {invalidDrafts.length > 0 ? (
              <>
                <p className="mb-4 text-red-700 font-medium">Algunos borradores no pueden emitirse por exceder el plazo permitido por SUNAT:</p>
                <ul className="mb-4 text-sm text-gray-700 list-disc pl-5">
                  {invalidDrafts.map(draft => (
                    <li key={draft.id}>
                      <span className="font-semibold">{draft.id}</span> - {draft.type} - Fecha creación: {draft.createdDate}
                    </li>
                  ))}
                </ul>
                <p className="mb-4 text-gray-700">Solo se emitirán los borradores válidos. Los inválidos serán deseleccionados.</p>
              </>
            ) : (
              <p className="mb-6 text-gray-700">¿Desea emitir {validDrafts.length} borrador{validDrafts.length > 1 ? 'es' : ''} seleccionado{validDrafts.length > 1 ? 's' : ''}?</p>
            )}
            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                onClick={() => setShowEmitPopup(false)}
              >
                Cancelar
              </button>
              <button
                className={`px-4 py-2 text-sm text-white rounded-md ${validDrafts.length > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
                disabled={validDrafts.length === 0}
                onClick={() => {
                  // Aquí iría la lógica de emisión masiva solo para los válidos
                  setSelectedDrafts(validDrafts.map(d => d.id));
                  setShowEmitPopup(false);
                }}
              >
                Emitir
              </button>
            </div>
          </div>
        </div>
      )}
      {showPrintPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-8 min-w-[320px]">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">¿Imprimir borradores seleccionados?</h2>
            <p className="mb-6 text-gray-700">Se imprimirán {selectedDrafts.length} borrador{selectedDrafts.length > 1 ? 'es' : ''}.</p>
            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                onClick={() => setShowPrintPopup(false)}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
                onClick={() => {
                  // Aquí iría la lógica de impresión masiva
                  setShowPrintPopup(false);
                }}
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
          {showTotals && (
            <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen de Borradores</h3>
              <div className="grid grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{vigenteDrafts}</div>
                  <div className="text-sm text-gray-600">Borradores Vigentes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{porVencerDrafts}</div>
                  <div className="text-sm text-gray-600">Por Vencer (24h)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{vencidoDrafts}</div>
                  <div className="text-sm text-gray-600">Vencidos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">S/ {totalValue.toFixed(2)}</div>
                  <div className="text-sm text-gray-600">Valor Total</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DraftInvoicesModule;