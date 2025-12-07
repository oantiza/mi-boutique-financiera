'use client';

import React, { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

// Configuración Firebase Cliente
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setReportData(null);

      try {
        // Mapeo de pestañas a etiquetas de Base de Datos
        const dbTag = activeTab === 'monthly' ? 'MONTHLY_PORTFOLIO' : 'WEEKLY_MACRO';
        
        const q = query(
          collection(db, 'analysis_results'),
          where('type', '==', dbTag),
          orderBy('createdAt', 'desc'),
          limit(1)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          setReportData(querySnapshot.docs[0].data());
        }
      } catch (err: any) {
        console.error("Error cargando datos:", err);
        setError("Error de conexión o índice faltante en Firebase.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  const renderPortfolioTable = () => {
    if (!reportData?.model_portfolio) return null;
    return (
      <div className="overflow-x-auto bg-white rounded-lg shadow mt-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clase</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Región</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Peso</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visión</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Convicción</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reportData.model_portfolio.map((item: any, idx: number) => (
              <tr key={idx}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.asset_class}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{item.region}</td>
                <td className="px-6 py-4 text-sm text-gray-500 font-bold">{item.weight}%</td>
                <td className="px-6 py-4 text-sm text-gray-500">{item.view}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{'★'.repeat(item.conviction || 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800">
      <header className="bg-slate-900 text-white py-8 px-6 shadow-lg border-b-4 border-yellow-500">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-serif font-bold tracking-tight">Global Investment Outlook</h1>
          <p className="text-yellow-500 font-bold tracking-widest text-sm mt-2 uppercase">
             {activeTab === 'monthly' ? 'ESTRATEGIA MENSUAL' : 'TÁCTICO SEMANAL'}
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setActiveTab('weekly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'weekly' ? 'bg-slate-800 text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              ⚡ Táctico (Semanal)
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'monthly' ? 'bg-yellow-500 text-slate-900' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              📅 Estratégico (Mensual)
            </button>
          </div>

          <button
            onClick={() => window.open(`/api/export-pdf?type=${activeTab}`, '_blank')}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md shadow-sm flex items-center gap-2"
          >
            Descargar PDF
          </button>
        </div>

        {loading && <div className="p-12 text-center text-gray-500 animate-pulse">Cargando inteligencia...</div>}
        
        {!loading && !reportData && (
            <div className="p-12 text-center bg-white rounded-lg shadow">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-lg font-medium">Sin Informes Disponibles</h3>
                <p className="text-gray-500">No se encontró el informe {activeTab}. Ejecuta el Cron Job.</p>
            </div>
        )}

        {!loading && reportData && (
          <div className="space-y-8 animate-in fade-in">
            <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h2 className="text-xl font-serif font-bold text-slate-800 mb-4 border-l-4 border-yellow-500 pl-4">
                Resumen Ejecutivo
              </h2>
              <div className="prose max-w-none text-gray-700">{reportData.executive_summary}</div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-800 text-white p-6 rounded-lg shadow">
                    <h3 className="text-sm uppercase text-gray-400 mb-2">Sentimiento</h3>
                    <p className="text-3xl font-bold text-yellow-400">{reportData.marketSentiment}</p>
                </div>
                <div className="md:col-span-2 bg-white p-6 rounded-lg shadow">
                    <h3 className="text-sm uppercase text-gray-500 mb-4">Drivers Principales</h3>
                    <ul className="space-y-3">
                        {reportData.keyDrivers?.map((driver: any, i: number) => (
                            <li key={i} className="flex gap-3">
                                <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                                <div><span className="font-bold block">{driver.title}</span><span className="text-sm">{driver.impact}</span></div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {activeTab === 'monthly' && (
                <section>
                    <h2 className="text-xl font-serif font-bold text-slate-800 mb-4 border-l-4 border-yellow-500 pl-4">Matriz de Asignación</h2>
                    {renderPortfolioTable()}
                </section>
            )}
            
            <div className="text-center text-xs text-gray-400 mt-12 pb-8">
              © 2025 Global Asset Management - Generado por Gemini 2.5 Flash
            </div>
          </div>
        )}
      </main>
    </div>
  );
}