"use client";
import { useState } from "react";
// Importamos fuentes de Google Fonts dinámicamente
import { Playfair_Display, Roboto } from 'next/font/google';

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '700'] });
const roboto = Roboto({ subsets: ['latin'], weight: ['300', '400', '500', '700'] });

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleAnalyze = async () => {
    if (!inputText.trim()) return alert("Por favor pega un informe de mercado.");
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/analizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });
      const data = await response.json();
      if (response.ok) setResult(data.data);
      else alert("Error: " + data.error);
    } catch (error) {
      console.error(error);
      alert("Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  // Función para replicar los estilos de etiquetas del HTML original
  const getViewStyle = (view: string) => {
    if (view.includes("Sobreponderar")) return "text-[#10B981] font-bold"; // Green
    if (view.includes("Infraponderar")) return "text-red-600 font-bold";   // Red
    return "text-[#D4AF37] font-bold"; // Gold/Neutral
  };

  const getBadgeStyle = (view: string) => {
    if (view.includes("Sobreponderar")) return "bg-[#10B981]";
    if (view.includes("Infraponderar")) return "bg-red-500";
    return "bg-[#D4AF37]";
  };

  return (
    <main className={`min-h-screen bg-[#F3F4F6] ${roboto.className} text-[#1F2937]`}>
      
      {/* --- HEADER --- */}
      <header className="bg-[#0B2545] text-white py-12 px-4 shadow-xl border-b-8 border-[#D4AF37]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center pb-6">
            <div className="text-center md:text-left">
              <h1 className={`${playfair.className} text-4xl md:text-5xl font-bold tracking-tight mb-2`}>
                Perspectiva Global de Inversión
              </h1>
              <p className="text-[#D4AF37] text-xl font-medium uppercase tracking-widest">
                Estrategia Trimestral Q4 2025
              </p>
            </div>
            <div className="mt-6 md:mt-0 text-right hidden md:block">
              <p className="text-gray-300 font-light">Preparado para el Comité de Dirección</p>
              <p className="font-bold">Oficina del CIO Global AI</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-12">
        
        {/* INPUT AREA (Ocultable si ya hay resultados) */}
        {!result && (
          <div className="bg-white p-8 rounded-lg shadow-md mb-12 border-t-4 border-[#0B2545]">
            <h2 className={`${playfair.className} text-2xl font-bold text-[#0B2545] mb-4`}>
              Panel de Control del Analista
            </h2>
            <textarea
              className="w-full h-40 p-4 border border-gray-300 rounded focus:ring-2 focus:ring-[#0B2545] focus:border-transparent transition bg-gray-50"
              placeholder="Pega aquí las notas de mercado, datos macro o informes para procesar..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className={`mt-6 w-full py-4 px-6 rounded text-white font-bold text-lg tracking-wide uppercase transition-all
                ${loading 
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-[#0B2545] hover:bg-[#1E40AF] shadow-lg hover:shadow-xl border border-[#D4AF37]"
                }`}
            >
              {loading ? "Generando Estrategia Institucional..." : "Inicializar Deep Research"}
            </button>
          </div>
        )}

        {/* --- INFORME GENERADO --- */}
        {result && (
          <div className="space-y-12 animate-fade-in">
             <div className="flex justify-end">
                <button onClick={() => setResult(null)} className="text-sm text-gray-500 hover:text-[#0B2545] underline">
                   ← Analizar otro documento
                </button>
             </div>

            {/* SECCIÓN 1: RESUMEN EJECUTIVO & TARJETAS */}
            <section>
              <h2 className={`${playfair.className} text-3xl font-bold text-[#0B2545] mb-6 border-l-4 border-[#D4AF37] pl-4`}>
                1. Resumen Ejecutivo (The Bottom Line)
              </h2>
              <div className="bg-white rounded-lg shadow-md p-8">
                <p className="text-lg leading-relaxed text-gray-700 mb-8 border-b border-gray-100 pb-8">
                  {result.executive_summary}
                </p>

                {/* Tarjetas Estilo HTML Original */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Tarjeta 1 */}
                  <div className="bg-[#F8FAFC] border-t-4 border-[#1E40AF] p-6 rounded shadow-sm text-center">
                    <h3 className="text-gray-500 uppercase text-xs font-bold tracking-wider mb-2">Postura Global</h3>
                    <p className={`${playfair.className} text-xl font-bold text-[#0B2545]`}>
                      {result.cards?.global_stance}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">{result.cards?.stance_subtitle}</p>
                  </div>

                  {/* Tarjeta 2 */}
                  <div className="bg-[#F8FAFC] border-t-4 border-[#D4AF37] p-6 rounded shadow-sm text-center">
                    <h3 className="text-gray-500 uppercase text-xs font-bold tracking-wider mb-2">Riesgo Principal</h3>
                    <p className={`${playfair.className} text-xl font-bold text-[#0B2545]`}>
                      {result.cards?.main_risk}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">{result.cards?.risk_subtitle}</p>
                  </div>

                  {/* Tarjeta 3 */}
                  <div className="bg-[#F8FAFC] border-t-4 border-[#10B981] p-6 rounded shadow-sm text-center">
                    <h3 className="text-gray-500 uppercase text-xs font-bold tracking-wider mb-2">Oportunidad Táctica</h3>
                    <p className={`${playfair.className} text-xl font-bold text-[#0B2545]`}>
                      {result.cards?.tactical_opportunity}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">{result.cards?.opportunity_subtitle}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* SECCIÓN 2: MACRO */}
            <section>
               <h2 className={`${playfair.className} text-3xl font-bold text-[#0B2545] mb-6 border-l-4 border-[#D4AF37] pl-4`}>
                2. Análisis del Entorno Macro
              </h2>
              <div className="bg-white p-6 rounded-lg shadow-md text-gray-700 leading-relaxed">
                 {result.macro_analysis}
              </div>
            </section>

            {/* SECCIÓN 3: MATRIZ DE ASIGNACIÓN (TABLA) */}
            <section>
              <h2 className={`${playfair.className} text-3xl font-bold text-[#0B2545] mb-6 border-l-4 border-[#D4AF37] pl-4`}>
                3. Matriz de Asignación Táctica
              </h2>
              <div className="bg-white rounded-lg shadow-md overflow-hidden overflow-x-auto">
                <table className="min-w-full text-sm text-left text-gray-600">
                  <thead className="text-xs text-white uppercase bg-[#0B2545]">
                    <tr>
                      <th className="px-6 py-4 font-bold tracking-wider">Clase de Activo</th>
                      <th className="px-6 py-4 font-bold tracking-wider">Zona / Región</th>
                      <th className="px-6 py-4 font-bold tracking-wider">Visión</th>
                      <th className="px-6 py-4 font-bold tracking-wider text-center">Convicción</th>
                      <th className="px-6 py-4 font-bold tracking-wider">Rationale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {result.allocation_matrix?.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50 transition bg-white">
                        <td className="px-6 py-4 font-bold text-[#0B2545]">{row.asset}</td>
                        <td className="px-6 py-4 text-gray-900 font-medium">{row.region}</td>
                        
                        <td className={`px-6 py-4 ${getViewStyle(row.view)}`}>
                          {row.view}
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span className={`${getBadgeStyle(row.view)} text-white py-1 px-3 rounded-full text-xs font-bold`}>
                            {row.conviction}/5
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 text-xs leading-relaxed max-w-xs">
                          {row.rationale}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

          </div>
        )}
        
        {/* Footer Estilo Original */}
        <footer className="mt-16 text-center text-gray-400 text-xs border-t border-gray-300 pt-8">
            <p>© 2025 Global Asset Management - Oficina del CIO.</p>
            <p className="mt-2">CONFIDENCIAL. Documento generado por IA. Verificar datos con fuentes primarias.</p>
        </footer>

      </div>
    </main>
  );
}