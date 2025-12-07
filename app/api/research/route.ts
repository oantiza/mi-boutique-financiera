// --- VERSION FINAL: GEMINI 2.5 FLASH (VERIFICADO) ---
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

// 3. PROMPTS
const SYSTEM_PROMPT_WEEKLY = `
Eres el CIO. Genera reporte "Táctico Semanal". SOLO JSON válido.
Estructura: {"executive_summary": "...", "marketSentiment": "...", "keyDrivers": [], "thesis": {}}
`;

const SYSTEM_PROMPT_MONTHLY = `
Eres el CIO. Genera "Estrategia Mensual". SOLO JSON válido.
Estructura: {"executive_summary": "...", "marketSentiment": "...", "model_portfolio": [], "keyDrivers": []}
`;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type') || 'monthly';
    const dbTag = typeParam === 'monthly' ? 'MONTHLY_PORTFOLIO' : 'WEEKLY_MACRO';
    const systemInstruction = typeParam === 'monthly' ? SYSTEM_PROMPT_MONTHLY : SYSTEM_PROMPT_WEEKLY;
    
    // --- NOMBRE EXACTO CONFIRMADO POR TU LISTA ---
    const modelName = "gemini-2.5-flash"; 

    console.log(`\n📢 --- INICIO DEEP RESEARCH (VERIFICADO) ---`);
    console.log(`📢 MODELO SOLICITADO: ${modelName}`);

    const model = genAI.getGenerativeModel({ 
        model: modelName,
        systemInstruction: systemInstruction
    });

    const result = await model.generateContent(
        `Genera el informe con fecha: ${new Date().toLocaleDateString()}. JSON puro.`
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