// Catálogos SUNAT de solo lectura para Guías de Remisión Electrónica.
// Fuente autoritativa única — no duplicar en componentes.

export type EstadoCatalogo = 'Vigente' | 'No vigente';
export type RegulacionBienNormalizado = 'SPOT' | 'IVAP';
export type AplicacionDocumentoRelacionado = 'Remitente' | 'Transportista' | 'Ambas';
export type GrupoDocumentoRelacionado = 'Principal' | 'Otros';

// ─────────────────────────────────────────────────────────────
// 1. BIENES NORMALIZADOS (52 registros)
// ─────────────────────────────────────────────────────────────

export interface BienNormalizado {
  subpartidaNacional: string;
  descripcion: string;
  codigoProductoSunat: string;
  descripcionCodigoProducto?: string;
  regulacion: RegulacionBienNormalizado;
  estado: EstadoCatalogo;
}

export const BIENES_NORMALIZADOS: readonly BienNormalizado[] = [
  // Azúcares — SPOT
  { subpartidaNacional: '1701130000', descripcion: 'Azúcar de caña', codigoProductoSunat: '50161509', descripcionCodigoProducto: 'Caña de azúcar', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '1701140000', descripcion: 'Los demás azúcares de caña', codigoProductoSunat: '50161509', descripcionCodigoProducto: 'Caña de azúcar', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '1701910000', descripcion: 'Con adición de aromatizante o colorante', codigoProductoSunat: '50161509', descripcionCodigoProducto: 'Caña de azúcar', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '1701999000', descripcion: 'Los demás', codigoProductoSunat: '50161509', descripcionCodigoProducto: 'Caña de azúcar', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '1703100000', descripcion: 'Melaza de caña', codigoProductoSunat: '50161509', descripcionCodigoProducto: 'Caña de azúcar', regulacion: 'SPOT', estado: 'Vigente' },
  // Alcoholes — SPOT
  { subpartidaNacional: '2207100000', descripcion: 'Alcohol etílico sin desnaturalizar con grado alcohólico volumétrico superior o igual al 80 % vol', codigoProductoSunat: '12352104', descripcionCodigoProducto: 'Alcohol etílico', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2207200010', descripcion: 'Alcohol carburante', codigoProductoSunat: '12352104', descripcionCodigoProducto: 'Alcohol etílico', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2207200090', descripcion: 'Los demás', codigoProductoSunat: '12352104', descripcionCodigoProducto: 'Alcohol etílico', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2208901000', descripcion: 'Alcohol etílico sin desnaturalizar con grado alcohólico volumétrico inferior al 80 % vol', codigoProductoSunat: '12352104', descripcionCodigoProducto: 'Alcohol etílico', regulacion: 'SPOT', estado: 'Vigente' },
  // Arroces — IVAP
  { subpartidaNacional: '1006200000', descripcion: 'Arroz descascarillado (arroz cargo o arroz pardo)', codigoProductoSunat: '50221101', descripcionCodigoProducto: 'Arroz', regulacion: 'IVAP', estado: 'Vigente' },
  { subpartidaNacional: '1006300000', descripcion: 'Arroz semiblanqueado o blanqueado, incluso pulido o glaseado', codigoProductoSunat: '50221101', descripcionCodigoProducto: 'Arroz', regulacion: 'IVAP', estado: 'Vigente' },
  { subpartidaNacional: '1006400000', descripcion: 'Arroz partido', codigoProductoSunat: '50221101', descripcionCodigoProducto: 'Arroz', regulacion: 'IVAP', estado: 'Vigente' },
  { subpartidaNacional: '2302200000', descripcion: 'No vigente', codigoProductoSunat: '50221101', descripcionCodigoProducto: 'Arroz', regulacion: 'IVAP', estado: 'No vigente' },
  // Minerales de hierro — SPOT
  { subpartidaNacional: '2601110000', descripcion: 'Sin aglomerar', codigoProductoSunat: '11101601', descripcionCodigoProducto: 'Minerales de hierro', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2601120000', descripcion: 'Aglomerados', codigoProductoSunat: '11101601', descripcionCodigoProducto: 'Minerales de hierro', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2601200000', descripcion: 'Piritas de hierro tostadas (cenizas de piritas)', codigoProductoSunat: '11101601', descripcionCodigoProducto: 'Minerales de hierro', regulacion: 'SPOT', estado: 'Vigente' },
  // Otros minerales — SPOT
  { subpartidaNacional: '2602000000', descripcion: 'Minerales de manganeso y sus concentrados', codigoProductoSunat: '11101611', descripcionCodigoProducto: 'Minerales de manganeso', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2603000000', descripcion: 'Minerales de cobre y sus concentrados', codigoProductoSunat: '11101604', descripcionCodigoProducto: 'Minerales de cobre', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2604000000', descripcion: 'Minerales de níquel y sus concentrados', codigoProductoSunat: '11101606', descripcionCodigoProducto: 'Minerales de níquel', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2605000000', descripcion: 'Minerales de cobalto y sus concentrados', codigoProductoSunat: '11101615', descripcionCodigoProducto: 'Minerales de cobalto', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2606000000', descripcion: 'Minerales de aluminio y sus concentrados', codigoProductoSunat: '11101605', descripcionCodigoProducto: 'Minerales de aluminio', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2607000000', descripcion: 'Minerales de plomo y sus concentrados', codigoProductoSunat: '11101608', descripcionCodigoProducto: 'Minerales de plomo', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2608000010', descripcion: 'Concentrado de cinc de baja ley', codigoProductoSunat: '11101609', descripcionCodigoProducto: 'Minerales de cinc', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2608000090', descripcion: 'Los demás', codigoProductoSunat: '11101609', descripcionCodigoProducto: 'Minerales de cinc', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2609000000', descripcion: 'Minerales de estaño y sus concentrados', codigoProductoSunat: '11101610', descripcionCodigoProducto: 'Minerales de estaño', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2610000000', descripcion: 'Minerales de cromo y sus concentrados', codigoProductoSunat: '11101612', descripcionCodigoProducto: 'Minerales de cromo', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2611000000', descripcion: 'Minerales de volframio (tungsteno) y sus concentrados', codigoProductoSunat: '11101613', descripcionCodigoProducto: 'Minerales de volframio', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2612100000', descripcion: 'Minerales de uranio y sus concentrados', codigoProductoSunat: '11101603', descripcionCodigoProducto: 'Minerales de uranio', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2612200000', descripcion: 'Minerales de torio y sus concentrados', codigoProductoSunat: '11101620', descripcionCodigoProducto: 'Minerales de torio', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2613100000', descripcion: 'Tostados', codigoProductoSunat: '11101614', descripcionCodigoProducto: 'Minerales de molibdeno', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2613900000', descripcion: 'Los demás', codigoProductoSunat: '11101614', descripcionCodigoProducto: 'Minerales de molibdeno', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2614000000', descripcion: 'Minerales de titanio y sus concentrados', codigoProductoSunat: '11101602', descripcionCodigoProducto: 'Minerales de titanio', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2615100000', descripcion: 'Minerales de circonio y sus concentrados', codigoProductoSunat: '11101623', descripcionCodigoProducto: 'Minerales de circonio', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2615900000', descripcion: 'Los demás', codigoProductoSunat: '11101600', descripcionCodigoProducto: 'Otros minerales', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2616100000', descripcion: 'Minerales de plata y sus concentrados', codigoProductoSunat: '11101607', descripcionCodigoProducto: 'Minerales de plata', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2616901000', descripcion: 'Minerales de oro y sus concentrados', codigoProductoSunat: '11101616', descripcionCodigoProducto: 'Minerales de oro', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2616909000', descripcion: 'Los demás', codigoProductoSunat: '11101600', descripcionCodigoProducto: 'Otros minerales', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2617100000', descripcion: 'Minerales de antimonio y sus concentrados', codigoProductoSunat: '11101622', descripcionCodigoProducto: 'Minerales de antimonio', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2617900000', descripcion: 'Los demás', codigoProductoSunat: '11101600', descripcionCodigoProducto: 'Otros minerales', regulacion: 'SPOT', estado: 'Vigente' },
  // Escorias y residuos — SPOT
  { subpartidaNacional: '2618000000', descripcion: 'Escorias granuladas de la siderurgia', codigoProductoSunat: '11101701', descripcionCodigoProducto: 'Escorias y desechos metalúrgicos', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2619000000', descripcion: 'Escorias, batiduras y demás desperdicios de la siderurgia', codigoProductoSunat: '11101701', descripcionCodigoProducto: 'Escorias y desechos metalúrgicos', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2620110000', descripcion: 'Matas de galvanización', codigoProductoSunat: '11101701', descripcionCodigoProducto: 'Escorias y desechos metalúrgicos', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2620190000', descripcion: 'Los demás', codigoProductoSunat: '11101701', descripcionCodigoProducto: 'Escorias y desechos metalúrgicos', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2620210000', descripcion: 'Lodos de gasolina con plomo y lodos de compuestos antidetonantes con plomo', codigoProductoSunat: '11101701', descripcionCodigoProducto: 'Escorias y desechos metalúrgicos', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2620290000', descripcion: 'Los demás', codigoProductoSunat: '11101701', descripcionCodigoProducto: 'Escorias y desechos metalúrgicos', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2620300000', descripcion: 'Que contengan principalmente cobre', codigoProductoSunat: '11101701', descripcionCodigoProducto: 'Escorias y desechos metalúrgicos', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2620400000', descripcion: 'Que contengan principalmente aluminio', codigoProductoSunat: '11101701', descripcionCodigoProducto: 'Escorias y desechos metalúrgicos', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2620600000', descripcion: 'Que contengan arsénico, mercurio, talio o sus mezclas', codigoProductoSunat: '11101701', descripcionCodigoProducto: 'Escorias y desechos metalúrgicos', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2620910000', descripcion: 'Que contengan antimonio, berilio, cadmio, cromo o sus mezclas', codigoProductoSunat: '11101701', descripcionCodigoProducto: 'Escorias y desechos metalúrgicos', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2620990000', descripcion: 'Los demás', codigoProductoSunat: '11101701', descripcionCodigoProducto: 'Escorias y desechos metalúrgicos', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2621100000', descripcion: 'Cenizas y residuos procedentes de la incineración de desechos municipales', codigoProductoSunat: '11101701', descripcionCodigoProducto: 'Escorias y desechos metalúrgicos', regulacion: 'SPOT', estado: 'Vigente' },
  { subpartidaNacional: '2621900000', descripcion: 'Las demás', codigoProductoSunat: '11101701', descripcionCodigoProducto: 'Escorias y desechos metalúrgicos', regulacion: 'SPOT', estado: 'Vigente' },
] as const;


// ─────────────────────────────────────────────────────────────
// 2. DOCUMENTOS RELACIONADOS GRE (31 registros)
// ─────────────────────────────────────────────────────────────

export interface DocumentoRelacionadoGRE {
  codigo: string;
  documento: string;
  aplicacion: AplicacionDocumentoRelacionado;
  grupo: GrupoDocumentoRelacionado;
  estado: EstadoCatalogo;
}

export const DOCUMENTOS_RELACIONADOS_GRE: readonly DocumentoRelacionadoGRE[] = [
  { codigo: '01', documento: 'Factura', aplicacion: 'Ambas', grupo: 'Principal', estado: 'Vigente' },
  { codigo: '03', documento: 'Boleta de Venta', aplicacion: 'Ambas', grupo: 'Principal', estado: 'Vigente' },
  { codigo: '04', documento: 'Liquidación de Compra', aplicacion: 'Ambas', grupo: 'Principal', estado: 'Vigente' },
  { codigo: '09', documento: 'Guía de Remisión Remitente', aplicacion: 'Ambas', grupo: 'Principal', estado: 'Vigente' },
  { codigo: '12', documento: 'Ticket o cinta emitido por máquina registradora', aplicacion: 'Ambas', grupo: 'Principal', estado: 'Vigente' },
  { codigo: '31', documento: 'Guía de Remisión Transportista', aplicacion: 'Transportista', grupo: 'Principal', estado: 'Vigente' },
  { codigo: '48', documento: 'Comprobante de Operaciones – Ley N.° 29972', aplicacion: 'Ambas', grupo: 'Principal', estado: 'Vigente' },
  { codigo: '49', documento: 'Constancia de Depósito - IVAP (Ley 28211)', aplicacion: 'Remitente', grupo: 'Principal', estado: 'Vigente' },
  { codigo: '50', documento: 'Declaración Aduanera de Mercancías', aplicacion: 'Ambas', grupo: 'Principal', estado: 'Vigente' },
  { codigo: '52', documento: 'Declaración Simplificada (DS)', aplicacion: 'Ambas', grupo: 'Principal', estado: 'Vigente' },
  { codigo: '65', documento: 'Autorización de Circulación para transportar MATPEL – Callao', aplicacion: 'Transportista', grupo: 'Otros', estado: 'Vigente' },
  { codigo: '66', documento: 'Autorización de Circulación para transporte de carga y mercancías en Lima Metropolitana', aplicacion: 'Transportista', grupo: 'Otros', estado: 'Vigente' },
  { codigo: '67', documento: 'Permiso de Operación Especial para el servicio de transporte de MATPEL - MTC', aplicacion: 'Transportista', grupo: 'Otros', estado: 'Vigente' },
  { codigo: '68', documento: 'Habilitación Sanitaria de Transporte Terrestre de Productos Pesqueros y Acuícolas', aplicacion: 'Transportista', grupo: 'Otros', estado: 'Vigente' },
  { codigo: '69', documento: 'Permiso / Autorización de operación de transporte de mercancías', aplicacion: 'Transportista', grupo: 'Otros', estado: 'Vigente' },
  { codigo: '71', documento: 'Resolución de Adjudicación de bienes – SUNAT', aplicacion: 'Remitente', grupo: 'Otros', estado: 'Vigente' },
  { codigo: '72', documento: 'Resolución de Comiso de bienes – SUNAT', aplicacion: 'Remitente', grupo: 'Otros', estado: 'Vigente' },
  { codigo: '73', documento: 'Guía de Transporte Forestal o de Fauna - SERFOR', aplicacion: 'Remitente', grupo: 'Otros', estado: 'Vigente' },
  { codigo: '74', documento: 'Guía de Tránsito – SUCAMEC', aplicacion: 'Remitente', grupo: 'Otros', estado: 'Vigente' },
  { codigo: '75', documento: 'Autorización para operar como empresa de Saneamiento Ambiental – MINSA', aplicacion: 'Remitente', grupo: 'Otros', estado: 'Vigente' },
  { codigo: '76', documento: 'Autorización para manejo y recojo de residuos sólidos peligrosos y no peligrosos', aplicacion: 'Remitente', grupo: 'Otros', estado: 'Vigente' },
  { codigo: '77', documento: 'Certificado fitosanitario para la movilización de plantas, productos vegetales y otros artículos reglamentados', aplicacion: 'Remitente', grupo: 'Otros', estado: 'Vigente' },
  { codigo: '78', documento: 'Registro Único de Usuarios y Transportistas de Alcohol Etílico', aplicacion: 'Remitente', grupo: 'Otros', estado: 'Vigente' },
  { codigo: '80', documento: 'Constancia de Depósito – Detracción', aplicacion: 'Ambas', grupo: 'Principal', estado: 'Vigente' },
  { codigo: '81', documento: 'Código de autorización emitida por el SCOP', aplicacion: 'Remitente', grupo: 'Principal', estado: 'Vigente' },
  { codigo: '82', documento: 'Declaración jurada de mudanza', aplicacion: 'Transportista', grupo: 'Principal', estado: 'Vigente' },
  { codigo: '91', documento: 'Manifiesto de carga (MC)', aplicacion: 'Remitente', grupo: 'Principal', estado: 'Vigente' },
  { codigo: '92', documento: 'Cita u Orden de Entrega de Mercancías del Terminal Portuario', aplicacion: 'Remitente', grupo: 'Principal', estado: 'Vigente' },
  { codigo: '93', documento: 'Documento ZOFRATACNA', aplicacion: 'Transportista', grupo: 'Principal', estado: 'Vigente' },
  { codigo: '94', documento: 'Solicitud de Traslado - ZED', aplicacion: 'Transportista', grupo: 'Principal', estado: 'Vigente' },
  { codigo: '95', documento: 'Solicitud de Traslado - ZOFRATACNA', aplicacion: 'Transportista', grupo: 'Principal', estado: 'Vigente' },
] as const;

// ─────────────────────────────────────────────────────────────
// 3. ENTIDADES AUTORIZADORAS — Catálogo D-37 (12 registros)
// ─────────────────────────────────────────────────────────────

export interface EntidadAutorizadora {
  codigo: string;
  abreviatura: string;
  entidad: string;
  estado: EstadoCatalogo;
}

export const ENTIDADES_AUTORIZADORAS_D37: readonly EntidadAutorizadora[] = [
  { codigo: '01', abreviatura: 'SUCAMEC', entidad: 'Superintendencia Nacional de Control de Servicios de Seguridad, Armas, Municiones y Explosivos de Uso Civil', estado: 'Vigente' },
  { codigo: '02', abreviatura: 'DIGEMID', entidad: 'Dirección General de Medicamentos, Insumos y Drogas', estado: 'Vigente' },
  { codigo: '03', abreviatura: 'DIGESA', entidad: 'Dirección General de Salud Ambiental', estado: 'Vigente' },
  { codigo: '04', abreviatura: 'SENASA', entidad: 'Servicio Nacional de Sanidad Agraria', estado: 'Vigente' },
  { codigo: '05', abreviatura: 'SERFOR', entidad: 'Servicio Nacional Forestal y de Fauna Silvestre', estado: 'Vigente' },
  { codigo: '06', abreviatura: 'MTC', entidad: 'Ministerio de Transportes y Comunicaciones', estado: 'Vigente' },
  { codigo: '07', abreviatura: 'PRODUCE', entidad: 'Ministerio de la Producción', estado: 'Vigente' },
  { codigo: '08', abreviatura: 'MIN. AMBIENTE', entidad: 'Ministerio del Ambiente', estado: 'Vigente' },
  { codigo: '09', abreviatura: 'SANIPES', entidad: 'Organismo Nacional de Sanidad Pesquera', estado: 'Vigente' },
  { codigo: '10', abreviatura: 'MML', entidad: 'Municipalidad Metropolitana de Lima', estado: 'Vigente' },
  { codigo: '11', abreviatura: 'MINSA', entidad: 'Ministerio de Salud', estado: 'Vigente' },
  { codigo: '12', abreviatura: 'GR', entidad: 'Gobierno Regional', estado: 'Vigente' },
] as const;
