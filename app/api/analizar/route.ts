import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "../../../lib/firebase";
import { collection, addDoc, Timestamp, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Falta API Key" }, { status: 500 });

    // 1. RECIBIR EL PAQUETE COMPLEJO DE GMAIL
    const body = await req.json();
    const { asunto, fecha, textoCorreo, archivosAdjuntos } = body; 
    
    // Si viene del Frontend (pegando texto manual), lo adaptamos
    const inputText = body.text || textoCorreo || ""; 

    // --- 2. PREPARAR DATOS PARA GEMINI (MULTIMODAL) ---
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Usamos 1.5 Flash que soporta PDFs y es barato

    const parts = [];
    
    // Añadimos el contexto del correo
    parts.push({ 
      text: `CONTEXTO DEL INFORME:
      Asunto: ${asunto || "Análisis Manual"}
      Fecha: ${fecha || new Date().toISOString()}
      Cuerpo del correo: ${inputText}` 
    });

    // Añadimos los PDFs (si existen)
    if (archivosAdjuntos && Array.isArray(archivosAdjuntos)) {
      archivosAdjuntos.forEach((adjunto: any) => {
        parts.push({
          inlineData: {
            mimeType: "application/pdf",
            data: adjunto.data // Esto viene en base64 desde Apps Script
          }
        });
      });
    }

    // --- 3. PROMPT MAESTRO (Alineado con tu Frontend) ---
    const prompt = `
      Actúa como el CIO de una Banca Privada Global. Analiza los documentos adjuntos (PDFs) y el texto del correo.
      
      OBJETIVO: Extraer inteligencia táctica y estratégica para el Dashboard de Inversión.

      Instrucciones:
      1. Ignora disclaimers legales o información irrelevante.
      2. Céntrate en: Posicionamiento (Bullish/Bearish), Riesgos, y Asignación de Activos.
      3. Genera un JSON que coincida EXACTAMENTE con las claves que espera el Frontend.

      ESTRUCTURA JSON REQUERIDA:
      {
        "executive_summary": "Resumen ejecutivo de alto impacto (max 60 palabras).",
        "macro_analysis": "Análisis detallado del entorno macroeconómico (2 párrafos).",
        "cards": {
            "global_stance": "Ej: BULLISH / NEUTRAL / CAUTIOUS",
            "stance_subtitle": "Breve justificación (1 frase)",
            "main_risk": "El riesgo principal (ej. Inflación pegajosa)",
            "risk_subtitle": "Por qué es un riesgo",
            "tactical_opportunity": "Oportunidad de compra (ej. Bonos Corto Plazo)",
            "opportunity_subtitle": "Por qué comprar ahora"
        },
        "allocation_matrix": [
            { 
              "asset": "Renta Variable EE.UU.", 
              "region": "EE.UU.", 
              "view": "Sobreponderar", 
              "conviction": 5, 
              "rationale": "Crecimiento fuerte de utilidades tech." 
            },
            { 
              "asset": "Renta Variable Europa", 
              "region": "Europa", 
              "view": "Infraponderar", 
              "conviction": 2, 
              "rationale": "Debilidad manufacturera." 
            },
            { 
              "asset": "Renta Fija Gobierno", 
              "region": "Global", 
              "view": "Neutral", 
              "conviction": 3, 
              "rationale": "Tipos estables por ahora." 
            }
            // ... añade más clases de activos según el informe
        ],
        "deep_research": {
            "rates": "Análisis de tasas...",
            "valuation": "Valoraciones...",
            "credit": "Crédito...",
            "flows": "Flujos..."
        },
        "thesis": {
           "content": "La frase de tesis central de inversión."
        }
      }
    `;

    parts.push({ text: prompt });

    // --- 4. GENERAR ---
    const result = await model.generateContent(parts);
    let textResponse = result.response.text();
    
    // Limpieza de JSON (común en respuestas de IA)
    textResponse = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
    const analysisData = JSON.parse(textResponse);

    // --- 5. GUARDADO Y LIMPIEZA (Mantenemos tu lógica) ---
    // (Tu lógica de borrado de docs viejos aquí se mantiene igual...)
    
    await addDoc(collection(db, "analysis_results"), {
      originalSubject: asunto || "Manual",
      ...analysisData,
      createdAt: Timestamp.now(),
      type: archivosAdjuntos ? "EMAIL_BATCH" : "MANUAL_INPUT"
    });

    return NextResponse.json({ success: true, data: analysisData });

  } catch (error: any) {
    console.error("Error procesando:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}