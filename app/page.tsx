"use client";
import { useState, useEffect, useCallback } from "react";
import { Playfair_Display, Roboto } from 'next/font/google';
import { db } from "../lib/firebase"; 
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, Line, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { Activity, ShieldAlert, TrendingUp, Calendar, Layers, Anchor, Globe } from 'lucide-react';
import clsx from 'clsx';

// --- FUENTES ---
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '700'] });
const roboto = Roboto({ subsets: ['latin'], weight: ['300', '400', '500', '700'] });

// --- COLORES CORPORATIVOS ---
const THEME = {
  navy: '#0B2545',
  gold: '#D4AF37',
  green: '#10B981',
  red: '#EF4444',
  grey: '#9CA3AF',
  bg: '#F3F4F6'
};

const CHART_COLORS = [THEME.navy, THEME.gold, THEME.green, THEME.red, '#8B5CF6'];

export default function Home() {
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('monthly');
  const [loading, setLoading] = useState(true); 
  const [data, setData] = useState<any>(null);

  // --- CARGA DE DATOS DESDE FIREBASE ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Determinar qué etiqueta buscar según el modo
      const targetType = viewMode === 'monthly' ? 'MONTHLY_PORTFOLIO' : 'WEEKLY_MACRO';
      
      const q = query(
        collection(db, "analysis_results"),
        where("type", "==", targetType),
        orderBy("createdAt", "desc"),
        limit(1)
      );

      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        setData(snapshot.docs[0].data());
      } else {
        setData(null);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [viewMode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- PREPARACIÓN DE DATOS PARA GRÁFICOS ---
  
  // Datos para Pie Chart (Asignación)
  const allocationData = data?.model_portfolio?.map((item: any) => ({
    name: item.asset_class || item.region,
    value: item.weight || 0
  })) || [];

  // Datos Simulados para Gráficos Macro (Si la IA no devuelve series temporales, usamos mocks visuales)
  const macroData = [
    { name: 'Q1', inflation: 3.2, rate: 5.25 },
    { name: 'Q2', inflation: 2.9, rate: 5.25 },
    { name: 'Q3', inflation: 2.6, rate: 5.00 },
    { name: 'Q4 (Est)', inflation: 2.4, rate: 4.75 },
  ];

  // --- RENDERIZADO DE COMPONENTES ---

  const renderHeader = () => (
    <header className="bg-[#0B2545] text-white py-10 px-4 shadow-2xl border-b-4 border-[#D4AF37]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="mb-6 md:mb-0 text-center md:text-left">
          <h1 className={`${playfair.className} text-3xl md:text-5xl font-bold tracking-tight mb-2`}>
            Global Investment Outlook
          </h1>
          <p className="text-[#D4AF37] text-sm md:text-lg font-medium uppercase tracking-widest flex items-center gap-2 justify-center md:justify-start">
            <ShieldAlert size={18} /> Oficina del CIO • {viewMode === 'monthly' ? 'Estrategia Trimestral' : 'Informe Táctico Semanal'}
          </p>
        </div>
        
        {/* Toggle Switch Estilo Institucional */}
        <div className="bg-white/10 p-1 rounded-lg flex backdrop-blur-sm border border-white/20">
          <button
            onClick={() => setViewMode('weekly')}
            className={clsx(
              "px-6 py-2 rounded-md text-sm font-bold transition-all duration-300 flex items-center gap-2",
              viewMode === 'weekly' ? "bg-[#D4AF37] text-[#0B2545] shadow-lg" : "text-gray-300 hover:text-white"
            )}
          >
            <Activity size={16} /> Táctico (Semanal)
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={clsx(
              "px-6 py-2 rounded-md text-sm font-bold transition-all duration-300 flex items-center gap-2",
              viewMode === 'monthly' ? "bg-[#D4AF37] text-[#0B2545] shadow-lg" : "text-gray-300 hover:text-white"
            )}
          >
            <Calendar size={16} /> Estratégico (Mensual)
          </button>
        </div>
      </div>
    </header>
  );

  const renderExecutiveSummary = () => (
    <section className="bg-white rounded-lg shadow-lg p-8 mb-8 border-t-4 border-[#0B2545]">
      <h2 className={`${playfair.className} text-3xl font-bold text-[#0B2545] mb-6 flex items-center gap-3`}>
        <span className="w-2 h-8 bg-[#D4AF37] block rounded-sm"></span>
        1. Resumen Ejecutivo (The Bottom Line)
      </h2>
      <div className="prose prose-lg text-gray-700 max-w-none leading-relaxed">
        <p>{data?.executive_summary || "Esperando generación de informe..."}</p>
      </div>

      {/* Tarjetas de Métricas Clave (Diferentes para Semanal/Mensual) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {viewMode === 'monthly' ? (
          <>
            <MetricCard title="Postura Global" value="Neutral-Alcista" sub="Sobreponderar Calidad" color="navy" />
            <MetricCard title="Riesgo Principal" value="Inflación Servicios" sub="Persistencia > 3%" color="gold" />
            <MetricCard title="Oportunidad" value="Bonos Gvt 5Y" sub="Lock-in Yield Real" color="green" />
          </>
        ) : (
          <>
            <MetricCard title="Sentimiento" value={data?.flows_positioning?.key_metric || "Neutral"} sub="Fear & Greed Index" color="navy" />
            <MetricCard title="US 10Y Yield" value={data?.rates?.key_metric || "--%"} sub="Tendencia Semanal" color="gold" />
            <MetricCard title="Volatilidad" value="VIX: 14.5" sub="Rango Bajo" color="green" />
          </>
        )}
      </div>
    </section>
  );

  const renderChartsSection = () => (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
      {/* Chart 1: Macro Dynamics */}
      <div className="bg-white p-6 rounded-lg shadow-lg border-t-2 border-gray-100">
        <h3 className={`${playfair.className} text-xl font-bold text-[#0B2545] mb-2`}>Dinámica Macro: Tipos vs Inflación</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <ComposedChart data={macroData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{fontSize: 12}} />
              <YAxis yAxisId="left" orientation="left" stroke={THEME.navy} />
              <YAxis yAxisId="right" orientation="right" stroke={THEME.gold} />
              <RechartsTooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="rate" name="Tasa FED" fill={THEME.navy} barSize={20} />
              <Line yAxisId="right" type="monotone" dataKey="inflation" name="IPC" stroke={THEME.gold} strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Asset Allocation (Solo mensual) o Flujos (Semanal) */}
      <div className="bg-white p-6 rounded-lg shadow-lg border-t-2 border-gray-100">
        <h3 className={`${playfair.className} text-xl font-bold text-[#0B2545] mb-2`}>
          {viewMode === 'monthly' ? 'Asignación de Activos Estratégica' : 'Deep Research: Focos de Atención'}
        </h3>
        
        {viewMode === 'monthly' && allocationData.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {allocationData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend verticalAlign="middle" align="right" layout="vertical" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72 flex flex-col justify-center gap-4">
             {/* Fallback visual para modo semanal o sin datos */}
             <DeepResearchCard icon={Activity} title="Tasas" text={data?.rates?.content || "Análisis no disponible"} />
             <DeepResearchCard icon={Globe} title="Geopolítica" text={data?.thesis?.content?.slice(0, 100) + "..." || "..."} />
          </div>
        )}
      </div>
    </section>
  );

  const renderMatrix = () => {
    if (viewMode !== 'monthly' || !data?.model_portfolio) return null;

    return (
      <section className="bg-white rounded-lg shadow-lg overflow-hidden mb-12">
        <div className="bg-[#0B2545] px-8 py-4 border-b border-[#D4AF37]">
          <h2 className={`${playfair.className} text-2xl text-white font-bold`}>Matriz de Asignación Táctica</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left text-gray-600">
            <thead className="bg-gray-50 text-xs text-[#0B2545] uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Clase de Activo</th>
                <th className="px-6 py-4">Región / Tipo</th>
                <th className="px-6 py-4 text-center">Peso %</th>
                <th className="px-6 py-4">Visión</th>
                <th className="px-6 py-4">Racional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.model_portfolio.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900">{row.asset_class}</td>
                  <td className="px-6 py-4">{row.region}</td>
                  <td className="px-6 py-4 text-center font-mono text-[#0B2545]">{row.weight}%</td>
                  <td className="px-6 py-4">
                    <span className={clsx(
                      "px-3 py-1 rounded-full text-xs font-bold",
                      row.view?.includes('Sobre') ? "bg-green-100 text-green-800" :
                      row.view?.includes('Infra') ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"
                    )}>
                      {row.view}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs italic max-w-xs truncate">{row.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  // --- UI PRINCIPAL ---
  return (
    <div className={`min-h-screen bg-[#F3F4F6] ${roboto.className} text-[#1F2937]`}>
      
      {renderHeader()}

      <main className="max-w-7xl mx-auto px-4 py-8 -mt-8 relative z-10">
        
        {loading ? (
          <div className="bg-white p-12 rounded-lg shadow-lg text-center animate-pulse">
            <div className="w-16 h-16 border-4 border-[#0B2545] border-t-[#D4AF37] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[#0B2545] font-medium">Recuperando inteligencia de mercado...</p>
          </div>
        ) : !data ? (
          <div className="bg-white p-12 rounded-lg shadow-lg text-center">
            <ShieldAlert className="w-12 h-12 text-[#D4AF37] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#0B2545]">Sin Informes Disponibles</h3>
            <p className="text-gray-500 mt-2">No se ha encontrado un informe {viewMode} reciente en la base de datos.</p>
            <p className="text-xs text-gray-400 mt-4">Verifica que el Cron Job se haya ejecutado.</p>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in-up">
            {renderExecutiveSummary()}
            {renderChartsSection()}
            {renderMatrix()}
            
            {/* Tesis de Inversión Central */}
            {data.thesis && (
              <div className="bg-[#0B2545] text-white p-8 rounded-lg shadow-lg border-l-4 border-[#D4AF37] flex gap-4 items-start">
                <Anchor className="w-10 h-10 text-[#D4AF37] flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-[#D4AF37] font-bold uppercase tracking-widest text-sm mb-2">Tesis Central de Inversión</h3>
                  <p className={`${playfair.className} text-xl md:text-2xl italic leading-relaxed`}>
                    "{typeof data.thesis === 'string' ? data.thesis : data.thesis.content}"
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Institucional */}
      <footer className="bg-[#1F2937] text-gray-400 py-12 px-4 text-center text-xs mt-12 border-t border-gray-700">
        <div className="max-w-4xl mx-auto">
          <p className="mb-4 font-bold text-gray-300">© 2025 Global Asset Management - Oficina del CIO.</p>
          <p className="leading-relaxed">
            RENUNCIA DE RESPONSABILIDAD: Este documento es estrictamente confidencial y para uso exclusivo del comité de dirección. 
            No constituye una oferta de venta ni una solicitud de oferta de compra de valores. 
            Las rentabilidades pasadas no garantizan resultados futuros.
          </p>
        </div>
      </footer>
    </div>
  );
}

// --- SUB-COMPONENTES SIMPLES ---

function MetricCard({ title, value, sub, color }: { title: string, value: string, sub: string, color: string }) {
  const colors: any = {
    navy: 'border-[#0B2545] text-[#0B2545]',
    gold: 'border-[#D4AF37] text-[#0B2545]',
    green: 'border-[#10B981] text-[#0B2545]',
  };
  
  return (
    <div className={`bg-[#F8FAFC] border-t-4 ${colors[color]} p-6 rounded shadow-sm text-center hover:shadow-md transition-shadow`}>
      <h3 className="text-gray-500 uppercase text-xs font-bold tracking-wider mb-2">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-gray-600 mt-1 italic">{sub}</p>
    </div>
  );
}

function DeepResearchCard({ icon: Icon, title, text }: any) {
  return (
    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded border border-gray-100">
      <div className="p-2 bg-white rounded shadow-sm text-[#0B2545]">
        <Icon size={20} />
      </div>
      <div>
        <h4 className="font-bold text-[#0B2545] text-sm">{title}</h4>
        <p className="text-xs text-gray-600 line-clamp-2">{text}</p>
      </div>
    </div>
  );
}