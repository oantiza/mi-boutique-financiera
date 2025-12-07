import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai'; 
import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// --- 1. CONFIGURACIÓN IA ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// --- FUNCIÓN HELPER DE CONEXIÓN (PATRÓN SINGLETON ROBUSTO) ---
function getDB() {
  if (getApps().length > 0) {
    return getFirestore(getApp());
  }

  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  // CRÍTICO: Comprueba si existe la única variable necesaria
  if (!serviceAccountString) {
    throw new Error("Faltan credenciales de Firebase. La variable FIREBASE_SERVICE_ACCOUNT_JSON está vacía.");
  }

  // Parseamos todo el objeto JSON de credenciales de una vez
  const serviceAccount = JSON.parse(serviceAccountString);

  initializeApp({
    credential: cert(serviceAccount)
  });

  return getFirestore();
}

// --- 2. DEFINICIÓN DE PROMPTS Y ROLES ---
// (Contenido de ROLE_CIO, WEEKLY_TASK, MONTHLY_TASK omitido por brevedad, asumiendo que el usuario lo conserva)

const ROLE_CIO = `
Actúa como el Chief Investment Officer (CIO) y Estratega Macro Global de un banco de inversión Tier-1.
Tu tono es institucional, sofisticado y directo.
`;

const WEEKLY_TASK = `
Realiza un "Deep Research" de los eventos macroeconómicos y geopolíticos de los últimos 7 días.
1. Analiza inflación, PIB y bancos centrales (FED, BCE).
2. Detecta riesgos de cola (Geopolítica, Energía).
3. Genera una visión de mercado (Bullish/Bearish/Neutral) justificada.
Salida esperada: JSON con resumen ejecutivo y principales drivers.
`;

const MONTHLY_TASK = `
Genera el "Informe Estratégico de Asignación de Activos".
1. Define la tesis de inversión para el próximo mes.
2. Crea una MATRIZ DE ASIGNACIÓN TÁCTICA detallada.
   - Debe incluir: Clase de Activo, Región, Visión (Sobreponderar/Neutral/Infraponderar), Convicción (1-5) y Rationale.
Salida esperada: JSON estructurado con la matriz y la tesis central.
`;

// --- 3. HANDLER GET (CRON JOBS & INVESTIGACIÓN) ---

export async function GET(request: Request) {
  try {
    const db = getDB(); // Conexión garantizada o lanza error
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'weekly'; 

    console.log(`🚀 Iniciando Deep Research (${type.toUpperCase()}) con Gemini 2.5 Flash...`);

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash", 
      tools: [
        { googleSearch: {} } as any 
      ] 
    });

    const prompt = `
      ${ROLE_CIO}
      CONTEXTO TEMPORAL: Hoy es ${new Date().toLocaleDateString()}.
      TAREA (${type === 'monthly' ? 'MENSUAL' : 'SEMANAL'}):
      ${type === 'monthly' ? MONTHLY_TASK : WEEKLY_TASK}
      
      FORMATO JSON OBLIGATORIO:
      {
        "reportType": "${type}",
        "date": "YYYY-MM-DD",
        "executive_summary": "Texto del resumen...",
        "marketSentiment": "Bullish/Bearish/Neutral",
        "keyDrivers": [ { "title": "...", "impact": "..." } ],
        "model_portfolio": [
           { "asset_class": "Renta Variable", "region": "EE.UU.", "weight": 25, "view": "Sobreponderar", "conviction": 5, "rationale": "..." }
        ],
        "thesis": { "content": "Tesis central..." },
        "rates": { "key_metric": "...", "content": "..." },
        "flows_positioning": { "key_metric": "...", "content": "..." }
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const reportData = JSON.parse(text);

    const collectionName = 'analysis_results';
    const dbTag = type === 'monthly' ? 'MONTHLY_PORTFOLIO' : 'WEEKLY_MACRO';

    await db.collection(collectionName).add({
      ...reportData,
      type: dbTag,
      createdAt: new Date().toISOString(),
      status: 'completed',
      model: "gemini-2.5-flash"
    });

    return NextResponse.json({ success: true, mode: type, message: "Informe generado correctamente." });

  } catch (error: any) {
    console.error("❌ Error en Deep Research:", error);
    // Lanzamos el error original si no es de Firebase
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// --- 4. HANDLER POST (INGESTA DE EMAILS) ---
// (El cuerpo de la función POST también debe usar const db = getDB();)

export async function POST(request: Request) {
  try {
    const db = getDB(); // Llama a la conexión garantizada

    const body = await request.json();
    
    if (!body || !body.texto) {
        return NextResponse.json({ success: false, message: "Payload vacío" }, { status: 400 });
    }

    await db.collection('raw_email_inputs').add({
      subject: body.asunto,
      content: body.texto,
      date: body.fecha,
      source: 'gmail_ingestion',
      processed: false,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true, message: "Correo archivado correctamente." });

  } catch (error: any) {
    console.error("❌ Error recibiendo email:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}