// --- VERSION FINAL V2.5: GEMINI FLASH 2.5 INTEGRATION ---
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// 1. CONFIGURACIÓN FIREBASE (Singleton)
function getDB() {
  if (getApps().length > 0) return getFirestore(getApp());
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
  initializeApp({ credential: cert(serviceAccount) });
  return getFirestore();
}

// 2. CONFIGURACIÓN GEMINI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// 3. PROMPTS DEL SISTEMA
const SYSTEM_PROMPT_WEEKLY = `
Eres el Chief Investment Officer (CIO). Genera un informe "Táctico Semanal".
IMPORTANTE: Responde SOLO con un JSON válido. Sin markdown, sin introducciones.
Estructura:
{
  "executive_summary": "Resumen macro...",
  "marketSentiment": "Bullish / Neutral / Bearish",
  "keyDrivers": [{"title": "...", "impact": "..."}],
  "thesis": { "content": "..." }
}
`;

const SYSTEM_PROMPT_MONTHLY = `
Eres el CIO. Genera la "Estrategia Mensual de Asignación de Activos".
IMPORTANTE: Responde SOLO con un JSON válido. Sin markdown.
Estructura:
{
  "executive_summary": "Visión mensual...",
  "marketSentiment": "Cautiously Optimistic / Neutral / Defensive",
  "model_portfolio": [
    { "asset_class": "Renta Variable", "region": "EE.UU.", "weight": 25, "view": "Sobreponderar", "conviction": 4 },
    { "asset_class": "Renta Fija", "region": "Bonos Gob.", "weight": 30, "view": "Neutral", "conviction": 3 }
  ],
  "keyDrivers": [{"title": "...", "impact": "..."}]
}
`;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type') || 'monthly';
    
    // Configuración de Etiquetas y Prompts
    const dbTag = typeParam === 'monthly' ? 'MONTHLY_PORTFOLIO' : 'WEEKLY_MACRO';
    const systemInstruction = typeParam === 'monthly' ? SYSTEM_PROMPT_MONTHLY : SYSTEM_PROMPT_WEEKLY;
    
    // --- MODELO CORRECTO: GEMINI 2.5 FLASH ---
    const modelName = "gemini-2.5-flash"; 

    console.log(`\n📢 --- INICIANDO GENERACIÓN (V2.5) ---`);
    console.log(`📢 MODELO: ${modelName}`);
    console.log(`📢 TIPO: ${typeParam}`);

    const model = genAI.getGenerativeModel({ 
        model: modelName,
        systemInstruction: systemInstruction
    });

    const result = await model.generateContent(
        `Genera el informe con fecha de corte: ${new Date().toLocaleDateString()}. JSON puro y estricto.`
    );
    
    const responseText = result.response.text();

    // Limpieza y Extracción de JSON (Cirugía de texto)
    const firstBrace = responseText.indexOf('{');
    const lastBrace = responseText.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1) {
        console.error("❌ RESPUESTA IA NO VÁLIDA:", responseText);
        throw new Error("La IA no devolvió un objeto JSON válido.");
    }

    const jsonString = responseText.substring(firstBrace, lastBrace + 1);
    const aiData = JSON.parse(jsonString);

    // Guardado en Firestore
    const db = getDB();
    await db.collection('analysis_results').add({
        ...aiData,
        type: dbTag, // Etiqueta crítica para que el dashboard lo encuentre
        createdAt: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0]
    });

    console.log(`✅ INFORME GUARDADO: ${dbTag}`);

    return NextResponse.json({
      success: true,
      mode: typeParam,
      message: "Informe generado correctamente."
    });

  } catch (error: any) {
    console.error("❌ ERROR CRÍTICO:", error);
    return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: "Revisa los logs de Vercel para ver si se usó el modelo 2.5."
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
    return NextResponse.json({ message: "POST endpoint activo." });
}