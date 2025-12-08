// --- VERSION FINAL MEJORADA: GEMINI 2.5 FLASH + TEXTOS LARGOS ---
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

// 3. PROMPTS MEJORADOS (TEXTO EXTENSO Y PROFUNDO)
const SYSTEM_PROMPT_WEEKLY = `
Actúa como un estratega senior de BlackRock. Genera un "Informe Táctico Semanal" detallado.
IMPORTANTE: Responde SOLO con JSON válido.

Estructura requerida:
{
  "executive_summary": "Escribe 2 párrafos densos y analíticos sobre la situación macro actual. Menciona datos específicos (tipos, inflación). Usa lenguaje financiero sofisticado.",
  "marketSentiment": "Bullish / Neutral / Bearish (y una frase corta explicando por qué)",
  "keyDrivers": [
    {"title": "Nombre del Driver", "impact": "Explicación detallada de cómo esto afecta a los mercados esta semana."}
  ],
  "thesis": { 
     "title": "La Oportunidad de la Semana",
     "content": "Un párrafo detallado explicando una oportunidad específica de trading o inversión táctica."
  }
}
`;

const SYSTEM_PROMPT_MONTHLY = `
Actúa como el Chief Investment Officer (CIO) Global. Genera la "Estrategia de Asignación de Activos".
IMPORTANTE: Responde SOLO con JSON válido.
Queremos profundidad analítica, no frases cortas.

Estructura requerida:
{
  "executive_summary": "Escribe un análisis macroeconómico profundo (mínimo 150 palabras). Habla de la divergencia entre bancos centrales, riesgos geopolíticos y valoraciones. Sé crítico y profesional.",
  "marketSentiment": "Cautiously Optimistic / Neutral / Defensive",
  "model_portfolio": [
    { "asset_class": "Renta Variable", "region": "EE.UU.", "weight": 25, "view": "Sobreponderar", "conviction": 4, "rationale": "Explicación detallada de por qué sobreponderar EE.UU." },
    { "asset_class": "Renta Variable", "region": "Europa", "weight": 15, "view": "Infraponderar", "conviction": 2, "rationale": "Explicación detallada de los riesgos en Europa." },
    { "asset_class": "Renta Variable", "region": "Emergentes", "weight": 10, "view": "Neutral", "conviction": 3, "rationale": "Análisis de China y oportunidades en India/Latam." },
    { "asset_class": "Renta Fija", "region": "Bonos Gobierno (10Y)", "weight": 30, "view": "Sobreponderar", "conviction": 5, "rationale": "Análisis de la curva de tipos y protección ante recesión." },
    { "asset_class": "Crédito", "region": "Investment Grade", "weight": 15, "view": "Neutral", "conviction": 3, "rationale": "Spreads actuales vs riesgo de impago." },
    { "asset_class": "Alternativos", "region": "Oro/Commodities", "weight": 5, "view": "Sobreponderar", "conviction": 4, "rationale": "Cobertura contra riesgos geopolíticos e inflación pegajosa." }
  ],
  "keyDrivers": [
     {"title": "Inflación y Tipos", "impact": "Análisis detallado de la hoja de ruta de la FED y el BCE."},
     {"title": "Riesgo Geopolítico", "impact": "Impacto de conflictos actuales en precios de energía y cadenas de suministro."},
     {"title": "Crecimiento vs Recesión", "impact": "Evaluación de los datos de PIB y empleo recientes."}
  ]
}
`;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type') || 'monthly';
    const dbTag = typeParam === 'monthly' ? 'MONTHLY_PORTFOLIO' : 'WEEKLY_MACRO';
    const systemInstruction = typeParam === 'monthly' ? SYSTEM_PROMPT_MONTHLY : SYSTEM_PROMPT_WEEKLY;
    
    // USAMOS GEMINI 2.5 FLASH (Tu modelo confirmado)
    const modelName = "gemini-2.5-flash"; 

    console.log(`\n📢 --- GENERANDO INFORME DETALLADO (${typeParam}) ---`);

    const model = genAI.getGenerativeModel({ 
        model: modelName,
        systemInstruction: systemInstruction
    });

    const result = await model.generateContent(
        `Fecha del informe: ${new Date().toLocaleDateString()}. Escribe con tono profesional, denso y analítico. JSON puro.`
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