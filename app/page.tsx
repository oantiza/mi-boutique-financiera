'use client';

import React, { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

// --- 1. CONFIGURACIÓN DE FIREBASE (CLIENTE) ---
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID + ".firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID + ".firebasestorage.app",
  messagingSenderId: "SENDER_ID", // Opcional
  appId: "APP_ID" // Opcional
};

// Singleton para evitar reinicializaciones en React
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// --- 2. COMPONENTE DASHBOARD ---
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('monthly'); // Por defecto Monthly
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Efecto para cargar datos al cambiar de pestaña
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setReportData(null);

      try {
        // Mapear la pestaña al "Tag" que usamos en la base de datos
        const dbTag = activeTab === 'monthly' ? 'MONTHLY_PORTFOLIO' : 'WEEKLY_MACRO';
        
        const q = query(
          collection(db, 'analysis_results'),
          where('type', '==', dbTag),
          orderBy('createdAt', 'desc'),
          limit(1)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // Tomamos el primer documento encontrado
          setReportData(querySnapshot.docs[0].data());
        } else {
          // No hay datos
          setReportData(null);
        }
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError("Error cargando el informe. Verifica tu conexión o el índice de Firebase.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  // Función para renderizar el Portfolio (Solo Monthly)
  const renderPortfolioTable = () => {
    if (!reportData?.model_portfolio) return null;
    return (
      <div className="overflow-x-auto bg-white rounded-lg shadow mt-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clase</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Región</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peso</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visión</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Convicción</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reportData.model_portfolio.map((item: any, idx: number) => (
              <tr key={idx}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.asset_class}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.region}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-bold">{item.weight}%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.view === 'Sobreponderar' ? 'bg-green-100 text-green-800' : 
                        item.view === 'Infraponderar' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                        {item.view}
                    </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{'★'.repeat(item.conviction)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800">
      
      {/* --- HEADER --- */}
      <header className="bg-slate-900 text-white py-8 px-6 shadow-lg border-b-4 border-yellow-500">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-serif font-bold tracking-tight">Global Investment Outlook</h1>
          <p className="text-yellow-500 font-bold tracking-widest text-sm mt-2 uppercase">
             {activeTab === 'monthly' ? 'ESTRATEGIA MENSUAL' : 'TÁCTICO SEMANAL'}
          </p>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          
          {/* Selector de Pestañas */}
          <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setActiveTab('weekly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'weekly' 
                  ? 'bg-slate-800 text-white shadow' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span className="flex items-center gap-2">
                 ⚡ Táctico (Semanal)
              </span>
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'monthly' 
                  ? 'bg-yellow-500 text-slate-900 shadow' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span className="flex items-center gap-2">
                 📅 Estratégico (Mensual)
              </span>
            </button>
          </div>

          {/* Botón de Descarga PDF */}
          <button
            onClick={() => window.open(`/api/export-pdf?type=${activeTab}`, '_blank')}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md shadow-sm flex items-center gap-2 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 12.75l-3.25-3.25m-3.25 3.25H12m0 0l3.25-3.25M12 12.75V3" />
            </svg>
            Descargar PDF
          </button>
        </div>

        {/* --- ESTADOS DE CARGA / ERROR / VACÍO --- */}
        {loading && (
            <div className="p-12 text-center text-gray-500 animate-pulse">
                Cargando inteligencia de mercado...
            </div>
        )}

        {error && (
            <div className="p-6 bg-red-50 text-red-700 rounded-lg border border-red-200">
                {error}
            </div>
        )}

        {!loading && !error && !reportData && (
            <div className="p-12 text-center bg-white rounded-lg shadow border border-gray-200">
                <div className="mx-auto w-12 h-12 text-yellow-500 mb-4">⚠️</div>
                <h3 className="text-lg font-medium text-gray-900">Sin Informes Disponibles</h3>
                <p className="text-gray-500 mt-2">No se ha encontrado un informe {activeTab} reciente en la base de datos.</p>
                <p className="text-xs text-gray-400 mt-4">Verifica que el Cron Job se haya ejecutado.</p>
            </div>
        )}

        {/* --- CONTENIDO DEL INFORME --- */}
        {!loading && reportData && (
          <div className="space-y-8 animate-in fade-in duration-500">
            
            {/* 1. Resumen Ejecutivo */}
            <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h2 className="text-xl font-serif font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-yellow-500 rounded-full"></span>
                Resumen Ejecutivo
              </h2>
              <div className="prose prose-slate max-w-none text-gray-700 leading-relaxed">
                <p>{reportData.executive_summary}</p>
              </div>
            </section>

            {/* 2. Grid de Métricas (Drivers & Sentiment) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Sentimiento */}
                <div className="bg-slate-800 text-white p-6 rounded-lg shadow">
                    <h3 className="text-sm uppercase tracking-wider text-gray-400 mb-2">Sentimiento de Mercado</h3>
                    <p className="text-3xl font-bold text-yellow-400">{reportData.marketSentiment || "Neutral"}</p>
                </div>

                {/* Drivers (Lista) */}
                <div className="md:col-span-2 bg-white p-6 rounded-lg shadow border border-gray-100">
                    <h3 className="text-sm uppercase tracking-wider text-gray-500 mb-4">Drivers Principales</h3>
                    <ul className="space-y-3">
                        {reportData.keyDrivers?.map((driver: any, i: number) => (
                            <li key={i} className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-bold">
                                    {i + 1}
                                </span>
                                <div>
                                    <span className="font-semibold text-gray-900 block">{driver.title}</span>
                                    <span className="text-sm text-gray-600">{driver.impact}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* 3. Cartera Modelo (Solo si es Monthly) */}
            {activeTab === 'monthly' && reportData.model_portfolio && (
                <section>
                    <h2 className="text-xl font-serif font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-1 h-6 bg-yellow-500 rounded-full"></span>
                        Matriz de Asignación de Activos
                    </h2>
                    {renderPortfolioTable()}
                </section>
            )}

             {/* 4. Tesis (Si existe) */}
             {reportData.thesis && (
                 <section className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                     <h3 className="text-lg font-bold text-blue-900 mb-2">Tesis Central</h3>
                     <p className="text-blue-800">{reportData.thesis.content}</p>
                 </section>
             )}

            <div className="text-center text-xs text-gray-400 mt-12 pb-8">
              <p>© {new Date().getFullYear()} Global Asset Management. Generado por AI (Gemini 2.5).</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}