"use client";
import { useState, useEffect } from "react";
import { Playfair_Display, Roboto } from 'next/font/google';
import { db } from "../lib/firebase"; 
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
// Iconos para la sección Deep Research
import { Activity, BarChart2, Layers, PieChart as PieIcon, Zap, BookOpen } from 'lucide-react';

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '700'] });
const roboto = Roboto({ subsets: ['latin'], weight: ['300', '400', '500', '700'] });

const COLORS = ['#0B2545', '#10B981', '#D4AF37', '#EF4444', '#8B5CF6', '#F59E0B'];

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true); 
  const [result, setResult] = useState<any>(null);

  // 1. AUTO-CARGA
  useEffect(() => {
    const fetchLastReport = async () => {
      try {
        const q = query(
          collection(db, "analysis_results"),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          setResult(querySnapshot.docs[0].data());
        }
      } catch (error) {
        console.error("Error cargando informe:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLastReport();
  }, []);

  // Manejo manual
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

  const chartData = result?.allocation_matrix?.map((item: any) => ({
    name: item.asset || item.region,
    value: item.weight || item.conviction * 10 || 10 
  })) || [];

  const getViewStyle = (view: string) => {
    const v = view?.toLowerCase() || "";
    if (v.includes("sobre") || v.includes("over") || v.includes("bull")) return "text-[#10B981] font-bold"; 
    if (v.includes("infra") || v.includes("under") || v.includes("bear")) return "text-red-600 font-bold";   
    return "text-[#D4AF37] font-bold"; 
  };

  // Configuración para las tarjetas de Deep Research
  const researchCards = [
    { key: 'rates', title: 'Tasas & Curvas', icon: Activity, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-700' },
    { key: 'valuation', title: 'Valoración Equity', icon: BarChart2, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-600' },
    { key: 'credit', title: 'Riesgo Crédito', icon: Layers, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-600' },
    { key: 'flows', title: 'Flujos & Sentimiento', icon: PieIcon, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-500' },
  ];

  return (
    <main className={`min-h-screen bg-[#F3F4F6] ${roboto.className} text-[#1F2937]`}>
      
      {/* HEADER */}
      <header className="bg-[#0B2545] text-white py-8 px-4 shadow-xl border-b-8 border-[#D4AF37]">
        <div className="max-w-7xl mx-auto">
          <h1 className={`${playfair.className} text-3xl md:text-4xl font-bold tracking-tight`}>
            Perspectiva Global de Inversión
          </h1>
          <p className="text-[#D4AF37] text-sm font-medium uppercase tracking-widest mt-1">
            Oficina del CIO • {result ? new Date(result.createdAt?.seconds * 1000).toLocaleDateString() : "Cargando..."}
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {loading && (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B2545] mx-auto"></div>
            <p className="mt-4 text-gray-500">Recuperando inteligencia de mercado...</p>
          </div>
        )}

        {!result && !loading && (
          <div className="bg-white p-8 rounded-lg shadow-md mb-12 border-t-4 border-[#0B2545]">
            <h2 className={`${playfair.className} text-2xl font-bold text-[#0B2545] mb-4`}>Panel de Control</h2>
            <textarea
              className="w-full h-32 p-4 border border-gray-300 rounded bg-gray-50"
              placeholder="Pega aquí un informe..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button onClick={handleAnalyze} className="mt-4 bg-[#0B2545] text-white py-3 px-6 rounded font-bold w-full">
              Analizar Manualmente
            </button>
          </div>
        )}

        {/* --- DASHBOARD --- */}
        {result && (
          <div className="space-y-8 animate-fade-in pb-12">
            
            {/* 1. RESUMEN EJECUTIVO */}
            <section className="bg-white rounded-xl shadow-sm p-6 md:p-8 border-l-4 border-[#D4AF37]">
              <h2 className={`${playfair.className} text-2xl font-bold text-[#0B2545] mb-4`}>The Bottom Line</h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">{result.executive_summary}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {result.cards && Object.entries(result.cards).map(([key, value]: any, i: number) => {
                    // Filtramos claves que son subtítulos para mostrarlos juntos si quieres, o simple
                    if (key.includes('subtitle')) return null; 
                    return (
                    <div key={i} className="bg-slate-50 p-4 rounded border border-slate-200">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">{key.replace('_', ' ')}</p>
                        <p className="font-bold text-[#0B2545] text-lg">{value}</p>
                        <p className="text-xs text-gray-500 mt-1">{result.cards[key + '_subtitle']}</p>
                    </div>
                    )
                })}
              </div>
            </section>

            {/* 2. ASIGNACIÓN DE ACTIVOS (Gráfico y Tabla) */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl shadow-sm p-6 col-span-1 border-t-4 border-[#10B981]">
                <h3 className="font-bold text-gray-700 mb-4 text-center">Asset Allocation</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
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

              <div className="bg-white rounded-xl shadow-sm overflow-hidden col-span-1 md:col-span-2 border-t-4 border-[#10B981]">
                 <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>
                      <th className="px-6 py-3">Activo</th>
                      <th className="px-6 py-3">Región</th>
                      <th className="px-6 py-3">Visión</th>
                      <th className="px-6 py-3">Rationale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.allocation_matrix?.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 font-bold text-[#0B2545]">{row.asset}</td>
                        <td className="px-6 py-4 text-gray-500">{row.region}</td>
                        <td className={`px-6 py-4 ${getViewStyle(row.view)}`}>{row.view}</td>
                        <td className="px-6 py-4 text-xs text-gray-500 max-w-xs">{row.rationale}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 3. DEEP RESEARCH (Nueva Sección Visual) */}
            <section className="mt-8">
              <div className="flex items-center gap-3 mb-6 border-b border-gray-200 pb-4">
                <div className="p-2 bg-[#0B2545] rounded text-white"><BookOpen size={20} /></div>
                <h2 className={`${playfair.className} text-2xl font-bold text-[#0B2545]`}>Deep Research</h2>
              </div>

              {/* Grid de Tarjetas de Análisis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {researchCards.map((card) => {
                    const content = result.deep_research?.[card.key] || "Sin datos disponibles.";
                    const Icon = card.icon;
                    return (
                        <div key={card.key} className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition overflow-hidden">
                            <div className={`px-5 py-3 border-l-4 ${card.border} ${card.bg} flex items-center gap-3`}>
                                <Icon className={`w-5 h-5 ${card.color}`} />
                                <h3 className="font-bold text-slate-800">{card.title}</h3>
                            </div>
                            <div className="p-5">
                                <p className="text-slate-600 text-sm leading-relaxed">{content}</p>
                            </div>
                        </div>
                    );
                })}
              </div>

              {/* Tesis de Inversión (Destacada) */}
              {result.thesis && (
                <div className="bg-gradient-to-r from-[#0B2545] to-[#1E3A8A] rounded-xl p-8 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-sm font-bold text-[#D4AF37] mb-3 flex items-center gap-2 uppercase tracking-widest">
                            <Zap size={16} className="text-[#D4AF37]" /> Tesis de Inversión Central
                        </h3>
                        <p className={`${playfair.className} text-xl md:text-2xl leading-relaxed italic`}>
                            "{result.thesis.content || result.thesis}"
                        </p>
                    </div>
                </div>
              )}
            </section>

          </div>
        )}
      </div>
    </main>
  );
}