import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// --- 1. CONFIGURACIÓN DE FIREBASE (SERVER-SIDE) ---
function getDB() {
  if (getApps().length > 0) {
    return getFirestore(getApp());
  }
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
  initializeApp({ credential: cert(serviceAccount) });
  return getFirestore();
}

// --- 2. CONFIGURACIÓN DE GEMINI ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// --- 3. PROMPTS DEL SISTEMA ---
const SYSTEM_PROMPT_WEEKLY = `
Eres el Chief Investment Officer (CIO). Tu tarea es generar un informe "Táctico Semanal".
IMPORTANTE: Tu respuesta debe ser UNICAMENTE un objeto JSON válido.
NO escribas introducciones como "Aquí está el informe".
NO uses bloques de código markdown (\`\`\`json).
Empieza directamente con { y termina con }.

Estructura requerida:
{
  "executive_summary": "Resumen del entorno macro...",
  "marketSentiment": "Bullish / Neutral / Bearish",
  "keyDrivers": [
    {"title": "Driver 1", "impact": "Impacto..."}
  ],
  "thesis": { "content": "Tesis de inversión..." }
}
`;

const SYSTEM_PROMPT_MONTHLY = `
Eres el CIO. Genera la "Estrategia Mensual de Asignación de Activos".
IMPORTANTE: Tu respuesta debe ser UNICAMENTE un objeto JSON válido.
NO escribas introducciones. NO uses markdown.
Empieza directamente con { y termina con }.

Estructura requerida:
{
  "executive_summary": "Visión mensual...",
  "marketSentiment": "Cautiously Optimistic / Neutral / Defensive",
  "model_portfolio": [
    { "asset_class": "Renta Variable", "region": "EE.UU.", "weight": 25, "view": "Sobreponderar", "conviction": 4 },
    { "asset_class": "Renta Fija", "region": "Bonos Gob.", "weight": 30, "view": "Neutral", "conviction": 3 }
  ],
  "keyDrivers": [
     {"title": "Inflación", "impact": "Análisis..."}
  ]
}
`;

// --- 4. MANEJADOR GET ---
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type') || 'monthly';

    const dbTag = typeParam === 'monthly' ? 'MONTHLY_PORTFOLIO' : 'WEEKLY_MACRO';
    const systemInstruction = typeParam === 'monthly' ? SYSTEM_PROMPT_MONTHLY : SYSTEM_PROMPT_WEEKLY;
    
    // --- ACTUALIZACIÓN: GEMINI 2.5 FLASH ---
    // Si tu proveedor requiere una versión específica como "gemini-2.5-flash-001", cámbialo aquí.
    const modelName = "gemini-2.5-flash"; 

    console.log(`🚀 Iniciando Deep Research (${typeParam.toUpperCase()}) con ${modelName}...`);

    const model = genAI.getGenerativeModel({ 
        model: modelName,
        systemInstruction: systemInstruction
    });

    const result = await model.generateContent(
        `Genera el informe con fecha de corte: ${new Date().toLocaleDateString()}. Sé analítico y profesional.`
    );
    
    const responseText = result.response.text();

    // --- 5. EXTRACCIÓN ROBUSTA DE JSON ---
    // Buscamos las llaves para limpiar texto extra
    const firstBrace = responseText.indexOf('{');
    const lastBrace = responseText.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1) {
        throw new Error("La IA no devolvió un JSON válido (faltan llaves {}).");
    }

    const jsonString = responseText.substring(firstBrace, lastBrace + 1);
    
    let aiData;
    try {
        aiData = JSON.parse(jsonString);
    } catch (e) {
        console.error("❌ Fallo al parsear JSON extraído:", jsonString);
        throw new Error("Sintaxis JSON inválida recibida de la IA.");
    }

    // --- 6. GUARDAR EN FIRESTORE ---
    const db = getDB();
    await db.collection('analysis_results').add({
        ...aiData,
        type: dbTag, // Etiqueta corregida
        createdAt: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0]
    });

    console.log(`✅ Informe ${typeParam} guardado con éxito.`);

    return NextResponse.json({
      success: true,
      mode: typeParam,
      message: "Informe generado correctamente."
    });

  } catch (error: any) {
    console.error("❌ Error en Deep Research:", error);
    return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: `Fallo intentando usar el modelo '${"gemini-2.5-flash"}'. Verifica el nombre exacto en Google AI Studio.`
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
    return NextResponse.json({ message: "Endpoint POST listo." });
}