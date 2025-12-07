import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// --- 1. CONFIGURACIÓN DE FIREBASE (SERVER-SIDE) ---
function getDB() {
  if (getApps().length > 0) {
    return getFirestore(getApp());
  }

  // Parseamos la clave JSON del entorno
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');

  initializeApp({
    credential: cert(serviceAccount)
  });

  return getFirestore();
}

// --- 2. CONFIGURACIÓN DE GEMINI ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// --- 3. PROMPTS DEL SISTEMA (CIO) ---
const SYSTEM_PROMPT_WEEKLY = `
Actúa como el Chief Investment Officer (CIO) de una firma de gestión de activos global.
Tu tarea es generar un informe "Táctico Semanal" en formato JSON estricto.
Analiza el entorno macroeconómico actual, riesgos geopolíticos y flujos de mercado.

IMPORTANTE: Devuelve SOLO JSON válido. No uses bloques de código markdown.
La estructura del JSON debe ser esta:
{
  "executive_summary": "Texto resumen profesional...",
  "marketSentiment": "Bullish / Neutral / Bearish",
  "keyDrivers": [
    {"title": "Nombre del driver", "impact": "Explicación breve"}
  ],
  "thesis": { "content": "Tesis de inversión para la semana..." }
}
`;

const SYSTEM_PROMPT_MONTHLY = `
Actúa como el Chief Investment Officer (CIO). Genera la "Estrategia Mensual de Asignación de Activos".
Debes definir una cartera modelo y la visión estratégica.

IMPORTANTE: Devuelve SOLO JSON válido.
La estructura del JSON debe ser esta:
{
  "executive_summary": "Visión macroeconómica del mes...",
  "marketSentiment": "Cautiously Optimistic / Neutral / Defensive",
  "model_portfolio": [
    { "asset_class": "Renta Variable", "region": "EE.UU.", "weight": 25, "view": "Sobreponderar", "conviction": 4 },
    { "asset_class": "Renta Variable", "region": "Europa", "weight": 15, "view": "Neutral", "conviction": 3 },
    { "asset_class": "Renta Fija", "region": "Bonos Gobierno 10Y", "weight": 30, "view": "Infraponderar", "conviction": 2 },
    { "asset_class": "Efectivo", "region": "Global", "weight": 10, "view": "Neutral", "conviction": 5 }
    // ... añade más clases hasta sumar 100% o cerca
  ],
  "keyDrivers": [
     {"title": "Inflación", "impact": "Análisis..."},
     {"title": "Tipos de Interés", "impact": "Análisis..."}
  ]
}
`;

// --- 4. MANEJADOR DE LA PETICIÓN (GET) ---
export async function GET(request: Request) {
  try {
    // 1. Leer parámetros (weekly o monthly)
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type') || 'monthly';

    // 2. DEFINIR LA ETIQUETA CORRECTA PARA LA BASE DE DATOS
    // Esto soluciona el error de "Sin Informes Disponibles"
    const dbTag = typeParam === 'monthly' ? 'MONTHLY_PORTFOLIO' : 'WEEKLY_MACRO';
    
    // 3. Seleccionar el Prompt adecuado
    const systemInstruction = typeParam === 'monthly' ? SYSTEM_PROMPT_MONTHLY : SYSTEM_PROMPT_WEEKLY;
    const modelName = "gemini-1.5-flash"; // Modelo estable y rápido

    console.log(`🚀 Iniciando generación (${typeParam})...`);

    // 4. Llamar a Gemini
    const model = genAI.getGenerativeModel({ 
        model: modelName,
        systemInstruction: systemInstruction
    });

    const result = await model.generateContent(
        `Genera el informe de inversión para la fecha actual: ${new Date().toLocaleDateString()}. Usa datos realistas y coherentes.`
    );
    
    const responseText = result.response.text();

    // 5. Limpiar y Parsear el JSON
    // A veces la IA devuelve ```json ... ```, esto lo limpia
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    let aiData;
    
    try {
        aiData = JSON.parse(cleanedText);
    } catch (e) {
        console.error("Error parseando JSON de IA:", responseText);
        return NextResponse.json({ success: false, error: "La IA devolvió un formato inválido." }, { status: 500 });
    }

    // 6. GUARDAR EN FIRESTORE (Con la etiqueta corregida)
    const db = getDB();
    await db.collection('analysis_results').add({
        ...aiData,
        type: dbTag, // <--- AQUÍ ESTÁ LA SOLUCIÓN: Forzamos el nombre correcto
        createdAt: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0] // Formato YYYY-MM-DD
    });

    console.log("✅ Informe guardado correctamente en Firebase.");

    return NextResponse.json({
      success: true,
      mode: typeParam,
      message: "Informe generado y guardado correctamente."
    });

  } catch (error: any) {
    console.error("❌ Error en el servidor:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// --- 5. MANEJADOR DE POST (Para Emails - Opcional, mantenemos estructura) ---
export async function POST(request: Request) {
    return NextResponse.json({ message: "Endpoint de ingesta de emails listo." });
}