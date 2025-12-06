import { GoogleGenAI } from "@google/genai";
import { db } from "../../../lib/firebase"; 
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { NextResponse } from "next/server";

// --- PROMPT 1: SEMANAL (Ajustado para llenar tus Tarjetas) ---
const PROMPT_WEEKLY = `
ROL: Analista de Mercado Táctico.
OBJETIVO: Informe 'Weekly Brief' con noticias frescas.
HERRAMIENTA: Google Search (Grounding).

INSTRUCCIONES:
1. Busca noticias de los últimos 7 días sobre: Inflación, PIB, Bancos Centrales (Fed/BCE) y Geopolítica.
2. Genera contenido específico para las 4 áreas de análisis: Tasas, Renta Variable, Crédito y Flujos.

SALIDA JSON (Usa EXACTAMENTE estas claves para que el Frontend funcione):
{
  "report_type": "WEEKLY",
  "title": "Weekly Market Brief",
  "executive_summary": "Resumen ejecutivo de lo más importante de la semana (200 palabras).",
  "thesis": { "content": "La tesis principal o conclusión de inversión para la semana." },
  
  "rates": { 
      "title": "Tasas & Curvas", 
      "content": "Análisis de bonos (US10Y, Bund) y política monetaria.", 
      "key_metric": "US10Y: X.X%" 
  },
  "equity_valuation": { 
      "title": "Valoración Equity", 
      "content": "Análisis de bolsas (S&P500, Nasdaq). ¿Están caras o baratas?", 
      "key_metric": "S&P P/E: XXx" 
  },
  "credit_risk": { 
      "title": "Riesgo Crédito", 
      "content": "Situación de spreads corporativos y High Yield.", 
      "key_metric": "Spreads: Estables/Altos" 
  },
  "flows_positioning": { 
      "title": "Flujos & Posicionamiento", 
      "content": "Sentimiento de mercado (Bull/Bear) y flujos de fondos.", 
      "key_metric": "Sentimiento: Fear/Greed" 
  }
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
  "executive_summary": "Visión estratégica del mes.",
  "model_portfolio": [
    { "asset_class": "Renta Variable", "region": "EE.UU.", "weight": 25, "benchmark": 20, "view": "Sobreponderar", "rationale": "..." },
    { "asset_class": "Renta Variable", "region": "Europa", "weight": 15, "benchmark": 15, "view": "Neutral", "rationale": "..." },
    { "asset_class": "Renta Variable", "region": "Emergentes", "weight": 5, "benchmark": 10, "view": "Infraponderar", "rationale": "..." },
    { "asset_class": "Renta Fija", "region": "Gobierno Corto", "weight": 20, "benchmark": 15, "view": "Sobreponderar", "rationale": "..." },
    { "asset_class": "Renta Fija", "region": "Gobierno Largo", "weight": 10, "benchmark": 15, "view": "Infraponderar", "rationale": "..." },
    { "asset_class": "Crédito", "region": "IG / HY", "weight": 15, "benchmark": 15, "view": "Neutral", "rationale": "..." },
    { "asset_class": "Alternativos", "region": "Oro", "weight": 5, "benchmark": 5, "view": "Neutral", "rationale": "..." },
    { "asset_class": "Liquidez", "region": "USD", "weight": 5, "benchmark": 5, "view": "Neutral", "rationale": "..." }
  ]
}
`;

export async function GET(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Falta API Key" }, { status: 500 });

    const { searchParams } = new URL(req.url);
    const typeParam = searchParams.get("type"); 
    const isMonthly = typeParam === "monthly";
    const selectedPrompt = isMonthly ? PROMPT_MONTHLY : PROMPT_WEEKLY;
    const dbTag = isMonthly ? "MONTHLY_PORTFOLIO" : "WEEKLY_MACRO";
    const modelId = "gemini-2.5-flash"; 

    const ai = new GoogleGenAI({ apiKey });
    // Configuración SIN responseMimeType para evitar error con Google Search
    const config = {
      tools: [{ googleSearch: {} }], 
    };

    const currentDate = new Date().toLocaleDateString();
    const fullPrompt = `Fecha actual: ${currentDate}. \n${selectedPrompt}`;

    const result = await ai.models.generateContent({
      model: modelId,
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      config: config
    });

    // LIMPIEZA DE JSON (Crucial para Gemini + Search)
    let responseText = result.text || "{}"; 
    responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const analysisData = JSON.parse(responseText);

    await addDoc(collection(db, "analysis_results"), {
      period: isMonthly ? "Monthly" : "Weekly",
      ...analysisData,
      createdAt: Timestamp.now(),
      type: dbTag,
      model_used: modelId
    });

    return NextResponse.json({ success: true, mode: dbTag, data: analysisData });

  } catch (error: any) {
    console.error("Error Deep Research:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}