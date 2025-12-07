'use client';

import React, { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  BubbleController
} from 'chart.js';
import { Line, Bar, Bubble } from 'react-chartjs-2';
import { Playfair_Display, Roboto } from 'next/font/google';

// --- 1. CONFIGURACIÓN DE FUENTES ---
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '700'] });
const roboto = Roboto({ subsets: ['latin'], weight: ['300', '400', '500', '700'] });

// --- 2. REGISTRO DE GRÁFICOS ---
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, BubbleController, Title, Tooltip, Legend
);

// --- 3. CONFIGURACIÓN FIREBASE ---
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

// --- 4. DATOS VISUALES (ESTÉTICA) ---
// Estos datos recrean los gráficos del HTML para mantener el diseño "lleno" y profesional
const inflationData = {
  labels: ['Q4 2024', 'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025 (Est)'],
  datasets: [
    { label: 'Tasa FED', data: [5.33, 5.00, 4.75, 4.50, 4.25], borderColor: '#0B2545', backgroundColor: '#0B2545', tension: 0.1 },
    { label: 'IPC EE.UU.', data: [3.2, 2.9, 2.7, 2.5, 2.4], borderColor: '#D4AF37', backgroundColor: '#D4AF37', borderDash: [5, 5], tension: 0.3 }
  ]
};

const valuationData = {
    datasets: [
        { label: 'EE.UU. S&P 500', data: [{x: 12, y: 21.5, r: 15}], backgroundColor: 'rgba(30, 64, 175, 0.7)' },
        { label: 'Euro Stoxx 600', data: [{x: 6, y: 13.5, r: 10}], backgroundColor: 'rgba(156, 163, 175, 0.7)' },
        { label: 'Emergentes', data: [{x: 14, y: 11.8, r: 12}], backgroundColor: 'rgba(16, 185, 129, 0.7)' }
    ]
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

  return (
    <div className={`min-h-screen bg-[#F3F4F6] text-[#1F2937] ${roboto.className}`}>
      
      {/* HEADER PREMIUM (Diseño HTML original replicado) */}
      <header className="bg-[#0B2545] text-white py-12 px-6 shadow-xl border-b-8 border-[#D4AF37]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
                <h1 className={`${playfair.className} text-4xl md:text-5xl font-bold tracking-tight mb-2`}>
                    Perspectiva Global de Inversión
                </h1>
                <p className="text-[#D4AF37] text-xl font-medium uppercase tracking-widest">
                    {activeTab === 'monthly' ? 'Estrategia Trimestral: Asignación de Activos' : 'Informe Táctico Semanal'}
                </p>
            </div>
            
            {/* Botones integrados en el estilo */}
            <div className="flex gap-3">
                <button onClick={() => setActiveTab('weekly')} className={`px-5 py-2 rounded transition-all border ${activeTab === 'weekly' ? 'bg-[#D4AF37] text-[#0B2545] border-[#D4AF37] font-bold' : 'border-gray-500 text-gray-300 hover:text-white hover:border-white'}`}>
                  Semanal
                </button>
                <button onClick={() => setActiveTab('monthly')} className={`px-5 py-2 rounded transition-all border ${activeTab === 'monthly' ? 'bg-[#D4AF37] text-[#0B2545] border-[#D4AF37] font-bold' : 'border-gray-500 text-gray-300 hover:text-white hover:border-white'}`}>
                  Mensual
                </button>
                <button onClick={() => window.open(`/api/export-pdf?type=${activeTab}`, '_blank')} className="px-5 py-2 bg-red-700 hover:bg-red-600 text-white rounded font-bold shadow-lg ml-4 flex items-center gap-2">
                    <span>📥</span> PDF
                </button>
            </div>
        </div>
        <div className="max-w-7xl mx-auto mt-6 text-center md:text-left">
            <p className="text-gray-300 italic max-w-2xl text-sm md:text-base border-l-2 border-[#D4AF37] pl-4">
                "La volatilidad es el precio de la admisión. En un entorno de divergencia macroeconómica, la calidad del balance es el activo más valioso."
            </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {loading && (
            <div className="col-span-12 py-20 text-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-[#0B2545] border-t-transparent"></div>
                <p className="mt-4 text-gray-500 font-medium">Cargando análisis de mercado...</p>
            </div>
        )}

        {!loading && !reportData && (
             <div className="col-span-12 bg-white p-12 rounded-lg shadow-md text-center border-t-4 border-red-500">
                <h3 className={`${playfair.className} text-3xl text-[#0B2545]`}>Informe No Disponible</h3>
                <p className="text-gray-600 mt-2">No se encontraron datos recientes. Ejecuta el Cron Job.</p>
            </div>
        )}

        {!loading && reportData && (
          <>
            {/* SECCIÓN 1: RESUMEN EJECUTIVO (The Bottom Line) */}
            <section className="md:col-span-12">
                <h2 className={`${playfair.className} text-3xl font-bold text-[#0B2545] mb-6 border-l-4 border-[#D4AF37] pl-4`}>
                    1. Resumen Ejecutivo (The Bottom Line)
                </h2>
                <div className="bg-white rounded-lg shadow-md p-8">
                    <p className="text-lg leading-relaxed text-gray-700 mb-8 text-justify">
                        {reportData.executive_summary}
                    </p>

                    {/* Tarjetas de Métricas Estilo HTML */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-[#F8FAFC] border-t-4 border-[#1E40AF] p-6 rounded shadow-sm text-center">
                            <h3 className="text-gray-500 uppercase text-xs font-bold tracking-wider mb-2">Postura Global</h3>
                            <p className="text-xl font-bold text-[#0B2545]">{reportData.marketSentiment}</p>
                            <p className="text-xs text-gray-500 mt-2">Basado en análisis de sentimiento IA</p>
                        </div>
                        <div className="bg-[#F8FAFC] border-t-4 border-[#D4AF37] p-6 rounded shadow-sm text-center">
                            <h3 className="text-gray-500 uppercase text-xs font-bold tracking-wider mb-2">Riesgo Principal</h3>
                            <p className="text-lg font-bold text-[#0B2545] leading-tight">Persistencia Inflacionaria</p>
                            <p className="text-xs text-gray-500 mt-2">Monitor de volatilidad CPI</p>
                        </div>
                        <div className="bg-[#F8FAFC] border-t-4 border-[#10B981] p-6 rounded shadow-sm text-center">
                            <h3 className="text-gray-500 uppercase text-xs font-bold tracking-wider mb-2">Oportunidad Táctica</h3>
                            <p className="text-lg font-bold text-[#0B2545] leading-tight">Calidad & Renta Fija</p>
                            <p className="text-xs text-gray-500 mt-2">Yields reales positivos</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECCIÓN 2: ANÁLISIS MACRO (Gráficos Visuales) */}
            <section className="md:col-span-12">
                <h2 className={`${playfair.className} text-3xl font-bold text-[#0B2545] mb-6 border-l-4 border-[#D4AF37] pl-4`}>
                    2. Análisis del Entorno (Macro & Markets)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className={`${playfair.className} text-xl font-bold text-[#0B2545] mb-2`}>Dinámica Monetaria</h3>
                        <p className="text-sm text-gray-500 mb-4">Proyección de tasas FED vs Inflación (Estimado)</p>
                        <div className="h-64">
                            <Line data={inflationData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                         <h3 className={`${playfair.className} text-xl font-bold text-[#0B2545] mb-2`}>Valoraciones y Crecimiento</h3>
                         <p className="text-sm text-gray-500 mb-4">Matriz de Valoración (P/E vs Growth)</p>
                         <div className="h-64">
                            <Bubble data={valuationData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                        </div>
                    </div>
                </div>
            </section>

            {/* SECCIÓN 3: MATRIZ DE ASIGNACIÓN (DATOS REALES) */}
            {activeTab === 'monthly' && reportData.model_portfolio && (
                <section className="md:col-span-12 mt-4">
                    <h2 className={`${playfair.className} text-3xl font-bold text-[#0B2545] mb-6 border-l-4 border-[#D4AF37] pl-4`}>
                        3. Matriz de Asignación Táctica
                    </h2>
                    <p className="mb-6 text-gray-700">
                        Basado en nuestro análisis macro, presentamos la matriz de convicción actual generada por nuestros modelos.
                    </p>
                    <div className="bg-white rounded-lg shadow-md overflow-hidden overflow-x-auto border border-gray-200">
                        <table className="min-w-full text-sm text-left">
                            <thead className="text-xs text-white uppercase bg-[#0B2545]">
                                <tr>
                                    <th className="px-6 py-4 font-bold tracking-wider">Clase de Activo</th>
                                    <th className="px-6 py-4 font-bold tracking-wider">Zona Geográfica</th>
                                    <th className="px-6 py-4 font-bold tracking-wider">Visión</th>
                                    <th className="px-6 py-4 font-bold tracking-wider text-center">Convicción (1-5)</th>
                                    <th className="px-6 py-4 font-bold tracking-wider">Rationale (Estrategia)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-gray-700">
                                {reportData.model_portfolio.map((item: any, idx: number) => (
                                    <tr key={idx} className="bg-white hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-[#0B2545]">{item.asset_class}</td>
                                        <td className="px-6 py-4">{item.region}</td>
                                        <td className="px-6 py-4 font-bold">
                                            <span className={`${
                                                item.view === 'Sobreponderar' ? 'text-[#10B981]' : 
                                                item.view === 'Infraponderar' ? 'text-red-600' : 'text-[#D4AF37]'
                                            }`}>
                                                {item.view}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-white py-1 px-3 rounded-full text-xs font-bold ${
                                                 item.conviction >= 4 ? 'bg-[#10B981]' : 
                                                 item.conviction <= 2 ? 'bg-red-500' : 'bg-[#D4AF37]'
                                            }`}>
                                                {item.conviction}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs leading-relaxed max-w-xs text-gray-500">
                                            {item.rationale || "Análisis fundamental favorable basado en proyecciones actuales."}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* SECCIÓN 4: DRIVERS (FACTORES CLAVE) */}
            <section className="md:col-span-12 mt-4 mb-8">
                <h2 className={`${playfair.className} text-3xl font-bold text-[#0B2545] mb-6 border-l-4 border-[#D4AF37] pl-4`}>
                    4. Drivers Principales (Factores de Riesgo)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {reportData.keyDrivers?.map((driver: any, i: number) => (
                        <div key={i} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-[#1E40AF] hover:shadow-lg transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                                <h4 className={`${playfair.className} font-bold text-lg text-[#0B2545]`}>{driver.title}</h4>
                                <span className="bg-[#E0E7FF] text-[#1E40AF] text-xs font-bold px-2 py-1 rounded">FACTOR #{i+1}</span>
                            </div>
                            <p className="text-gray-600 text-sm leading-relaxed">{driver.impact}</p>
                        </div>
                     ))}
                </div>
            </section>
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-[#1F2937] text-gray-400 py-10 px-4 text-center text-xs border-t border-gray-700">
        <div className="max-w-4xl mx-auto">
            <p className="mb-4 text-gray-500">© 2025 Global Asset Management.</p>
            <p className="leading-relaxed">
                RENUNCIA DE RESPONSABILIDAD: Este documento es estrictamente confidencial y para uso exclusivo educativo. 
                No constituye una oferta de venta ni una solicitud de oferta de compra de valores. 
                Las rentabilidades pasadas no garantizan resultados futuros.
            </p>
        </div>
      </footer>
    </div>
  );
}