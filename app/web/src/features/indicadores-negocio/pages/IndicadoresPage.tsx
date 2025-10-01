import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
} from "recharts";
import DetalleVentasDiariasModal from "../components/DetalleVentasDiariasModal";
import DetalleCrecimientoModal from "../components/DetalleCrecimientoModal";
import Toolbar from "../components/Toolbar";
import { TrendingUp, Users, ShoppingCart, DollarSign, Award } from "lucide-react";

type VentaDiaria = {
  fecha: string;
  ventas: number;
  igv?: number;
  comprobantes: number;
  ticket: number;
  boletas?: number;
  facturas?: number;
};

// Ícono 1: círculo naranja con número 1 blanco (centrado y visible)
const IconOne: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="22" fill="#E8A354" />
    <text x="24" y="28" textAnchor="middle" alignmentBaseline="middle" fontSize="24" fontWeight="bold" fill="#fff">
      1
    </text>
  </svg>
);

const IconTwo: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="22" fill="#8C98B8" />
    <text x="24" y="28" textAnchor="middle" alignmentBaseline="middle" fontSize="24" fontWeight="bold" fill="#fff">
      2
    </text>
  </svg>
);

// Ícono 3: círculo marrón con número 3 blanco (centrado y visible)
const IconThree: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="22" fill="#B1CBED" />
    <text x="24" y="28" textAnchor="middle" alignmentBaseline="middle" fontSize="24" fontWeight="bold" fill="#fff">
      3
    </text>
  </svg>
);

const IndicadoresPage: React.FC = () => {
  // Datos para el gráfico de barras (incluyo boletas/facturas para mantener consistencia con el modal)
  const ventasDiariasData: VentaDiaria[] = [
    { fecha: "09/09", ventas: 1200, igv: 216, comprobantes: 30, boletas: 18, facturas: 12, ticket: 40.0 },
    { fecha: "08/09", ventas: 3200, igv: 576, comprobantes: 60, boletas: 36, facturas: 24, ticket: 53.33 },
    { fecha: "07/09", ventas: 4800, igv: 864, comprobantes: 90, boletas: 54, facturas: 36, ticket: 53.33 },
    { fecha: "06/09", ventas: 2500, igv: 450, comprobantes: 50, boletas: 30, facturas: 20, ticket: 50.0 },
    { fecha: "05/09", ventas: 4100, igv: 738, comprobantes: 80, boletas: 48, facturas: 32, ticket: 51.25 },
    { fecha: "04/09", ventas: 4700, igv: 846, comprobantes: 95, boletas: 57, facturas: 38, ticket: 49.47 },
    { fecha: "03/09", ventas: 1800, igv: 324, comprobantes: 40, boletas: 24, facturas: 16, ticket: 45.0 },
    { fecha: "02/09", ventas: 3500, igv: 630, comprobantes: 70, boletas: 42, facturas: 28, ticket: 50.0 },
    { fecha: "01/09", ventas: 3900, igv: 702, comprobantes: 75, boletas: 45, facturas: 30, ticket: 52.0 },
  ];

  // Datos para el gráfico donut
  const comprobanteData = [
    { name: "Facturas", value: 324500.25, color: "#2563eb" }, // azul intenso
    { name: "Boletas", value: 161250.25, color: "#64B5F6" }, // azul claro
  ];

  // Calcular porcentaje para tooltip
  const totalComprobantes = comprobanteData.reduce((acc, curr) => acc + curr.value, 0);
  const comprobanteDataWithPercent = comprobanteData.map((item) => ({
    ...item,
    percent: ((item.value / totalComprobantes) * 100).toFixed(1),
  }));

  // Modal detalle ventas diarias
  const [openDetalleModal, setOpenDetalleModal] = useState(false);
  // Modal detalle crecimiento
  const [openDetalleCrecimientoModal, setOpenDetalleCrecimientoModal] = useState(false);

  // -------------------
  // Toolbar - estados
  // -------------------
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState<string>("Este mes");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");
  const [establecimiento, setEstablecimiento] = useState<string>("");

  const handleCrearComprobante = (): void => {
    // Navegar a la vista de Nuevo Comprobante
    navigate("/comprobantes/nuevo");
  };

  const handleFiltrar = (): void => {
    // Mantengo comportamiento simple: log + alerta (interactivo)
    console.log("Filtros aplicados:", {
      periodo,
      fechaDesde,
      fechaHasta,
      establecimiento,
    });
    alert(
      `Filtros aplicados:\nPeriodo: ${periodo}\nDesde: ${fechaDesde || "No seleccionado"}\nHasta: ${fechaHasta || "No seleccionado"}\nEstablecimiento: ${establecimiento || "Todos"}`
    );
  };

  return (
    <div>
      {/* Toolbar Component */}
      <Toolbar
        onFilter={handleFiltrar}
        onCreateDocument={handleCrearComprobante}
        onPeriodChange={(period) => setPeriodo(period)}
        onEstablishmentChange={(establishment) => setEstablecimiento(establishment)}
        onDateRangeChange={(startDate, endDate) => {
          setFechaDesde(startDate);
          setFechaHasta(endDate);
        }}
      />

      <div className="px-2 py-4">
        {/* KPIs principales */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          {/* Ventas del Mes */}
          <div className="bg-blue-50 rounded-xl p-6 shadow-sm border border-blue-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="p-3 bg-blue-200 rounded-lg">
                  <ShoppingCart className="h-6 w-6 text-blue-800" />
                </span>
                <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded-full">+12.5%</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Total de Ventas</h3>
              <div className="text-2xl font-bold text-gray-900 mb-1">S/. 128,450</div>
              <div className="text-sm text-gray-500">Periodo seleccionado</div>
            </div>
          </div>

          {/* Nuevos Clientes */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 shadow-sm border border-green-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-200 rounded-lg">
                <Users className="h-6 w-6 text-green-800" />
              </div>
              <span className="text-xs font-medium text-green-800 bg-green-200/50 px-2 py-1 rounded-full">+8</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Nuevos Clientes</h3>
            <p className="text-2xl font-bold text-gray-900">45</p>
            <p className="text-sm text-gray-600">este mes</p>
          </div>

          {/* Total comprobantes emitidos */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 shadow-sm border border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-200 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-800" />
              </div>
              <span className="text-xs font-medium text-purple-800 bg-purple-200/50 px-2 py-1 rounded-full">+5.8%</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Comprobantes Emitidos</h3>
            <p className="text-2xl font-bold text-gray-900">1,245</p>
            <p className="text-sm text-gray-600">En este periodo</p>
          </div>

          {/* Crecimiento */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 shadow-sm border border-orange-200 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-200 rounded-lg">
                <TrendingUp className="h-6 w-6 text-orange-800" />
              </div>
              <span className="text-xs font-medium text-orange-800 bg-orange-200/50 px-2 py-1 rounded-full">+18.2%</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Crecimiento</h3>
              <p className="text-2xl font-bold text-gray-900">vs. mes anterior</p>
              <p className="text-sm text-gray-600">Sólido desempeño</p>
            </div>
            <div className="flex justify-end items-end mt-2">
              <button
                className="text-orange-700 text-sm font-medium hover:underline"
                style={{ minWidth: 'auto', padding: 0 }}
                onClick={() => setOpenDetalleCrecimientoModal(true)}
              >
                Ver detalles
              </button>
            </div>
          </div>
        </div>

      {/* Cards de ventas por comprobante y establecimiento */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Ventas por Tipo de Comprobante */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Ventas por Tipo de Comprobante</h3>
            <span className="text-sm text-gray-500 font-normal">Periodo: 01/09/2025 – 15/09/2025</span>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-20">
            {/* Lado izquierdo: Datos, leyendas y barras */}
            <div className="flex-1 order-2 lg:order-1">
              <div className="flex flex-col gap-4">
                {/* Facturas */}
                <div className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 bg-white">
                  <span className="inline-block p-1.5 bg-blue-600 rounded-md">
                    <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12h6"/><path d="M9 16h6"/><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 8h6"/></svg>
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-blue-900">Facturas</span>
                        <span className="block text-xs text-blue-700">66.8% del total</span>
                      </div>
                      <div className="text-right ml-2">
                        <span className="text-lg font-bold text-blue-900">S/ 324,500.25</span>
                        <div className="flex items-center justify-end">
                          <svg className="h-3 w-3 text-green-600 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 11 12 6 7 11"/><polyline points="7 18 17 18"/></svg>
                          <span className="text-xs font-medium text-green-600">+8.2%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Boletas */}
                <div className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 bg-white">
                  <span className="inline-block p-1.5 bg-sky-600 rounded-md">
                    <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 17v-6a2 2 0 0 1 2-2h4"/><rect width="16" height="20" x="4" y="2" rx="2"/></svg>
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-sky-900">Boletas</span>
                        <span className="block text-xs text-sky-700">33.2% del total</span>
                      </div>
                      <div className="text-right ml-2">
                        <span className="text-lg font-bold text-sky-900">S/ 161,250.25</span>
                        <div className="flex items-center justify-end">
                          <svg className="h-3 w-3 text-green-600 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 11 12 6 7 11"/><polyline points="7 18 17 18"/></svg>
                          <span className="text-xs font-medium text-green-600">+5.1%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Leyenda donut (si se quisiera agregar) */}
              </div>
            </div>

            {/* Lado derecho: Gráfico donut */}
            <div className="w-[14.78rem] h-[14.78rem] mx-auto lg:mx-0 flex items-center justify-center order-1 lg:order-2 mt-3 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={comprobanteDataWithPercent}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={68.6}
                    outerRadius={108.8}
                    paddingAngle={2}
                  >
                    {comprobanteDataWithPercent.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: number, name: string, props: any) => {
                      const percent = props?.payload?.percent;
                      return [`S/ ${Number(value).toLocaleString()} (${percent}%)`, name];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute left-0 top-0 w-full h-full flex flex-col items-center justify-center pointer-events-none">
                <span className="text-sm text-gray-500 font-medium">Total de ventas:</span>
                <span className="text-lg font-bold text-blue-900">S/ 128,450</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ventas por Establecimiento */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Ventas por Establecimiento</h3>
            <span className="text-sm text-gray-500 font-normal">Periodo: 01/09/2025 – 15/09/2025</span>
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-blue-600 inline-block"></span>
                  <span className="font-semibold text-gray-900">Tienda Centro</span>
                </div>
                <span className="text-green-600 text-xs font-semibold">↑ 15.2%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">40.9% del total</div>
                <div className="font-bold text-gray-900">S/ 198,750.25</div>
              </div>
              <div className="h-2 bg-gray-200 rounded-full mt-2">
                <div className="h-2 bg-blue-600 rounded-full" style={{ width: "41%" }}></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-gray-400 inline-block"></span>
                  <span className="font-semibold text-gray-900">Tienda Norte</span>
                </div>
                <span className="text-green-600 text-xs font-semibold">↑ 8.7%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">33.4% del total</div>
                <div className="font-bold text-gray-900">S/ 162,420.15</div>
              </div>
              <div className="h-2 bg-gray-200 rounded-full mt-2">
                <div className="h-2 bg-gray-400 rounded-full" style={{ width: "33%" }}></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-gray-400 inline-block"></span>
                  <span className="font-semibold text-gray-900">Tienda Sur</span>
                </div>
                <span className="text-green-600 text-xs font-semibold">↑ 22.1%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">25.7% del total</div>
                <div className="font-bold text-gray-900">S/ 124,580.10</div>
              </div>
              <div className="h-2 bg-gray-200 rounded-full mt-2">
                <div className="h-2 bg-gray-400 rounded-full" style={{ width: "26%" }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rankings y detalle de ventas diarias */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Top Vendedores */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-0">
          <div className="flex items-center justify-between px-6 pt-6 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg"><Award className="h-5 w-5 text-gray-700" /></span>
              <span className="font-semibold text-gray-900">Top Vendedores</span>
            </div>
            <span className="text-xs text-gray-400 font-semibold">Montos</span>
          </div>
          <div className="px-6 pb-4">
            {[
              { name: "Ana García", value: "S/ 125,480.75", info: "Vendedor", change: "+15.2%", color: "text-green-600", no: 1 },
              { name: "Carlos López", value: "S/ 98,750.50", info: "Vendedor", change: "+8.7%", color: "text-green-600", no: 2 },
              { name: "María Rodríguez", value: "S/ 87,320.25", info: "Vendedor", change: "-3.1%", color: "text-red-500", no: 3 },
              { name: "José Martínez", value: "S/ 76,890.00", info: "Vendedor", change: "+22.4%", color: "text-green-600", no: 4 },
            ].map((v) => (
              <div key={v.name} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-white ${v.no === 1 ? "bg-blue-700" : "bg-gray-300 text-gray-700"}`}>{v.no}</div>
                  <div>
                    <div className="font-semibold text-gray-900">{v.name}</div>
                    <div className="text-xs text-gray-500">{v.info} <span className={v.color + " font-semibold ml-1"}>{v.change}</span></div>
                  </div>
                </div>
                <div className="font-semibold text-gray-900">{v.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Productos Más Vendidos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-0">
          <div className="flex items-center justify-between px-6 pt-6 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg"><ShoppingCart className="h-5 w-5 text-gray-700" /></span>
              <span className="font-semibold text-gray-900">Productos Más Vendidos</span>
            </div>
            <span className="text-xs text-gray-400 font-semibold">Montos</span>
          </div>
          <div className="px-6 pb-4">
            {[
              { name: "Laptop HP Pavilion", value: "S/ 89,750.50", info: "145 unidades", change: "+18.5%", color: "text-green-600", no: 1 },
              { name: "Mouse Inalámbrico", value: "S/ 12,800.00", info: "320 unidades", change: "+25.3%", color: "text-green-600", no: 2 },
              { name: "Teclado Mecánico", value: "S/ 18,500.75", info: "185 unidades", change: "+12.1%", color: "text-green-600", no: 3 },
              { name: 'Monitor 24"', value: "S/ 35,280.00", info: "98 unidades", change: "-5.2%", color: "text-red-500", no: 4 },
            ].map((p) => (
              <div key={p.name} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-white ${p.no === 1 ? "bg-blue-700" : "bg-gray-300 text-gray-700"}`}>{p.no}</div>
                  <div>
                    <div className="font-semibold text-gray-900">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.info} <span className={p.color + " font-semibold ml-1"}>{p.change}</span></div>
                  </div>
                </div>
                <div className="font-semibold text-gray-900">{p.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Clientes Principales */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-0">
          <div className="flex items-center justify-between px-6 pt-6 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg"><Users className="h-5 w-5 text-gray-700" /></span>
              <span className="font-semibold text-gray-900">Clientes Principales</span>
            </div>
            <span className="text-xs text-gray-400 font-semibold">Montos</span>
          </div>
          <div className="px-6 pb-4">
            {[
              { name: "Empresa XYZ S.A.C.", value: "S/ 45,750.25", info: "28 compras", change: "+32.1%", color: "text-green-600", no: 1 },
              { name: "Comercial ABC E.I.R.L.", value: "S/ 38,920.50", info: "22 compras", change: "+18.7%", color: "text-green-600", no: 2 },
              { name: "Distribuidora 123", value: "S/ 32,150.75", info: "35 compras", change: "+8.9%", color: "text-green-600", no: 3 },
              { name: "Inversiones DEF", value: "S/ 28,480.00", info: "18 compras", change: "-12.3%", color: "text-red-500", no: 4 },
            ].map((c) => (
              <div key={c.name} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-white ${c.no === 1 ? "bg-blue-700" : "bg-gray-300 text-gray-700"}`}>{c.no}</div>
                  <div>
                    <div className="font-semibold text-gray-900">{c.name}</div>
                    <div className="text-xs text-gray-500">{c.info} <span className={c.color + " font-semibold ml-1"}>{c.change}</span></div>
                  </div>
                </div>
                <div className="font-semibold text-gray-900">{c.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detalle de Ventas Diarias */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg"><TrendingUp className="h-5 w-5 text-gray-700" /></span>
            <span className="font-semibold text-gray-900">Detalle de Ventas Diarias</span>
            {/* ...sin filtro comprobantes aquí... */}
          </div>
          <button
            className="text-blue-700 text-sm font-medium hover:underline"
            onClick={() => setOpenDetalleModal(true)}
          >
            Ver más detalles
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {/* Tabla de ventas diarias */}
          <div className="overflow-x-auto p-0 m-0">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b">
                  <th className="py-2 px-3 text-left">FECHA</th>
                  <th className="py-2 px-3 text-left">TOTAL VENTAS</th>
                  <th className="py-2 px-3 text-left">IGV</th>
                  <th className="py-2 px-3 text-left">N° COMPROBANTES</th>
                  <th className="py-2 px-3 text-left">TICKET PROMEDIO</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Find the three highest ventas
                  const sorted = [...ventasDiariasData].sort((a, b) => b.ventas - a.ventas);
                  const max1 = sorted[0]?.ventas;
                  const max2 = sorted[1]?.ventas;
                  const max3 = sorted[2]?.ventas;
                  return ventasDiariasData.map((item) => (
                    <tr className="border-b" key={item.fecha}>
                      <td className="py-2 px-3">{
                        (() => {
                          const [day, month] = item.fecha.split("/");
                          const monthNames: Record<string, string> = {
                            "09": "Set",
                            "08": "Ago",
                            "07": "Jul",
                            "06": "Jun",
                            "05": "May",
                            "04": "Abr",
                            "03": "Mar",
                            "02": "Feb",
                            "01": "Ene",
                          };
                          return `${day} ${monthNames[month] ?? month}`;
                        })()
                      }</td>
                      <td className="py-2 px-3 font-semibold text-gray-900 flex items-center gap-2">
                        S/ {item.ventas.toLocaleString()}
                        {item.ventas === max1 && (
                          <span className="ml-1"><IconOne /></span>
                        )}
                        {item.ventas === max2 && (
                          <span className="ml-1"><IconTwo /></span>
                        )}
                        {item.ventas === max3 && (
                          <span className="ml-1"><IconThree /></span>
                        )}
                      </td>
                      <td className="py-2 px-3">S/ {item.igv?.toLocaleString()}</td>
                      <td className="py-2 px-3">
                        <span className="bg-blue-100 text-blue-700 rounded-full px-2 py-1 text-xs font-semibold">{item.comprobantes}</span>
                      </td>
                      <td className="py-2 px-3 font-semibold text-gray-900">S/ {item.ticket.toLocaleString()}</td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>

          {/* Gráfico de barras */}
          <div className="w-full h-[250px] flex items-center justify-center bg-white p-0 m-0 mt-16" style={{ marginLeft: "-1rem", marginRight: "-1rem" }}>
            <ResponsiveContainer width="85%" height={288}>
              <BarChart data={ventasDiariasData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="fecha"
                  tickFormatter={(value: string) => {
                    const [day, month] = value.split("/");
                    const monthNames: Record<string, string> = {
                      "09": "Set",
                      "08": "Ago",
                      "07": "Jul",
                      "06": "Jun",
                      "05": "May",
                      "04": "Abr",
                      "03": "Mar",
                      "02": "Feb",
                      "01": "Ene",
                    };
                    return `${day} ${monthNames[month] ?? month}`;
                  }}
                />
                <YAxis
                  ticks={[0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000]}
                  domain={[0, 5000]}
                  tickFormatter={(value: number) => value.toLocaleString("es-PE").replace(/,/g, " ")}
                />
                <RechartsTooltip
                  content={(props: any) => {
                    const { active, payload } = props;
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-lg shadow border text-sm min-w-[180px]">
                          <div className="font-semibold text-blue-700 mb-1">Fecha: {item.fecha}</div>
                          <div className="mb-1">Total de ventas en S/: <span className="font-bold text-gray-900">S/ {item.ventas.toLocaleString()}</span></div>
                          <div>Nº de comprobantes: <span className="font-bold text-blue-700">{item.comprobantes}</span></div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="ventas" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      </div>

      {/* Modal para detalles y gráfico */}
      <DetalleVentasDiariasModal open={openDetalleModal} onClose={() => setOpenDetalleModal(false)} />
      <DetalleCrecimientoModal open={openDetalleCrecimientoModal} onClose={() => setOpenDetalleCrecimientoModal(false)} />
    </div>
  );
};

export default IndicadoresPage;
