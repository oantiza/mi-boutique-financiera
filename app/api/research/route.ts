// --- VERSION FINAL: INCLUYE HIGH YIELD ---
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// 1. CONFIGURACIÓN FIREBASE
function getDB() {
  if (getApps().length > 0) return getFirestore(getApp());
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
  initializeApp({ credential: cert(serviceAccount) });
  return getFirestore();
}

// 2. CONFIGURACIÓN GEMINI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// 3. PROMPTS MEJORADOS (AHORA CON HIGH YIELD)
const SYSTEM_PROMPT_WEEKLY = `
Actúa como un estratega senior de BlackRock. Genera un "Informe Táctico Semanal".
IMPORTANTE: Responde SOLO con JSON válido.

Estructura requerida:
{
  "executive_summary": "Análisis denso y profesional (aprox 150 palabras) sobre tipos, inflación y sentimiento.",
  "marketSentiment": "Bullish / Neutral / Bearish",
  "keyDrivers": [
    {"title": "Driver Principal", "impact": "Impacto detallado en mercados."}
  ],
  "thesis": { 
     "title": "La Oportunidad de la Semana",
     "content": "Detalle de una oportunidad táctica específica."
  }
}
`;

const SYSTEM_PROMPT_MONTHLY = `
Actúa como CIO Global. Genera la "Estrategia de Asignación de Activos".
IMPORTANTE: Responde SOLO con JSON válido.
Incluye obligatoriamente estas clases de activos: Renta Variable (EEUU, Europa, Emergentes), Renta Fija (Gobierno), y Crédito (Investment Grade y High Yield).

Estructura requerida:
{
  "executive_summary": "Análisis macroeconómico profundo (mínimo 150 palabras).",
  "marketSentiment": "Cautiously Optimistic / Neutral / Defensive",
  "model_portfolio": [
    { "asset_class": "Renta Variable", "region": "EE.UU.", "weight": 25, "view": "Sobreponderar", "conviction": 4, "rationale": "Fundamentales sólidos..." },
    { "asset_class": "Renta Variable", "region": "Europa", "weight": 15, "view": "Infraponderar", "conviction": 2, "rationale": "Riesgo de estancamiento..." },
    { "asset_class": "Renta Variable", "region": "Emergentes", "weight": 10, "view": "Neutral", "conviction": 3, "rationale": "Valoraciones atractivas pero riesgo FX..." },
    { "asset_class": "Renta Fija", "region": "Bonos Gobierno (10Y)", "weight": 25, "view": "Sobreponderar", "conviction": 5, "rationale": "Protección ante recesión..." },
    { "asset_class": "Crédito", "region": "Investment Grade", "weight": 15, "view": "Neutral", "conviction": 3, "rationale": "Balance riesgo/retorno equilibrado..." },
    { "asset_class": "Crédito", "region": "High Yield", "weight": 5, "view": "Infraponderar", "conviction": 2, "rationale": "Spreads demasiado ajustados para el riesgo de impago actual." },
    { "asset_class": "Alternativos", "region": "Oro/Commodities", "weight": 5, "view": "Sobreponderar", "conviction": 4, "rationale": "Cobertura geopolítica." }
  ],
  "keyDrivers": [
     {"title": "Inflación y Tipos", "impact": "Análisis de la FED/BCE."},
     {"title": "Geopolítica", "impact": "Impacto en energía."}
  ]
}
`;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type') || 'monthly';
    const dbTag = typeParam === 'monthly' ? 'MONTHLY_PORTFOLIO' : 'WEEKLY_MACRO';
    const systemInstruction = typeParam === 'monthly' ? SYSTEM_PROMPT_MONTHLY : SYSTEM_PROMPT_WEEKLY;
    
    // MODELO CONFIRMADO
    const modelName = "gemini-2.5-flash"; 

    console.log(`\n📢 --- GENERANDO INFORME (${typeParam}) ---`);

    const model = genAI.getGenerativeModel({ 
        model: modelName,
        systemInstruction: systemInstruction
    });

    const result = await model.generateContent(
        `Fecha del informe: ${new Date().toLocaleDateString()}. Escribe con tono profesional financiero. JSON puro.`
    );
    
    const responseText = result.response.text();

    // Limpieza JSON
    const firstBrace = responseText.indexOf('{');
    const lastBrace = responseText.lastIndexOf('}');
    if (firstBrace === -1) throw new Error("La IA no devolvió JSON.");
    
    const aiData = JSON.parse(responseText.substring(firstBrace, lastBrace + 1));

    // Guardar
    const db = getDB();
    await db.collection('analysis_results').add({
        ...aiData,
        type: dbTag,
        createdAt: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0]
    });

    console.log(`✅ GUARDADO EXITO: ${dbTag}`);

    return NextResponse.json({ success: true, mode: typeParam });

  } catch (error: any) {
    console.error("❌ ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) { return NextResponse.json({ ok: true }); }