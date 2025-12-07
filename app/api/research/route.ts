import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// --- 1. CONFIGURACIÓN FIREBASE ---
function getDB() {
  if (getApps().length > 0) return getFirestore(getApp());
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
  initializeApp({ credential: cert(serviceAccount) });
  return getFirestore();
}

// --- 2. CONFIGURACIÓN GEMINI ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// --- 3. PROMPTS ---
const SYSTEM_PROMPT_WEEKLY = `Genera un JSON válido para reporte semanal. {"executive_summary": "...", "marketSentiment": "...", "keyDrivers": [], "thesis": {}}`;
const SYSTEM_PROMPT_MONTHLY = `Genera un JSON válido para reporte mensual. {"executive_summary": "...", "marketSentiment": "...", "model_portfolio": [], "keyDrivers": []}`;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type') || 'monthly';
    const dbTag = typeParam === 'monthly' ? 'MONTHLY_PORTFOLIO' : 'WEEKLY_MACRO';
    const systemInstruction = typeParam === 'monthly' ? SYSTEM_PROMPT_MONTHLY : SYSTEM_PROMPT_WEEKLY;
    
    // --- CAMBIO CLAVE: MODELO ESTÁNDAR ---
    // Usamos 'gemini-1.5-flash-latest' que nunca falla por versión.
    const modelName = "gemini-1.5-flash-latest"; 

    // --- LOG DE DEPURACIÓN (Busca esto en Vercel) ---
    console.log(`\n\n📢 --- INICIO DE EJECUCIÓN NUEVA ---`);
    console.log(`📢 INTENTANDO USAR MODELO: ${modelName}`);
    console.log(`📢 TIPO: ${typeParam}\n\n`);

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

    // Guardar en DB
    const db = getDB();
    await db.collection('analysis_results').add({
        ...aiData,
        type: dbTag, 
        createdAt: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0]
    });

    console.log("✅ ÉXITO: Informe guardado.");

    return NextResponse.json({ success: true, mode: typeParam, message: "OK" });

  } catch (error: any) {
    console.error("❌ ERROR FATAL:", error);
    return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: "Revisa los logs de Vercel para ver el mensaje con 📢"
    }, { status: 500 });
  }
}

export async function POST(request: Request) { return NextResponse.json({ ok: true }); }