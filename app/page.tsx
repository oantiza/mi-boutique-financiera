'use client';

import React, { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { Playfair_Display, Roboto } from 'next/font/google';

// --- FUENTES ---
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '700'] });
const roboto = Roboto({ subsets: ['latin'], weight: ['300', '400', '500', '700'] });

// --- FIREBASE ---
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID + ".firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID + ".firebasestorage.app",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('monthly');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setReportData(null);
      try {
        const dbTag = activeTab === 'monthly' ? 'MONTHLY_PORTFOLIO' : 'WEEKLY_MACRO';
        const q = query(collection(db, 'analysis_results'), where('type', '==', dbTag), orderBy('createdAt', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) setReportData(snapshot.docs[0].data());
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchData();
  }, [activeTab]);

  return (
    <div className={`min-h-screen bg-[#F3F4F6] text-[#1F2937] ${roboto.className}`}>
      
      {/* HEADER AZUL MARINO/DORADO */}
      <header className="bg-[#0B2545] text-white py-10 px-6 shadow-2xl border-b-8 border-[#D4AF37]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
                <h1 className={`${playfair.className} text-4xl md:text-5xl font-bold tracking-tight mb-2`}>
                    Perspectiva Global de Inversión
                </h1>
                <p className="text-[#D4AF37] text-lg font-medium uppercase tracking-widest">
                    {activeTab === 'monthly' ? 'Estrategia Trimestral & Asignación' : 'Informe Táctico Semanal'}
                </p>
            </div>
            <div className="flex gap-3 bg-[#061a33] p-1 rounded-lg">
                <button onClick={() => setActiveTab('weekly')} className={`px-6 py-2 rounded font-medium transition-all ${activeTab === 'weekly' ? 'bg-[#D4AF37] text-[#0B2545] shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                  Semanal
                </button>
                <button onClick={() => setActiveTab('monthly')} className={`px-6 py-2 rounded font-medium transition-all ${activeTab === 'monthly' ? 'bg-[#D4AF37] text-[#0B2545] shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                  Mensual
                </button>
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {loading && (
            <div className="col-span-12 py-24 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#D4AF37] border-t-transparent"></div>
                <p className="mt-4 text-[#0B2545] font-bold text-lg">Cargando datos de mercado...</p>
            </div>
        )}

        {!loading && !reportData && (
             <div className="col-span-12 bg-white p-12 rounded-lg shadow-lg text-center border-l-8 border-red-500">
                <h3 className={`${playfair.className} text-3xl text-[#0B2545]`}>Sin Datos Disponibles</h3>
                <p className="text-gray-600 mt-2">Ejecuta el Cron Job en Vercel para generar el informe de hoy.</p>
            </div>
        )}

        {!loading && reportData && (
          <>
            {/* SECCIÓN 1: RESUMEN EJECUTIVO + KPIs */}
            <section className="col-span-12 md:col-span-12">
                <h2 className={`${playfair.className} text-3xl font-bold text-[#0B2545] mb-6 border-l-8 border-[#D4AF37] pl-4`}>
                    1. Resumen Ejecutivo (The Bottom Line)
                </h2>
                <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100">
                    <p className="text-lg leading-relaxed text-gray-700 mb-8 text-justify font-light">
                        {reportData.executive_summary}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-[#F8FAFC] border-l-4 border-[#1E40AF] p-5 rounded shadow-sm">
                            <h3 className="text-gray-400 uppercase text-xs font-bold tracking-wider mb-1">Sentimiento Macro</h3>
                            <p className="text-xl font-bold text-[#0B2545]">{reportData.marketSentiment}</p>
                        </div>
                        <div className="bg-[#F8FAFC] border-l-4 border-[#D4AF37] p-5 rounded shadow-sm">
                            <h3 className="text-gray-400 uppercase text-xs font-bold tracking-wider mb-1">Fecha de Análisis</h3>
                            <p className="text-xl font-bold text-[#0B2545]">{reportData.date}</p>
                        </div>
                        <div className="bg-[#F8FAFC] border-l-4 border-[#10B981] p-5 rounded shadow-sm">
                            <h3 className="text-gray-400 uppercase text-xs font-bold tracking-wider mb-1">Modelo Analítico</h3>
                            <p className="text-xl font-bold text-[#0B2545]">Gemini 2.5 Flash</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECCIÓN 2: GRÁFICOS MACRO (Recreación Visual del HTML) */}
            <section className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Gráfico Inflación vs Tasas */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                    <h3 className={`${playfair.className} text-xl font-bold text-[#0B2545] mb-2`}>Dinámica Monetaria</h3>
                    <p className="text-xs text-gray-400 mb-6 uppercase tracking-wide">Proyección Tasas FED (Azul) vs IPC (Dorado)</p>
                    
                    <div className="relative h-64 w-full flex items-end justify-between px-2 pb-6 border-b border-gray-200">
                         {/* Líneas de fondo */}
                         <div className="absolute top-0 w-full h-px bg-gray-100"></div>
                         <div className="absolute top-1/4 w-full h-px bg-gray-100"></div>
                         <div className="absolute top-2/4 w-full h-px bg-gray-100"></div>
                         
                         {/* Barras (Tasas) */}
                         <div className="w-1/6 bg-[#0B2545] h-[85%] rounded-t-sm relative group"><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-[#0B2545]">5.3%</span></div>
                         <div className="w-1/6 bg-[#0B2545] h-[80%] rounded-t-sm relative"><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-[#0B2545]">5.0%</span></div>
                         <div className="w-1/6 bg-[#0B2545] h-[75%] rounded-t-sm relative"><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-[#0B2545]">4.7%</span></div>
                         <div className="w-1/6 bg-[#0B2545] h-[65%] rounded-t-sm relative"><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-[#0B2545]">4.5%</span></div>
                         <div className="w-1/6 bg-[#0B2545] h-[55%] rounded-t-sm relative"><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-[#0B2545]">4.2%</span></div>

                         {/* Línea Inflación (Simulada con puntos CSS) */}
                         <div className="absolute top-[40%] left-0 w-full h-full pointer-events-none">
                            <div className="absolute left-[8%] top-[40%] w-3 h-3 bg-[#D4AF37] rounded-full border-2 border-white shadow-sm z-10"></div>
                            <div className="absolute left-[28%] top-[45%] w-3 h-3 bg-[#D4AF37] rounded-full border-2 border-white shadow-sm z-10"></div>
                            <div className="absolute left-[48%] top-[48%] w-3 h-3 bg-[#D4AF37] rounded-full border-2 border-white shadow-sm z-10"></div>
                            <div className="absolute left-[68%] top-[55%] w-3 h-3 bg-[#D4AF37] rounded-full border-2 border-white shadow-sm z-10"></div>
                            <div className="absolute left-[88%] top-[60%] w-3 h-3 bg-[#D4AF37] rounded-full border-2 border-white shadow-sm z-10"></div>
                            {/* Conector */}
                            <svg className="absolute top-0 left-0 w-full h-full overflow-visible">
                                <path d="M 40 100 L 140 110 L 240 118 L 340 135 L 440 150" fill="none" stroke="#D4AF37" strokeWidth="3" strokeDasharray="5,5" />
                            </svg>
                         </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-2 font-medium">
                        <span>Q4 '24</span><span>Q1 '25</span><span>Q2 '25</span><span>Q3 '25</span><span>Q4 '25</span>
                    </div>
                </div>

                {/* Gráfico PIB Global (Barras Coloreadas) */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                    <h3 className={`${playfair.className} text-xl font-bold text-[#0B2545] mb-2`}>Divergencia Crecimiento 2025</h3>
                    <p className="text-xs text-gray-400 mb-6 uppercase tracking-wide">Estimación PIB Real (%)</p>
                    
                    <div className="h-64 flex items-end justify-between gap-3 pb-6 border-b border-gray-200">
                        <div className="w-full flex flex-col items-center gap-2">
                            <span className="text-xs font-bold text-[#1E40AF]">2.1%</span>
                            <div className="w-full bg-[#1E40AF] h-32 rounded-t hover:opacity-90 transition-opacity"></div>
                            <span className="text-[10px] font-bold text-gray-500">EE.UU.</span>
                        </div>
                        <div className="w-full flex flex-col items-center gap-2">
                            <span className="text-xs font-bold text-gray-500">0.8%</span>
                            <div className="w-full bg-[#9CA3AF] h-12 rounded-t hover:opacity-90 transition-opacity"></div>
                            <span className="text-[10px] font-bold text-gray-500">Euro</span>
                        </div>
                        <div className="w-full flex flex-col items-center gap-2">
                            <span className="text-xs font-bold text-[#EF4444]">4.5%</span>
                            <div className="w-full bg-[#EF4444] h-60 rounded-t hover:opacity-90 transition-opacity"></div>
                            <span className="text-[10px] font-bold text-gray-500">China</span>
                        </div>
                        <div className="w-full flex flex-col items-center gap-2">
                            <span className="text-xs font-bold text-[#D4AF37]">1.0%</span>
                            <div className="w-full bg-[#D4AF37] h-16 rounded-t hover:opacity-90 transition-opacity"></div>
                            <span className="text-[10px] font-bold text-gray-500">Japón</span>
                        </div>
                         <div className="w-full flex flex-col items-center gap-2">
                            <span className="text-xs font-bold text-[#10B981]">3.8%</span>
                            <div className="w-full bg-[#10B981] h-52 rounded-t hover:opacity-90 transition-opacity"></div>
                            <span className="text-[10px] font-bold text-gray-500">Emerg.</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECCIÓN 3: MATRIZ DE CARTERA (Tabla Real de Firebase) */}
            {activeTab === 'monthly' && reportData.model_portfolio && (
                <section className="col-span-12 mt-6">
                    <h2 className={`${playfair.className} text-3xl font-bold text-[#0B2545] mb-6 border-l-8 border-[#D4AF37] pl-4`}>
                        3. Matriz de Asignación Táctica
                    </h2>
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
                        <table className="min-w-full text-sm">
                            <thead className="bg-[#0B2545] text-white uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-4 font-bold tracking-wider text-left">Clase de Activo</th>
                                    <th className="px-6 py-4 font-bold tracking-wider text-left">Región</th>
                                    <th className="px-6 py-4 font-bold tracking-wider text-left">Visión</th>
                                    <th className="px-6 py-4 font-bold tracking-wider text-center">Peso</th>
                                    <th className="px-6 py-4 font-bold tracking-wider text-center">Convicción</th>
                                    <th className="px-6 py-4 font-bold tracking-wider text-left">Racional</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {reportData.model_portfolio.map((item: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-[#0B2545]">{item.asset_class}</td>
                                        <td className="px-6 py-4 text-gray-600">{item.region}</td>
                                        <td className="px-6 py-4 font-bold">
                                            <span className={`${
                                                item.view === 'Sobreponderar' ? 'text-[#10B981]' : 
                                                item.view === 'Infraponderar' ? 'text-red-600' : 'text-[#D4AF37]'
                                            }`}>
                                                {item.view}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono font-bold text-gray-700">{item.weight}%</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <div key={i} className={`h-2 w-2 rounded-full ${
                                                        i < item.conviction ? 
                                                        (item.conviction >= 4 ? 'bg-[#10B981]' : item.conviction <= 2 ? 'bg-red-500' : 'bg-[#D4AF37]') 
                                                        : 'bg-gray-200'
                                                    }`}></div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500 max-w-sm leading-snug">
                                            {item.rationale || "Valuaciones atractivas soportadas por fundamentales sólidos."}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* SECCIÓN 4: DRIVERS Y RIESGO (Mitad Drivers Reales, Mitad Mapa Visual) */}
            <section className="col-span-12 grid grid-cols-1 md:grid-cols-12 gap-8 mt-4">
                
                {/* Lista de Drivers (Datos Reales) */}
                <div className="md:col-span-6">
                     <h2 className={`${playfair.className} text-2xl font-bold text-[#0B2545] mb-6 border-l-8 border-[#D4AF37] pl-4`}>
                        4. Factores Clave (Drivers)
                    </h2>
                    <div className="space-y-4">
                        {reportData.keyDrivers?.map((driver: any, i: number) => (
                        <div key={i} className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-[#1E40AF] flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E0E7FF] text-[#1E40AF] flex items-center justify-center font-bold text-sm">
                                {i+1}
                            </div>
                            <div>
                                <h4 className="font-bold text-[#0B2545] text-sm">{driver.title}</h4>
                                <p className="text-gray-500 text-xs mt-1 leading-relaxed">{driver.impact}</p>
                            </div>
                        </div>
                        ))}
                    </div>
                </div>

                {/* Mapa de Riesgo (Visual) */}
                <div className="md:col-span-6">
                    <h2 className={`${playfair.className} text-2xl font-bold text-[#0B2545] mb-6 border-l-8 border-[#EF4444] pl-4`}>
                        5. Monitor de Riesgos
                    </h2>
                    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 h-full relative overflow-hidden">
                        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                             <div className="border-r border-b border-gray-100 p-2 text-[10px] text-gray-400 font-bold uppercase">Bajo Impacto / Baja Prob.</div>
                             <div className="border-b border-gray-100 p-2 text-[10px] text-gray-400 font-bold uppercase text-right">Alto Impacto / Baja Prob.</div>
                             <div className="border-r border-gray-100 p-2 flex items-end text-[10px] text-gray-400 font-bold uppercase">Bajo Impacto / Alta Prob.</div>
                             <div className="p-2 flex items-end justify-end text-[10px] text-red-400 font-bold uppercase">CRÍTICO: Alto Impacto / Alta Prob.</div>
                        </div>
                        
                        {/* Burbujas de Riesgo Simuladas */}
                        <div className="absolute top-[20%] right-[20%] w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center text-center p-2 border border-red-500 animate-pulse">
                            <span className="text-xs font-bold text-red-700 leading-tight">Conflicto Geopolítico</span>
                        </div>
                         <div className="absolute bottom-[30%] right-[35%] w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center text-center p-2 border border-yellow-500">
                            <span className="text-xs font-bold text-yellow-700 leading-tight">Inflación Persistente</span>
                        </div>
                        <div className="absolute top-[40%] left-[20%] w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center text-center p-2 border border-blue-500">
                            <span className="text-xs font-bold text-blue-700 leading-tight">Elecciones EE.UU.</span>
                        </div>
                    </div>
                </div>

            </section>
          </>
        )}
      </main>

      <footer className="bg-[#1F2937] text-gray-400 py-12 px-4 text-center text-xs border-t border-gray-600 mt-12">
        <div className="max-w-4xl mx-auto">
            <p className="mb-4 text-gray-500">© 2025 Global Asset Management Strategy.</p>
            <p className="leading-relaxed text-gray-600">
                RENUNCIA: Documento generado por IA (Gemini 2.5 Flash) para fines demostrativos. Las rentabilidades pasadas no garantizan resultados futuros.
            </p>
        </div>
      </footer>
    </div>
  );
}