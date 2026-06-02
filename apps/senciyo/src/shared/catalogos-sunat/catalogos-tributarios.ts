// Datos de catálogos tributarios SUNAT — fuente de verdad para Cat.51, 54, 52, 53 y 16.
// Cat.59 se reutiliza desde shared/payments/paymentMeans.ts (ya existente).
// Cat.05 se reutiliza desde configuracion-sistema/modelos/Tax.ts (ya existente).

import { lsKey } from '@/shared/tenant';
import type {
  TipoCatalogo,
  ItemCatalogoTributario,
  TipoOperacionTributaria,
  CodigoDetraccionTributaria,
  LeyendaTributaria,
  CargoDescuentoTributario,
  TipoPrecioTributario,
  ConfiguracionDetraccionEmpresa,
} from './tipos-catalogos-tributarios';

// ─────────────────────────────────────────────────
// Catálogo 51 — Tipos de operación
// ─────────────────────────────────────────────────

export const CATALOGO_51_TIPOS_OPERACION: TipoOperacionTributaria[] = [
  { catalogo: '51', codigo: '0101', descripcion: 'Venta interna', grupo: 'Venta interna', comprobantesAsociados: 'Factura, Boleta', visible: true, activo: true, implementacion: 'implementado' },
  { catalogo: '51', codigo: '0112', descripcion: 'Venta Interna - Sustenta Gastos Deducibles Persona Natural', grupo: 'Venta interna', comprobantesAsociados: 'Factura', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '0113', descripcion: 'Venta Interna-NRUS', grupo: 'Venta interna', comprobantesAsociados: 'Boleta', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '0200', descripcion: 'Exportación de Bienes', grupo: 'Exportación', comprobantesAsociados: 'Factura, Boleta', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '0201', descripcion: 'Exportación de Servicios – Prestación servicios realizados íntegramente en el país', grupo: 'Exportación', comprobantesAsociados: 'Factura, Boleta', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '0202', descripcion: 'Exportación de Servicios – Prestación de servicios de hospedaje No Domiciliado', grupo: 'Exportación', comprobantesAsociados: 'Factura', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '0203', descripcion: 'Exportación de Servicios – Transporte de navieras', grupo: 'Exportación', comprobantesAsociados: 'Factura, Boleta', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '0204', descripcion: 'Exportación de Servicios – Servicios a naves y aeronaves de bandera extranjera', grupo: 'Exportación', comprobantesAsociados: 'Factura, Boleta', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '0205', descripcion: 'Exportación de Servicios - Servicios que conformen un Paquete Turístico', grupo: 'Exportación', comprobantesAsociados: 'Factura', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '0206', descripcion: 'Exportación de Servicios – Servicios complementarios al transporte de carga', grupo: 'Exportación', comprobantesAsociados: 'Factura, Boleta', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '0207', descripcion: 'Exportación de Servicios – Suministro de energía eléctrica a favor de sujetos domiciliados en ZED', grupo: 'Exportación', comprobantesAsociados: 'Factura, Boleta', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '0208', descripcion: 'Exportación de Servicios – Prestación servicios realizados parcialmente en el extranjero', grupo: 'Exportación', comprobantesAsociados: 'Factura, Boleta', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '0301', descripcion: 'Operaciones con Carta de porte aéreo (emitidas en el ámbito nacional)', grupo: 'Transporte', comprobantesAsociados: 'Factura, Boleta', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '0302', descripcion: 'Operaciones de Transporte ferroviario de pasajeros', grupo: 'Transporte', comprobantesAsociados: 'Factura, Boleta', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '0401', descripcion: 'Ventas no domiciliados que no califican como exportación', grupo: 'No domiciliados', comprobantesAsociados: 'Factura, Boleta', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '0501', descripcion: 'Compra interna', grupo: 'Liquidación de compra', comprobantesAsociados: 'Liquidación de compra', visible: false, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '0502', descripcion: 'Anticipos', grupo: 'Liquidación de compra', comprobantesAsociados: 'Liquidación de compra', visible: false, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '0503', descripcion: 'Compra de oro', grupo: 'Liquidación de compra', comprobantesAsociados: 'Liquidación de compra', visible: false, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '1001', descripcion: 'Operación Sujeta a Detracción', grupo: 'Detracción', comprobantesAsociados: 'Factura, Boleta', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '1002', descripcion: 'Operación Sujeta a Detracción - Recursos Hidrobiológicos', grupo: 'Detracción', comprobantesAsociados: 'Factura, Boleta', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '1003', descripcion: 'Operación Sujeta a Detracción - Servicios de Transporte Pasajeros', grupo: 'Detracción', comprobantesAsociados: 'Factura, Boleta', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '1004', descripcion: 'Operación Sujeta a Detracción - Servicios de Transporte Carga', grupo: 'Detracción', comprobantesAsociados: 'Factura, Boleta', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '2001', descripcion: 'Operación Sujeta a Percepción', grupo: 'Percepción', comprobantesAsociados: 'Factura, Boleta', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '2002', descripcion: 'Operación sujeta a Retención de Renta de segunda categoría', grupo: 'Retención', comprobantesAsociados: 'Factura', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '2100', descripcion: 'Créditos a empresas', grupo: 'Operaciones financieras', comprobantesAsociados: 'Factura, Boleta', visible: false, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '2101', descripcion: 'Créditos de consumo revolvente', grupo: 'Operaciones financieras', comprobantesAsociados: 'Factura, Boleta', visible: false, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '2102', descripcion: 'Créditos de consumo no revolvente', grupo: 'Operaciones financieras', comprobantesAsociados: 'Factura, Boleta', visible: false, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '2103', descripcion: 'Otras operaciones no gravadas - Empresas del sistema financiero y cooperativas de ahorro y crédito', grupo: 'Operaciones financieras', comprobantesAsociados: 'Factura, Boleta', visible: false, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '2104', descripcion: 'Otras operaciones no gravadas - Empresas del sistema de seguros', grupo: 'Operaciones financieras', comprobantesAsociados: 'Factura, Boleta', visible: false, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '2105', descripcion: 'Comprobante emitido por AFP', grupo: 'AFP', comprobantesAsociados: 'Boleta', visible: false, activo: true, implementacion: 'pendiente' },
  { catalogo: '51', codigo: '2106', descripcion: 'Venta Nacional a Turistas - Tax Free', grupo: 'Tax Free', comprobantesAsociados: 'Factura', visible: false, activo: true, implementacion: 'pendiente' },
];

// ─────────────────────────────────────────────────
// Catálogo 54 — Bienes y servicios sujetos a detracción
// Tasas según apéndices SUNAT, R.S. N.° 183-2004/SUNAT y normas modificatorias.
// tipoPorcentaje: fijo = tasa única; condicional = depende de condición SUNAT;
//                pendiente = verificar fuente oficial antes de usar en emisión.
// ─────────────────────────────────────────────────

export const CATALOGO_54_DETRACCIONES: CodigoDetraccionTributaria[] = [
  { catalogo: '54', codigo: '001', descripcion: 'Azúcar y melaza de caña', tipoOperacionRelacionado: '1001', clasificacion: 'Bien', porcentajeNormativo: 10, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '002', descripcion: 'Arroz', tipoOperacionRelacionado: '1001', clasificacion: 'Bien', porcentajeNormativo: null, tipoPorcentaje: 'pendiente', notaPorcentaje: 'Validar si corresponde al IVAP/arroz pilado u otra tabla específica antes de usarlo en emisión.', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '003', descripcion: 'Alcohol etílico', tipoOperacionRelacionado: '1001', clasificacion: 'Bien', porcentajeNormativo: 10, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '004', descripcion: 'Recursos hidrobiológicos', tipoOperacionRelacionado: '1002', clasificacion: 'Recurso hidrobiológico', porcentajeNormativo: null, tipoPorcentaje: 'condicional', notaPorcentaje: 'SUNAT: 4% si el proveedor figura en el listado SUNAT y cumple condiciones; 10% en caso contrario. No usar tasa automática sin validar condición.', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '005', descripcion: 'Maíz amarillo duro', tipoOperacionRelacionado: '1001', clasificacion: 'Bien', porcentajeNormativo: 4, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '007', descripcion: 'Caña de azúcar', tipoOperacionRelacionado: '1001', clasificacion: 'Bien', porcentajeNormativo: 10, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '008', descripcion: 'Madera', tipoOperacionRelacionado: '1001', clasificacion: 'Bien', porcentajeNormativo: 4, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '009', descripcion: 'Arena y piedra', tipoOperacionRelacionado: '1001', clasificacion: 'Bien', porcentajeNormativo: 10, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '010', descripcion: 'Residuos, subproductos, desechos, recortes y desperdicios', tipoOperacionRelacionado: '1001', clasificacion: 'Bien', porcentajeNormativo: 15, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '011', descripcion: 'Bienes gravados con el IGV, o renuncia a la exoneración', tipoOperacionRelacionado: '1001', clasificacion: 'Bien', porcentajeNormativo: 10, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '012', descripcion: 'Intermediación laboral y tercerización', tipoOperacionRelacionado: '1001', clasificacion: 'Servicio', porcentajeNormativo: 12, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '013', descripcion: 'Animales vivos', tipoOperacionRelacionado: '1001', clasificacion: 'Bien', porcentajeNormativo: 4, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '014', descripcion: 'Carnes y despojos comestibles', tipoOperacionRelacionado: '1001', clasificacion: 'Bien', porcentajeNormativo: 4, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '015', descripcion: 'Abonos, cueros y pieles de origen animal', tipoOperacionRelacionado: '1001', clasificacion: 'Bien', porcentajeNormativo: 10, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '016', descripcion: 'Aceite de pescado', tipoOperacionRelacionado: '1001', clasificacion: 'Bien', porcentajeNormativo: 10, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '017', descripcion: 'Harina, polvo y "pellets" de pescado, crustáceos, moluscos y demás invertebrados acuáticos', tipoOperacionRelacionado: '1002', clasificacion: 'Recurso hidrobiológico', porcentajeNormativo: 4, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '019', descripcion: 'Arrendamiento de bienes muebles', tipoOperacionRelacionado: '1001', clasificacion: 'Servicio', porcentajeNormativo: 10, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '020', descripcion: 'Mantenimiento y reparación de bienes muebles', tipoOperacionRelacionado: '1001', clasificacion: 'Servicio', porcentajeNormativo: 12, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '021', descripcion: 'Movimiento de carga', tipoOperacionRelacionado: '1001', clasificacion: 'Servicio', porcentajeNormativo: 10, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '022', descripcion: 'Otros servicios empresariales', tipoOperacionRelacionado: '1001', clasificacion: 'Servicio', porcentajeNormativo: 12, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '023', descripcion: 'Leche', tipoOperacionRelacionado: '1001', clasificacion: 'Bien', porcentajeNormativo: 4, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '024', descripcion: 'Comisión mercantil', tipoOperacionRelacionado: '1001', clasificacion: 'Servicio', porcentajeNormativo: 10, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '025', descripcion: 'Fabricación de bienes por encargo', tipoOperacionRelacionado: '1001', clasificacion: 'Servicio', porcentajeNormativo: 10, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '026', descripcion: 'Servicio de transporte de personas', tipoOperacionRelacionado: '1003', clasificacion: 'Transporte pasajeros', porcentajeNormativo: 10, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '027', descripcion: 'Servicio de transporte de carga', tipoOperacionRelacionado: '1004', clasificacion: 'Transporte carga', porcentajeNormativo: 4, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '028', descripcion: 'Transporte de pasajeros', tipoOperacionRelacionado: '1003', clasificacion: 'Transporte pasajeros', porcentajeNormativo: 10, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '030', descripcion: 'Contratos de construcción', tipoOperacionRelacionado: '1001', clasificacion: 'Construcción', porcentajeNormativo: 4, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '031', descripcion: 'Oro gravado con el IGV', tipoOperacionRelacionado: '1001', clasificacion: 'Bien', porcentajeNormativo: 10, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '032', descripcion: 'Paprika y otros frutos de los géneros capsicum o pimienta', tipoOperacionRelacionado: '1001', clasificacion: 'Bien', porcentajeNormativo: 10, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '034', descripcion: 'Minerales metálicos no auríferos', tipoOperacionRelacionado: '1001', clasificacion: 'Bien', porcentajeNormativo: 10, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '035', descripcion: 'Bienes exonerados del IGV', tipoOperacionRelacionado: '1001', clasificacion: 'Bien', porcentajeNormativo: 1.5, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '036', descripcion: 'Oro y demás minerales metálicos exonerados del IGV', tipoOperacionRelacionado: '1001', clasificacion: 'Bien', porcentajeNormativo: 1.5, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '037', descripcion: 'Demás servicios gravados con el IGV', tipoOperacionRelacionado: '1001', clasificacion: 'Servicio', porcentajeNormativo: 12, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '039', descripcion: 'Minerales no metálicos', tipoOperacionRelacionado: '1001', clasificacion: 'Bien', porcentajeNormativo: 10, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '040', descripcion: 'Bien inmueble gravado con IGV', tipoOperacionRelacionado: '1001', clasificacion: 'Bien inmueble', porcentajeNormativo: 4, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '041', descripcion: 'Plomo', tipoOperacionRelacionado: '1001', clasificacion: 'Bien', porcentajeNormativo: 15, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '044', descripcion: 'Servicio de beneficio de minerales metálicos gravado con el IGV', tipoOperacionRelacionado: '1001', clasificacion: 'Servicio', porcentajeNormativo: 12, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '045', descripcion: 'Minerales de oro y sus concentrados gravados con el IGV', tipoOperacionRelacionado: '1001', clasificacion: 'Bien', porcentajeNormativo: 10, tipoPorcentaje: 'fijo', visible: true, activo: true, implementacion: 'pendiente' },
  { catalogo: '54', codigo: '099', descripcion: 'Ley 30737', tipoOperacionRelacionado: '1001', clasificacion: 'Especial', porcentajeNormativo: null, tipoPorcentaje: 'pendiente', notaPorcentaje: 'Validar tratamiento normativo específico de Ley 30737 antes de usar en emisión.', visible: true, activo: true, implementacion: 'pendiente' },
];

// ─────────────────────────────────────────────────
// Catálogo 52 — Leyendas
// ─────────────────────────────────────────────────

export const CATALOGO_52_LEYENDAS: LeyendaTributaria[] = [
  { catalogo: '52', codigo: '1000', descripcion: 'Monto en Letras', grupo: 'General', visible: true, activo: true },
  { catalogo: '52', codigo: '1002', descripcion: 'TRANSFERENCIA GRATUITA DE UN BIEN Y/O SERVICIO PRESTADO GRATUITAMENTE', grupo: 'Gratuita', visible: true, activo: true },
  { catalogo: '52', codigo: '2000', descripcion: 'COMPROBANTE DE PERCEPCIÓN', grupo: 'Percepción', visible: true, activo: true },
  { catalogo: '52', codigo: '2001', descripcion: 'BIENES TRANSFERIDOS EN LA AMAZONÍA REGIÓN SELVA PARA SER CONSUMIDOS EN LA MISMA', grupo: 'Amazonía', visible: false, activo: true },
  { catalogo: '52', codigo: '2002', descripcion: 'SERVICIOS PRESTADOS EN LA AMAZONÍA REGIÓN SELVA PARA SER CONSUMIDOS EN LA MISMA', grupo: 'Amazonía', visible: false, activo: true },
  { catalogo: '52', codigo: '2003', descripcion: 'CONTRATOS DE CONSTRUCCIÓN EJECUTADOS EN LA AMAZONÍA REGIÓN SELVA', grupo: 'Amazonía', visible: false, activo: true },
  { catalogo: '52', codigo: '2004', descripcion: 'Agencia de Viaje - Paquete turístico', grupo: 'Agencia de viaje', visible: false, activo: true },
  { catalogo: '52', codigo: '2005', descripcion: 'Venta realizada por emisor itinerante', grupo: 'Venta itinerante', visible: false, activo: true },
  { catalogo: '52', codigo: '2006', descripcion: 'Operación sujeta a detracción', grupo: 'Detracción', visible: true, activo: true },
  { catalogo: '52', codigo: '2007', descripcion: 'Operación sujeta al IVAP', grupo: 'IVAP', visible: true, activo: true },
  { catalogo: '52', codigo: '2008', descripcion: 'VENTA EXONERADA DEL IGV-ISC-IPM. PROHIBIDA LA VENTA FUERA DE LA ZONA COMERCIAL DE TACNA', grupo: 'Tacna', visible: false, activo: true },
  { catalogo: '52', codigo: '2009', descripcion: 'PRIMERA VENTA DE MERCANCÍA IDENTIFICABLE ENTRE USUARIOS DE LA ZONA COMERCIAL', grupo: 'Zona comercial', visible: false, activo: true },
  { catalogo: '52', codigo: '2010', descripcion: 'Restitución Simplificado de Derechos Arancelarios', grupo: 'Exportación', visible: false, activo: true },
  { catalogo: '52', codigo: '2011', descripcion: 'EXPORTACION DE SERVICIOS - DECRETO LEGISLATIVO N° 919', grupo: 'Exportación', visible: true, activo: true },
  { catalogo: '52', codigo: '2012', descripcion: 'Observaciones relacionadas con el traslado de mercaderías', grupo: 'Traslado', visible: false, activo: true },
];

// ─────────────────────────────────────────────────
// Catálogo 53 — Cargos, descuentos y otras deducciones
// ─────────────────────────────────────────────────

export const CATALOGO_53_CARGOS_DESCUENTOS: CargoDescuentoTributario[] = [
  { catalogo: '53', codigo: '00', descripcion: 'Descuentos que afectan la base imponible del IGV/IVAP', nivel: 'Item', grupo: 'Descuento', visible: true, activo: true },
  { catalogo: '53', codigo: '01', descripcion: 'Descuentos que no afectan la base imponible del IGV/IVAP', nivel: 'Item', grupo: 'Descuento', visible: true, activo: true },
  { catalogo: '53', codigo: '02', descripcion: 'Descuentos globales que afectan la base imponible del IGV/IVAP', nivel: 'Global', grupo: 'Descuento', visible: true, activo: true },
  { catalogo: '53', codigo: '03', descripcion: 'Descuentos globales que no afectan la base imponible del IGV/IVAP', nivel: 'Global', grupo: 'Descuento', visible: true, activo: true },
  { catalogo: '53', codigo: '04', descripcion: 'Descuentos globales por anticipos gravados que afectan la base imponible del IGV/IVAP', nivel: 'Global', grupo: 'Anticipo', visible: true, activo: true },
  { catalogo: '53', codigo: '05', descripcion: 'Descuentos globales por anticipos exonerados', nivel: 'Global', grupo: 'Anticipo', visible: true, activo: true },
  { catalogo: '53', codigo: '06', descripcion: 'Descuentos globales por anticipos inafectos', nivel: 'Global', grupo: 'Anticipo', visible: true, activo: true },
  { catalogo: '53', codigo: '07', descripcion: 'Factor de compensación - Decreto de urgencia N. 010-2004', nivel: 'Item', grupo: 'Factor', visible: false, activo: true },
  { catalogo: '53', codigo: '20', descripcion: 'Anticipo de ISC', nivel: 'Global', grupo: 'Anticipo', visible: true, activo: true },
  { catalogo: '53', codigo: '45', descripcion: 'FISE', nivel: 'Global', grupo: 'Cargo', visible: false, activo: true },
  { catalogo: '53', codigo: '46', descripcion: 'Recargo al consumo y/o propinas', nivel: 'Global', grupo: 'Cargo', visible: true, activo: true },
  { catalogo: '53', codigo: '47', descripcion: 'Cargos que afectan la base imponible del IGV/IVAP', nivel: 'Item', grupo: 'Cargo', visible: true, activo: true },
  { catalogo: '53', codigo: '48', descripcion: 'Cargos que no afectan la base imponible del IGV/IVAP', nivel: 'Item', grupo: 'Cargo', visible: true, activo: true },
  { catalogo: '53', codigo: '49', descripcion: 'Cargos globales que afectan la base imponible del IGV/IVAP', nivel: 'Global', grupo: 'Cargo', visible: true, activo: true },
  { catalogo: '53', codigo: '50', descripcion: 'Cargos globales que no afectan la base imponible del IGV/IVAP', nivel: 'Global', grupo: 'Cargo', visible: true, activo: true },
  { catalogo: '53', codigo: '51', descripcion: 'Percepción venta interna', nivel: 'Global', grupo: 'Percepción', visible: true, activo: true },
  { catalogo: '53', codigo: '52', descripcion: 'Percepción a la adquisición de combustible', nivel: 'Global', grupo: 'Percepción', visible: true, activo: true },
  { catalogo: '53', codigo: '53', descripcion: 'Percepción realizada al agente de percepción con tasa especial', nivel: 'Global', grupo: 'Percepción', visible: true, activo: true },
  { catalogo: '53', codigo: '54', descripcion: 'Factor de aportación - Decreto de urgencia N. 010-2004', nivel: 'Item', grupo: 'Factor', visible: false, activo: true },
  { catalogo: '53', codigo: '61', descripcion: 'Retención de renta por anticipos', nivel: 'Global', grupo: 'Retención', visible: true, activo: true },
  { catalogo: '53', codigo: '62', descripcion: 'Retención del IGV', nivel: 'Global', grupo: 'Retención', visible: true, activo: true },
  { catalogo: '53', codigo: '63', descripcion: 'Retención de renta de segunda categoría', nivel: 'Global', grupo: 'Retención', visible: true, activo: true },
];

// ─────────────────────────────────────────────────
// Catálogo 16 — Tipo de precio de venta unitario
// ─────────────────────────────────────────────────

export const CATALOGO_16_TIPOS_PRECIO: TipoPrecioTributario[] = [
  { catalogo: '16', codigo: '01', descripcion: 'Precio unitario (incluye el IGV)', uso: 'Operación onerosa', visible: true, activo: true },
  { catalogo: '16', codigo: '02', descripcion: 'Valor referencial unitario en operaciones no onerosas (Gratuitas)', uso: 'Operación gratuita', visible: true, activo: true },
  { catalogo: '16', codigo: '03', descripcion: 'Tarifas reguladas', uso: 'Tarifa regulada', visible: true, activo: true },
];

// ─────────────────────────────────────────────────
// Helpers de acceso unificado
// ─────────────────────────────────────────────────

export function listarTiposOperacion(): TipoOperacionTributaria[] {
  return CATALOGO_51_TIPOS_OPERACION;
}

export function listarCodigosDetraccion(): CodigoDetraccionTributaria[] {
  return CATALOGO_54_DETRACCIONES;
}

export function listarLeyendasTributarias(): LeyendaTributaria[] {
  return CATALOGO_52_LEYENDAS;
}

export function listarCargosDescuentos(): CargoDescuentoTributario[] {
  return CATALOGO_53_CARGOS_DESCUENTOS;
}

export function listarTiposPrecio(): TipoPrecioTributario[] {
  return CATALOGO_16_TIPOS_PRECIO;
}

export function obtenerCatalogoTributario(tipo: TipoCatalogo): ItemCatalogoTributario[] {
  switch (tipo) {
    case '51': return listarTiposOperacion();
    case '54': return listarCodigosDetraccion();
    case '52': return listarLeyendasTributarias();
    case '53': return listarCargosDescuentos();
    case '16': return listarTiposPrecio();
  }
}

export function buscarItemCatalogoTributario(
  tipo: TipoCatalogo,
  codigo: string
): ItemCatalogoTributario | undefined {
  return obtenerCatalogoTributario(tipo).find((item) => item.codigo === codigo);
}

export function esTipoOperacionDetraccion(codigo: string): boolean {
  return ['1001', '1002', '1003', '1004'].includes(codigo);
}

export function esTipoOperacionExportacion(codigo: string): boolean {
  return codigo.startsWith('02');
}

// ─────────────────────────────────────────────────
// Persistencia de configuración de detracción de empresa
// Patrón equivalente a shared/payments/paymentMeans.ts
// ─────────────────────────────────────────────────

const CLAVE_CONFIG_DETRACCION = 'tributaria_config_detraccion_v1';

const CONFIG_DETRACCION_DEFECTO: ConfiguracionDetraccionEmpresa = {
  cuentaBancoNacion: '',
  redondearMonto: false,
  medioPagoSunatPorDefecto: '001',
};

export function cargarConfiguracionDetraccion(): ConfiguracionDetraccionEmpresa {
  if (typeof window === 'undefined') return CONFIG_DETRACCION_DEFECTO;
  try {
    const raw = window.localStorage.getItem(lsKey(CLAVE_CONFIG_DETRACCION));
    if (!raw) return CONFIG_DETRACCION_DEFECTO;
    return { ...CONFIG_DETRACCION_DEFECTO, ...(JSON.parse(raw) as Partial<ConfiguracionDetraccionEmpresa>) };
  } catch {
    return CONFIG_DETRACCION_DEFECTO;
  }
}

export function guardarConfiguracionDetraccion(config: ConfiguracionDetraccionEmpresa): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(lsKey(CLAVE_CONFIG_DETRACCION), JSON.stringify(config));
  } catch {
    // No bloquear la UI si falla la persistencia
  }
}
