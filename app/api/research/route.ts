import { NextResponse } from 'next/server';
// Usamos los imports específicos para evitar conflictos de tipos
import { GoogleGenerativeAI } from '@google/generative-ai'; 
import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// --- 1. FUNCIÓN HELPER DE CONEXIÓN (PATRÓN SINGLETON) ---
// Esta función es la CLAVE. Solo conecta cuando se le llama, nunca antes.
function getDB() {
  // 1. Si ya estamos conectados, devolvemos la instancia existente
  if (getApps().length > 0) {
    return getFirestore(getApp());
  }

  // 2. Si no, preparamos las credenciales
  // (Esto evita errores si las variables no existen durante el build)
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Corrección crítica para saltos de línea en Vercel
  const privateKey = process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
    : undefined;

  // 3. Verificamos que tenemos todo lo necesario
  if (!projectId || !clientEmail || !privateKey) {
    // En tiempo de build, esto puede faltar, así que lanzamos error controlado
    // para que no rompa la compilación estática si no se usa.
    throw new Error("Faltan credenciales de Firebase (PROJECT_ID, CLIENT_EMAIL o PRIVATE_KEY).");
  }

  // 4. Inicializamos
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  return getFirestore();
}

// --- 2. CONFIGURACIÓN IA ---
// Inicializamos esto fuera, pero es seguro porque no requiere red inmediata
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// --- 3. DEFINICIÓN DE PROMPTS ---
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

// --- 4. HANDLER GET (CRON JOBS & INVESTIGACIÓN) ---

export async function GET(request: Request) {
  try {
    // ¡IMPORTANTE! Inicializamos la DB AQUÍ DENTRO, no fuera.
    const db = getDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'weekly'; 

    console.log(`🚀 Iniciando Deep Research (${type.toUpperCase()})...`);

    // Usamos Gemini 2.5 Flash
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash", 
      tools: [
        // Bypass de tipos para googleSearch
        { googleSearch: {} } as any 
      ] 
    });

    const prompt = `
      ${ROLE_CIO}
      CONTEXTO TEMPORAL: Hoy es ${new Date().toLocaleDateString()}.
      TAREA (${type === 'monthly' ? 'MENSUAL' : 'SEMANAL'}):
      ${type === 'monthly' ? MONTHLY_TASK : WEEKLY_TASK}
      
      FORMATO JSON OBLIGATORIO:
      Devuelve SOLO un objeto JSON válido con esta estructura:
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// --- 5. HANDLER POST (INGESTA DE EMAILS) ---

export async function POST(request: Request) {
  try {
    // Inicializamos la DB AQUÍ DENTRO también
    const db = getDB();

    const body = await request.json();
    
    if (!body || !body.texto) {
        return NextResponse.json({ success: false, message: "Payload vacío" }, { status: 400 });
    }

    console.log(`📧 Nuevo correo recibido: ${body.asunto}`);

    await db.collection('raw_email_inputs').add({
      subject: body.asunto,
      content: body.texto,
      date: body.fecha,
      source: 'gmail_ingestion',
      processed: false,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true, 
      message: "Correo archivado correctamente." 
    });

  } catch (error: any) {
    console.error("❌ Error recibiendo email:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}