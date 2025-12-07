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
  messagingSenderId: "SENDER_ID", // Opcional para lectura
  appId: "APP_ID" // Opcional para lectura
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
          // No hay datos, el estado se queda null
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
      
      {/* --- HEADER CORREGIDO --- */}
      <header className="bg-slate-900 text-white py-8 px-6 shadow-lg border-b-4 border-yellow-500">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-serif font-bold tracking-tight">Global Investment Outlook</h1>
          
          {/* Texto corregido: Sin "Oficina del CIO" y usando el texto solicitado */}
          <p className="text-yellow-500 font-bold tracking-widest text-sm mt-2 uppercase">
             {activeTab === 'monthly' ? 'ESTRATEGIA MENSUAL' : 'TÁCTICO SEMANAL'}
          </p>
        </div>
      </header>

      {/* --- CONTROLES Y PESTAÑAS --- */}
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