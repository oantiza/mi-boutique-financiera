import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "../../../lib/firebase";
import { collection, addDoc, Timestamp, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { NextResponse } from "next/server";

// --- TU PROMPT MAESTRO (CIO TIER-1) ---
const PROMPT_CIO = `
# ROL
Actúa como el Estratega Jefe de Inversiones (CIO) Global de una gestora de activos Tier-1 (ej. BlackRock, JP Morgan AM). Tu objetivo es preparar el "Informe Trimestral de Estrategia y Asignación de Activos" para el comité de dirección.

# CONTEXTO
Soy un gestor de carteras profesional. No necesito definiciones financieras ni explicaciones genéricas. Necesito datos actualizados, análisis de tendencias y, sobre todo, una postura clara (bullish/bearish/neutral) fundamentada en datos recientes.

# TAREA DE INVESTIGACIÓN (DEEP RESEARCH)
Utiliza la información de los documentos adjuntos (PDFs) y TU CONOCIMIENTO ACTUALIZADO para investigar:
1. **Macroeconomía:** Inflación (CPI/PCE), PIB y empleo (EE.UU., Eurozona, China). ¿Soft, Hard o No Landing?
2. **Política Monetaria:** Posicionamiento FED, BCE, BOJ.
3. **Geopolítica:** Impactos en suministro o energía.
4. **Valoraciones:** Ratios actuales vs históricos.

# FORMATO DE SALIDA (ESTRICTAMENTE JSON)
No devuelvas texto plano. Tu respuesta debe ser un objeto JSON válido con esta estructura exacta para alimentar el Dashboard web:

{
  "executive_summary": "Sintesis de 200 palabras (The Bottom Line).",
  "macro_analysis": "Análisis detallado de Crecimiento, Inflación y Tipos (Punto 2 del formato).",
  "cards": {
      "global_stance": "BULLISH / NEUTRAL / BEARISH",
      "main_risk": "El riesgo principal detectado",
      "tactical_opportunity": "La mejor oportunidad táctica"
  },
  "allocation_matrix": [
      // Genera una entrada por cada fila de tu tabla de asignación táctica:
      { 
        "asset": "Renta Variable", 
        "region": "EE.UU. (Large Cap)", 
        "view": "Sobreponderar (o Neutral/Infraponderar)", 
        "conviction": 5, 
        "rationale": "Justificación basada en datos..." 
      },
      { "asset": "Renta Variable", "region": "Europa", "view": "...", "conviction": 3, "rationale": "..." },
      { "asset": "Renta Variable", "region": "Emergentes", "view": "...", "conviction": 0, "rationale": "..." },
      { "asset": "Renta Fija", "region": "Gobierno (Duración Corta)", "view": "...", "conviction": 0, "rationale": "..." },
      { "asset": "Renta Fija", "region": "Gobierno (Duración Larga)", "view": "...", "conviction": 0, "rationale": "..." },
      { "asset": "Crédito", "region": "Investment Grade", "view": "...", "conviction": 0, "rationale": "..." },
      { "asset": "Crédito", "region": "High Yield", "view": "...", "conviction": 0, "rationale": "..." },
      { "asset": "Alternativos", "region": "Commodities/Oro", "view": "...", "conviction": 0, "rationale": "..." },
      { "asset": "Efectivo", "region": "Global", "view": "...", "conviction": 0, "rationale": "..." }
  ],
  "deep_research": {
      "rates": "Análisis profundo de tasas...",
      "valuation": "Análisis de valoraciones...",
      "credit": "Análisis de crédito...",
      "flows": "Análisis de flujos y geopolítica..."
  },
  "thesis": { "content": "La frase de tesis central de inversión." }
}
`;

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Falta API Key" }, { status: 500 });

    const body = await req.json();
    const { asunto, fecha, textoCorreo, archivosAdjuntos } = body; 
    const inputText = body.text || textoCorreo || ""; 

    // Configuración de Gemini con Herramientas de Búsqueda (Google Search)
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Usamos el modelo Pro porque entiende mejor instrucciones complejas de CIO
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      // Activa esto si quieres que busque en internet datos que no estén en el PDF
      // tools: [{ googleSearchRetrieval: {} }] 
    });

    const parts = [];
    
    // 1. Contexto del Correo
    parts.push({ 
      text: `DOCUMENTOS DE ENTRADA:\nAsunto: ${asunto}\nFecha: ${fecha}\nCuerpo: ${inputText}` 
    });

    // 2. Adjuntos (PDFs)
    if (archivosAdjuntos && Array.isArray(archivosAdjuntos)) {
      archivosAdjuntos.forEach((adjunto: any) => {
        parts.push({
          inlineData: {
            mimeType: "application/pdf",
            data: adjunto.data 
          }
        });
      });
    }

    // 3. El Prompt Maestro del CIO
    parts.push({ text: PROMPT_CIO });

    const result = await model.generateContent(parts);
    let textResponse = result.response.text();
    
    // Limpieza de JSON
    textResponse = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
    const analysisData = JSON.parse(textResponse);

    // Guardado en Firebase
    await addDoc(collection(db, "analysis_results"), {
      originalSubject: asunto || "Manual CIO Request",
      ...analysisData,
      createdAt: Timestamp.now(),
      type: "DEEP_RESEARCH_CIO"
    });

    return NextResponse.json({ success: true, data: analysisData });

  } catch (error: any) {
    console.error("Error procesando CIO:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}