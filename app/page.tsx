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

// --- FUNCIÓN PARA ARREGLAR DATOS (IMPORTANTE) ---
// Esto convierte los objetos de Firebase {0: x, 1: y} en Arrays reales [x, y]
const normalizeData = (data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return Object.values(data);
};

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

  // Preparamos los datos seguros (Arrays reales)
  const portfolioList = reportData ? normalizeData(reportData.model_portfolio) : [];
  const driversList = reportData ? normalizeData(reportData.keyDrivers) : [];

  return (
    <div className={`min-h-screen bg-[#F3F4F6] text-[#1F2937] ${roboto.className}`}>
      
      {/* HEADER */}
      <header className="bg-[#0B2545] text-white py-10 px-6 shadow-2xl border-b-8 border-[#D4AF37]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
                <h1 className={`${playfair.className} text-4xl md:text-5xl font-bold tracking-tight mb-2`}>
                    Global Investment Outlook
                </h1>
                <p className="text-[#D4AF37] text-lg font-medium uppercase tracking-widest">
                    {activeTab === 'monthly' ? 'Estrategia de Asignación de Activos' : 'Informe Táctico Semanal'}
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
                <p className="mt-4 text-[#0B2545] font-bold text-lg">Analizando Mercados...</p>
            </div>
        )}

        {/* --- AVISO AMARILLO (EL SEGUNDO PANTALLAZO) --- */}
        {!loading && !reportData && (
             <div className="col-span-12 bg-white p-12 rounded-lg shadow-lg text-center border-l-8 border-yellow-500">
                <h3 className={`${playfair.className} text-3xl text-[#0B2545]`}>Informe No Generado</h3>
                <p className="text-gray-600 mt-2">
                    Aún no existe un informe para la categoría <strong>{activeTab}</strong> hoy. 
                    <br/>Ejecuta el Cron Job en Vercel para crearlo.
                </p>
            </div>
        )}

        {!loading && reportData && (
          <>
            {/* 1. RESUMEN EJECUTIVO (EXTENDIDO) */}
            <section className="col-span-12">
                <h2 className={`${playfair.className} text-3xl font-bold text-[#0B2545] mb-6 border-l-8 border-[#D4AF37] pl-4`}>
                    1. Resumen Ejecutivo (The Bottom Line)
                </h2>
                <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100">
                    <div className="text-lg leading-relaxed text-gray-700 mb-8 text-justify font-light space-y-4 whitespace-pre-line">
                        {reportData.executive_summary}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-[#F8FAFC] border-l-4 border-[#1E40AF] p-5 rounded shadow-sm">
                            <h3 className="text-gray-400 uppercase text-xs font-bold tracking-wider mb-1">Sentimiento</h3>
                            <p className="text-lg font-bold text-[#0B2545] leading-tight">{reportData.marketSentiment}</p>
                        </div>
                        <div className="bg-[#F8FAFC] border-l-4 border-[#D4AF37] p-5 rounded shadow-sm">
                            <h3 className="text-gray-400 uppercase text-xs font-bold tracking-wider mb-1">Fecha</h3>
                            <p className="text-xl font-bold text-[#0B2545]">{reportData.date}</p>
                        </div>
                        <div className="bg-[#F8FAFC] border-l-4 border-[#10B981] p-5 rounded shadow-sm">
                            <h3 className="text-gray-400 uppercase text-xs font-bold tracking-wider mb-1">Estrategia</h3>
                            <p className="text-xl font-bold text-[#0B2545]">Calidad & Valor</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. GRÁFICOS VISUALES */}
            <section className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Gráfico Inflación */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                    <h3 className={`${playfair.className} text-xl font-bold text-[#0B2545] mb-2`}>Dinámica Monetaria</h3>
                    <p className="text-xs text-gray-400 mb-6 uppercase tracking-wide">Proyección Tasas FED (Azul) vs IPC (Dorado)</p>
                    <div className="relative h-64 w-full flex items-end justify-between px-2 pb-6 border-b border-gray-200">
                         {/* Barras (Tasas) */}
                         <div className="w-1/6 bg-[#0B2545] h-[85%] rounded-t-sm relative"><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-[#0B2545]">5.3%</span></div>
                         <div className="w-1/6 bg-[#0B2545] h-[80%] rounded-t-sm relative"><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-[#0B2545]">5.0%</span></div>
                         <div className="w-1/6 bg-[#0B2545] h-[75%] rounded-t-sm relative"><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-[#0B2545]">4.7%</span></div>
                         <div className="w-1/6 bg-[#0B2545] h-[65%] rounded-t-sm relative"><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-[#0B2545]">4.5%</span></div>
                         <div className="w-1/6 bg-[#0B2545] h-[55%] rounded-t-sm relative"><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-[#0B2545]">4.2%</span></div>
                         {/* Línea Inflación */}
                         <div className="absolute top-[40%] left-0 w-full h-1 bg-[#D4AF37] opacity-50 border-t-2 border-dashed border-[#D4AF37]"></div>
                    </div>
                </div>

                {/* Gráfico PIB */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                    <h3 className={`${playfair.className} text-xl font-bold text-[#0B2545] mb-2`}>Divergencia Crecimiento</h3>
                    <p className="text-xs text-gray-400 mb-6 uppercase tracking-wide">Estimación PIB Real 2025 (%)</p>
                    <div className="h-64 flex items-end justify-between gap-3 pb-6 border-b border-gray-200">
                        <div className="w-full bg-[#1E40AF] h-32 rounded-t relative"><span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-[#1E40AF]">2.1%</span><span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-white">USA</span></div>
                        <div className="w-full bg-[#9CA3AF] h-12 rounded-t relative"><span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-gray-500">0.8%</span><span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-white">EU</span></div>
                        <div className="w-full bg-[#EF4444] h-60 rounded-t relative"><span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-[#EF4444]">4.5%</span><span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-white">CHN</span></div>
                        <div className="w-full bg-[#10B981] h-52 rounded-t relative"><span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-[#10B981]">3.8%</span><span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-white">EM</span></div>
                    </div>
                </div>
            </section>

            {/* 3. MATRIZ DE CARTERA (ARREGLADA) */}
            {activeTab === 'monthly' && portfolioList.length > 0 && (
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
                                {portfolioList.map((item: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-[#0B2545]">{item.asset_class}</td>
                                        <td className="px-6 py-4 text-gray-600">{item.region}</td>
                                        <td className="px-6 py-4 font-bold">
                                            <span className={`${
                                                item.view?.includes('Sobre') ? 'text-[#10B981]' : 
                                                item.view?.includes('Infra') ? 'text-red-600' : 'text-[#D4AF37]'
                                            }`}>
                                                {item.view}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono font-bold text-gray-700">{item.weight}%</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`py-1 px-3 rounded-full text-xs font-bold text-white ${
                                                item.conviction >= 4 ? 'bg-[#10B981]' : item.conviction <= 2 ? 'bg-red-500' : 'bg-[#D4AF37]'
                                            }`}>
                                                {item.conviction}/5
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500 max-w-sm leading-snug">
                                            {item.rationale || "Análisis fundamental favorable."}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* 4. DRIVERS Y TESIS (MÁS TEXTO) */}
            <section className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                
                {/* Lista de Drivers */}
                <div>
                     <h2 className={`${playfair.className} text-2xl font-bold text-[#0B2545] mb-6 border-l-8 border-[#D4AF37] pl-4`}>
                        4. Factores Clave
                    </h2>
                    <div className="space-y-4">
                        {driversList.map((driver: any, i: number) => (
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

                {/* Monitor de Riesgo (Visual) */}
                <div>
                    <h2 className={`${playfair.className} text-2xl font-bold text-[#0B2545] mb-6 border-l-8 border-[#EF4444] pl-4`}>
                        5. Monitor de Riesgos
                    </h2>
                    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 h-full relative overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-50">
                             <div className="border-r border-b border-gray-200 p-2 text-[10px] text-gray-400 font-bold uppercase">Bajo / Bajo</div>
                             <div className="border-b border-gray-200 p-2 text-[10px] text-gray-400 font-bold uppercase text-right">Alto Impacto</div>
                             <div className="border-r border-gray-200 p-2 flex items-end text-[10px] text-gray-400 font-bold uppercase">Alta Prob.</div>
                             <div className="p-2 flex items-end justify-end text-[10px] text-red-400 font-bold uppercase">CRÍTICO</div>
                        </div>
                        
                        <div className="relative w-full h-48">
                            <div className="absolute top-[20%] right-[20%] w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center text-center p-2 border border-red-500 animate-pulse">
                                <span className="text-xs font-bold text-red-700 leading-tight">Geopolítica</span>
                            </div>
                            <div className="absolute bottom-[20%] right-[40%] w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center text-center p-2 border border-yellow-500">
                                <span className="text-xs font-bold text-yellow-700 leading-tight">Inflación</span>
                            </div>
                        </div>
                    </div>
                </div>

            </section>
          </>
        )}
      </main>

      <footer className="bg-[#1F2937] text-gray-400 py-12 px-4 text-center text-xs border-t border-gray-600 mt-12">
        <p>© 2025 Global Asset Management Strategy. Documento generado por IA.</p>
      </footer>
    </div>
  );
}