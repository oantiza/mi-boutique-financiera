"use client";
import { useState, useEffect } from "react";
import { Playfair_Display, Roboto } from 'next/font/google';
// --- IMPORTANTE: Ajusta la ruta si tu carpeta lib está en otro sitio ---
import { db } from "../lib/firebase"; 
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
// Gráficos
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '700'] });
const roboto = Roboto({ subsets: ['latin'], weight: ['300', '400', '500', '700'] });

// Colores corporativos para el gráfico
const COLORS = ['#0B2545', '#10B981', '#D4AF37', '#EF4444', '#8B5CF6', '#F59E0B'];

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true); 
  const [result, setResult] = useState<any>(null);

  // 1. EFECTO DE AUTO-CARGA (Lo que faltaba)
  useEffect(() => {
    const fetchLastReport = async () => {
      try {
        // Buscamos el documento más reciente en 'analysis_results'
        const q = query(
          collection(db, "analysis_results"),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          console.log("Informe encontrado en DB");
          const docData = querySnapshot.docs[0].data();
          setResult(docData);
        } else {
          console.log("Base de datos vacía todavía.");
        }
      } catch (error) {
        console.error("Error cargando informe:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLastReport();
  }, []);

  // Manejo manual (opcional, por si quieres probar pegando texto)
  const handleAnalyze = async () => {
    if (!inputText.trim()) return alert("Por favor pega un informe.");
    setLoading(true);
    try {
      const response = await fetch("/api/analizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });
      const data = await response.json();
      if (response.ok) setResult(data.data);
    } catch (error) {
      alert("Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  // Preparar datos para el gráfico (si existen)
  const chartData = result?.allocation_matrix?.map((item: any) => ({
    name: item.asset || item.region,
    value: item.weight || item.conviction * 10 || 10 // Fallback si la IA olvidó el peso
  })) || [];

  // Función de estilos
  const getViewStyle = (view: string) => {
    const v = view?.toLowerCase() || "";
    if (v.includes("sobre") || v.includes("over") || v.includes("bull")) return "text-[#10B981] font-bold"; 
    if (v.includes("infra") || v.includes("under") || v.includes("bear")) return "text-red-600 font-bold";   
    return "text-[#D4AF37] font-bold"; 
  };

  return (
    <main className={`min-h-screen bg-[#F3F4F6] ${roboto.className} text-[#1F2937]`}>
      
      {/* HEADER */}
      <header className="bg-[#0B2545] text-white py-8 px-4 shadow-xl border-b-8 border-[#D4AF37]">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className={`${playfair.className} text-3xl md:text-4xl font-bold tracking-tight`}>
              Perspectiva Global
            </h1>
            <p className="text-[#D4AF37] text-sm font-medium uppercase tracking-widest mt-1">
              Oficina del CIO • {result ? new Date(result.createdAt?.seconds * 1000).toLocaleDateString() : "Esperando datos..."}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* ESTADO DE CARGA */}
        {loading && (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B2545] mx-auto"></div>
            <p className="mt-4 text-gray-500">Analizando mercados con Gemini...</p>
          </div>
        )}

        {/* INPUT MANUAL (Solo se muestra si NO hay resultados todavía) */}
        {!result && !loading && (
          <div className="bg-white p-8 rounded-lg shadow-md mb-12 border-t-4 border-[#0B2545]">
            <h2 className={`${playfair.className} text-2xl font-bold text-[#0B2545] mb-4`}>Panel de Control</h2>
            <textarea
              className="w-full h-32 p-4 border border-gray-300 rounded bg-gray-50"
              placeholder="Pega aquí un informe o espera a recibir un correo..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button onClick={handleAnalyze} className="mt-4 bg-[#0B2545] text-white py-3 px-6 rounded font-bold w-full hover:bg-blue-900 transition">
              Inicializar Deep Research Manual
            </button>
          </div>
        )}

        {/* --- DASHBOARD DE RESULTADOS --- */}
        {result && (
          <div className="space-y-8 animate-fade-in">
            
            {/* 1. RESUMEN EJECUTIVO */}
            <section className="bg-white rounded-xl shadow-sm p-6 md:p-8 border-l-4 border-[#D4AF37]">
              <h2 className={`${playfair.className} text-2xl font-bold text-[#0B2545] mb-4`}>The Bottom Line</h2>
              <p className="text-lg text-gray-700 leading-relaxed">{result.executive_summary}</p>
              
              {/* Tarjetas de Estrategia */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                {result.cards && Object.entries(result.cards).map(([key, value]: any, i: number) => (
                  <div key={i} className="bg-slate-50 p-4 rounded border border-slate-200">
                     <p className="text-xs font-bold text-gray-400 uppercase mb-1">{key.replace('_', ' ')}</p>
                     <p className="font-bold text-[#0B2545]">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* 2. GRÁFICO DE ASIGNACIÓN (DONUT) */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Columna Izquierda: Gráfico */}
              <div className="bg-white rounded-xl shadow-sm p-6 col-span-1">
                <h3 className="font-bold text-gray-700 mb-4 text-center">Asignación Estratégica</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Columna Derecha: Tabla Detallada */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden col-span-1 md:col-span-2">
                 <table className="min-w-full text-sm text-left">
                  <thead className="bg-[#0B2545] text-white uppercase text-xs">
                    <tr>
                      <th className="px-6 py-3">Activo</th>
                      <th className="px-6 py-3">Región</th>
                      <th className="px-6 py-3">Visión</th>
                      <th className="px-6 py-3">Rationale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.allocation_matrix?.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{row.asset}</td>
                        <td className="px-6 py-4 text-gray-500">{row.region}</td>
                        <td className={`px-6 py-4 ${getViewStyle(row.view)}`}>{row.view}</td>
                        <td className="px-6 py-4 text-xs text-gray-500 max-w-xs">{row.rationale}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 3. DEEP RESEARCH & MACRO */}
            <section className="bg-white rounded-xl shadow-sm p-8">
               <h2 className={`${playfair.className} text-2xl font-bold text-[#0B2545] mb-4`}>Análisis Macro & Tesis</h2>
               <div className="prose max-w-none text-gray-600">
                 <p className="whitespace-pre-line mb-6">{result.macro_analysis}</p>
                 
                 {result.thesis && (
                   <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500 italic text-blue-900">
                     "{result.thesis.content || result.thesis}"
                   </div>
                 )}
               </div>
            </section>

          </div>
        )}
      </div>
    </main>
  );
}