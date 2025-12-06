import { GoogleGenAI } from "@google/genai";
import { db } from "../../../lib/firebase"; 
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { NextResponse } from "next/server";

// --- PROMPT 1: SEMANAL (El Periodista) ---
const PROMPT_WEEKLY = `
ROL: Analista de Mercado Táctico.
OBJETIVO: Informe 'Weekly Brief' con noticias frescas.
HERRAMIENTA: Google Search (Grounding).

INSTRUCCIONES:
1. Busca noticias de los últimos 7 días sobre: Inflación, PIB, Bancos Centrales (Fed/BCE) y Geopolítica.
2. Analiza el sentimiento de mercado a corto plazo (Bullish/Bearish).
3. No inventes datos. Usa las fuentes encontradas.

SALIDA JSON:
{
  "report_type": "WEEKLY",
  "title": "Weekly Market Brief",
  "executive_summary": "Resumen de 200 palabras.",
  "macro_analysis": "Análisis de noticias...",
  "market_moves": "Resumen de movimientos S&P500 y Bonos.",
  "tactical_opportunity": "Oportunidad de la semana."
}
`;

// --- PROMPT 2: MENSUAL (El Gestor de Fondos) ---
const PROMPT_MONTHLY = `
ROL: Chief Investment Officer (CIO).
OBJETIVO: Estrategia de Asignación de Activos (Asset Allocation).
HERRAMIENTA: Google Search (Grounding) para datos de cierre de mes.

INSTRUCCIONES:
1. Investiga: Cierre mensual de S&P500, Yield 10Y, VIX y datos Macro clave.
2. CONSTRUYE UNA CARTERA MODELO (Suma de pesos = 100%).
3. Define la Tesis de Inversión para el mes entrante.

SALIDA JSON:
{
  "report_type": "MONTHLY",
  "title": "Monthly Asset Allocation Strategy",
  "thesis_monthly": "Tesis central...",
  "macro_cycle": { "stage": "Expansion/Recession", "desc": "..." },
  "model_portfolio": [
    { 
      "asset_class": "Renta Variable", 
      "region": "EE.UU.", 
      "weight": 25, 
      "benchmark": 20, 
      "view": "Sobreponderar", 
      "rationale": "Justificación..." 
    },
    // ... Genera entre 6 y 8 filas cubriendo RF, RV, Cash y Alternativos
    { "asset_class": "Liquidez", "region": "Global", "weight": 5, "benchmark": 5, "view": "Neutral", "rationale": "..." }
  ]
}
`;

export async function GET(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Falta API Key" }, { status: 500 });

    // 1. DETECTAR EL MODO (Semanal o Mensual)
    // Buscamos el parámetro en la URL (ej: /api/research?type=monthly)
    const { searchParams } = new URL(req.url);
    const typeParam = searchParams.get("type"); 
    
    // Por defecto es semanal, salvo que digamos lo contrario
    const isMonthly = typeParam === "monthly";
    const selectedPrompt = isMonthly ? PROMPT_MONTHLY : PROMPT_WEEKLY;
    const dbTag = isMonthly ? "MONTHLY_PORTFOLIO" : "WEEKLY_MACRO";
    const modelId = "gemini-2.5-flash"; // Modelo rápido y potente

    // 2. CONFIGURAR GEMINI CON BÚSQUEDA
    const ai = new GoogleGenAI({ apiKey });
    const config = {
      tools: [{ googleSearch: {} }], // Activamos Deep Research
      responseMimeType: "application/json" // Forzamos JSON limpio
    };

    // 3. EJECUTAR LA INVESTIGACIÓN
    // Añadimos fecha actual para que el modelo sepa en qué día vive
    const currentDate = new Date().toLocaleDateString();
    const fullPrompt = `Fecha actual: ${currentDate}. \n${selectedPrompt}`;

    const result = await ai.models.generateContent({
      model: modelId,
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      config: config
    });

    // 4. GUARDAR EN BASE DE DATOS
    // Usamos el operador ?.() por si acaso y un valor por defecto
// SIN PARÉNTESIS:
const responseText = result.text || "{}"; 
const analysisData = JSON.parse(responseText);

    await addDoc(collection(db, "analysis_results"), {
      period: isMonthly ? "Monthly" : "Weekly",
      ...analysisData, // Guardamos todo el JSON generado
      createdAt: Timestamp.now(),
      type: dbTag, // Etiqueta clave para filtrar en el Frontend
      model_used: modelId
    });

    return NextResponse.json({ success: true, mode: dbTag, data: analysisData });

  } catch (error: any) {
    console.error("Error Deep Research:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
// Forzando actualizacion