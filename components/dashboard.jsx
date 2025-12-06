import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase'; // Ajusta la ruta a tu archivo firebase.js
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { Download, FileText, PieChart, RefreshCw } from 'lucide-react';

// Importamos tus componentes de visualización
import DeepResearchSection from './DeepResearchSection'; // Tu componente de tarjetas (Semanal)
import PortfolioTable from './PortfolioTable';         // El componente nuevo de tabla (Mensual)

const Dashboard = () => {
  const [viewMode, setViewMode] = useState('weekly'); // Estado del interruptor: 'weekly' | 'monthly'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- EFECTO: BUSCAR EN FIREBASE ---
  // Se ejecuta cada vez que cambias el interruptor (viewMode)
  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      setData(null);

      try {
        // 1. Definimos qué "etiqueta" buscar en base al botón pulsado
        const dbTag = viewMode === 'weekly' ? 'WEEKLY_MACRO' : 'MONTHLY_PORTFOLIO';

        // 2. Construimos la consulta: "Dame el último informe de este tipo"
        const reportsRef = collection(db, "analysis_results");
        const q = query(
          reportsRef,
          where("type", "==", dbTag),
          orderBy("createdAt", "desc"), // Ordenar por fecha (el más nuevo primero)
          limit(1)                      // Solo necesitamos uno
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // Extraemos la data del documento encontrado
          const docData = querySnapshot.docs[0].data();
          setData(docData);
        } else {
          // No hay informes aún (ej: es la primera vez que lanzas la app)
          setError("No hay informes disponibles todavía. Espera al próximo cierre programado.");
        }
      } catch (err) {
        console.error("Error fetching report:", err);
        setError("Error de conexión al cargar el informe.");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [viewMode]); // <--- Dependencia clave: se dispara al cambiar viewMode

  // Función para imprimir PDF limpio
  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 print:p-0 print:bg-white">
      
      {/* --- HEADER DE CONTROL (Oculto al imprimir) --- */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4 print:hidden">
        
        {/* Selector de Informe */}
        <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex">
          <button 
            onClick={() => setViewMode('weekly')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              viewMode === 'weekly' 
                ? 'bg-slate-900 text-white shadow-md' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <FileText size={18} /> Market Brief (Semanal)
          </button>
          <button 
            onClick={() => setViewMode('monthly')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              viewMode === 'monthly' 
                ? 'bg-slate-900 text-white shadow-md' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <PieChart size={18} /> Asset Allocation (Mensual)
          </button>
        </div>

        {/* Botón Descarga */}
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-sm hover:shadow active:scale-95"
        >
          <Download size={18} /> Descargar PDF
        </button>
      </div>

      {/* --- ÁREA DE CONTENIDO (Se imprime) --- */}
      <main className="max-w-5xl mx-auto bg-white p-8 md:p-12 rounded-2xl shadow-xl border border-slate-100 print:shadow-none print:border-none print:p-0">
        
        {/* Encabezado del Informe */}
        <header className="border-b-4 border-slate-900 pb-6 mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight">
              {viewMode === 'weekly' ? 'Weekly Market Brief' : 'Monthly Strategy'}
            </h1>
            <p className="text-slate-500 mt-2 text-lg font-light flex items-center gap-2">
              {data?.title || "Informe de Estrategia Global"}
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-sm text-slate-400 font-mono mb-1">FECHA DE EMISIÓN</div>
            <div className="text-xl font-bold text-slate-800">
              {data ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : "-/-/-"}
            </div>
          </div>
        </header>

        {/* --- ESTADOS DE CARGA Y ERROR --- */}
        {loading && (
          <div className="py-20 text-center text-slate-400 animate-pulse flex flex-col items-center">
            <RefreshCw className="animate-spin mb-4" size={32} />
            Cargando análisis de Gemini...
          </div>
        )}

        {error && (
          <div className="py-12 text-center text-red-500 bg-red-50 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        {/* --- RENDERIZADO CONDICIONAL DEL CONTENIDO --- */}
        {!loading && !error && data && (
          <div className="animate-in fade-in duration-500">
            {/* Tesis Ejecutiva (Común a ambos) */}
             <div className="mb-10 bg-slate-50 p-6 rounded-xl border-l-4 border-slate-800 italic text-slate-700 text-lg leading-relaxed">
               "{data.executive_summary || data.thesis_monthly}"
             </div>

            {/* CUERPO DEL INFORME: Aquí ocurre la magia del cambio */}
            {viewMode === 'weekly' ? (
              // MODO SEMANAL: Usamos tu componente de tarjetas original
              <DeepResearchSection data={data} />
            ) : (
              // MODO MENSUAL: Usamos la tabla de cartera que creamos
              <PortfolioTable portfolio={data.model_portfolio} />
            )}

            {/* Pie de página legal */}
            <footer className="mt-16 pt-8 border-t border-slate-100 text-center text-xs text-slate-400 font-mono">
              Generado automáticamente por Gemini 1.5 Pro + Vertex AI • Uso interno exclusivo.
            </footer>
          </div>
        )}
      </main>

      {/* Estilos específicos para impresión */}
      <style jsx global>{`
        @media print {
          @page { margin: 15mm; size: auto; }
          body { background: white; -webkit-print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          .print\\:p-0 { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;